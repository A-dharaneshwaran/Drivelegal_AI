const cron = require('node-cron');
const Fine = require('../models/Fine');
const Notification = require('../models/Notification');
const emailService = require('./emailService');

/**
 * Evaluates pending and overdue challans, sending mock notifications and saving states in MongoDB.
 */
const checkAndSendReminders = async () => {
  try {
    console.log("Background Reminder Scheduler: Scanning challan ledger...");
    const now = new Date();
    
    // Fetch active uncollected tickets (Pending or Overdue) and populate user references
    const activeFines = await Fine.find({
      status: { $in: ['Pending', 'Overdue'] },
      reminderStatus: 'Enabled'
    }).populate('userId');

    let alertsTriggered = 0;

    for (const fine of activeFines) {
      const dueDate = new Date(fine.dueDate);
      
      // Calculate date difference in days (rounded up to capture starting offsets)
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let reminderType = "";
      let reminderMessage = "";

      if (diffDays === 7) {
        reminderType = "7_DAYS_BEFORE";
        reminderMessage = `Your fine of ₹${fine.amount} for vehicle ${fine.vehicleNumber} is due in 7 days.`;
      } else if (diffDays === 3) {
        reminderType = "3_DAYS_BEFORE";
        reminderMessage = `Your fine of ₹${fine.amount} for vehicle ${fine.vehicleNumber} is due in 3 days.`;
      } else if (diffDays === 1) {
        reminderType = "1_DAY_BEFORE";
        reminderMessage = `Your fine of ₹${fine.amount} for vehicle ${fine.vehicleNumber} is due in 1 day.`;
      } else if (diffDays === 0) {
        reminderType = "DUE_DATE";
        reminderMessage = `Your fine of ₹${fine.amount} for vehicle ${fine.vehicleNumber} is due TODAY!`;
      } else if (diffDays < 0) {
        reminderType = "OVERDUE";
        reminderMessage = `Your fine of ₹${fine.amount} for vehicle ${fine.vehicleNumber} is OVERDUE by ${Math.abs(diffDays)} day(s).`;
      }

      if (reminderType) {
        // Double-check reminderHistory to ensure we don't send the same reminder level repeatedly
        const alreadySent = fine.reminderHistory.some(historyItem => historyItem.type === reminderType);
        
        if (!alreadySent && fine.userId) {
          const user = fine.userId;
          
          // Match database trigger type with user's settings preferences array
          const prefMapping = {
            '7_DAYS_BEFORE': '7_days',
            '3_DAYS_BEFORE': '3_days',
            '1_DAY_BEFORE': '1_day',
            'DUE_DATE': 'due_date',
            'OVERDUE': 'overdue'
          };
          const prefKey = prefMapping[reminderType];
          
          const isPreferenceEnabled = user.notificationSettings?.enabled !== false &&
                                      (!user.notificationSettings || 
                                       !user.notificationSettings.reminderPreferences || 
                                       user.notificationSettings.reminderPreferences.includes(prefKey));
          
          if (isPreferenceEnabled) {
            console.log(`[ALERT TRIGGERED] Fine ID: ${fine._id} | User: ${user.email} | Type: ${reminderType} | Message: ${reminderMessage}`);
            
            const showDashboard = user.notificationSettings?.enabled !== false &&
                                  (!user.notificationSettings || user.notificationSettings.dashboardAlerts !== false);
            const sendEmailFlag = user.notificationSettings?.enabled !== false &&
                                  (!user.notificationSettings || user.notificationSettings.emailReminders !== false);
            
            // 1. Create In-App Notification document
            if (showDashboard) {
              let title = "Traffic Challan Due Soon";
              let priority = "medium";
              let notifType = "fine_due";
              
              if (reminderType === "1_DAY_BEFORE") {
                title = "Traffic Challan Due Tomorrow";
                priority = "high";
              } else if (reminderType === "DUE_DATE") {
                title = "Traffic Challan Due TODAY!";
                priority = "high";
              } else if (reminderType === "OVERDUE") {
                title = "Traffic Challan OVERDUE!";
                priority = "critical";
                notifType = "fine_overdue";
              }
              
              const notification = new Notification({
                userId: user._id,
                title,
                message: reminderMessage,
                type: notifType,
                priority,
                relatedFineId: fine._id
              });
              await notification.save();
            }
            
            // 2. Dispatch SMTP templates
            if (sendEmailFlag) {
              try {
                if (reminderType === "7_DAYS_BEFORE" || reminderType === "3_DAYS_BEFORE") {
                  await emailService.sendFineDueEmail(user, fine, diffDays);
                } else if (reminderType === "1_DAY_BEFORE" || reminderType === "DUE_DATE") {
                  await emailService.sendFineDueTomorrowEmail(user, fine);
                } else if (reminderType === "OVERDUE") {
                  await emailService.sendFineOverdueEmail(user, fine, Math.abs(diffDays));
                }
              } catch (mailError) {
                console.error("[MAIL SCHEDULER ERROR] Failed to send email alert:", mailError.message);
              }
            }
            
            // Log into history and update MongoDB Fine document
            fine.reminderHistory.push({
              sentAt: new Date(),
              type: reminderType,
              message: reminderMessage
            });
  
            fine.lastReminderSent = new Date();
            fine.notificationStatus = 'Sent';
            
            // Auto-calculate next alert date trigger target
            if (reminderType === "7_DAYS_BEFORE") {
              const d = new Date(dueDate);
              d.setDate(d.getDate() - 3);
              fine.nextReminderDate = d;
            } else if (reminderType === "3_DAYS_BEFORE") {
              const d = new Date(dueDate);
              d.setDate(d.getDate() - 1);
              fine.nextReminderDate = d;
            } else if (reminderType === "1_DAY_BEFORE") {
              fine.nextReminderDate = dueDate;
            } else {
              fine.nextReminderDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Check again next week if overdue
            }
  
            // If due date has passed, make sure model reflects Overdue
            if (diffDays < 0) {
              fine.status = 'Overdue';
            }
  
            await fine.save();
            alertsTriggered++;
          }
        }
      }
    }

    // ==========================================================
    // DOCUMENT EXPIRY MONITORING AND ALARMS
    // ==========================================================
    const DriverDocument = require('../models/DriverDocument');
    const activeDocs = await DriverDocument.find({
      status: { $in: ['Valid', 'Expiring Soon'] }
    }).populate('userId');

    let docAlerts = 0;

    for (const doc of activeDocs) {
      if (!doc.expiryDate || !doc.userId) continue;

      const user = doc.userId;
      const expiryDate = new Date(doc.expiryDate);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let reminderType = "";
      let reminderMessage = "";

      if (diffDays === 30) {
        reminderType = "30_DAYS_BEFORE";
        reminderMessage = `Your ${doc.documentType} (Number: ${doc.documentNumber}) is expiring in 30 days.`;
      } else if (diffDays === 15) {
        reminderType = "15_DAYS_BEFORE";
        reminderMessage = `Your ${doc.documentType} (Number: ${doc.documentNumber}) is expiring in 15 days.`;
      } else if (diffDays === 7) {
        reminderType = "7_DAYS_BEFORE";
        reminderMessage = `Your ${doc.documentType} (Number: ${doc.documentNumber}) is expiring in 7 days.`;
      } else if (diffDays === 1) {
        reminderType = "1_DAY_BEFORE";
        reminderMessage = `Your ${doc.documentType} (Number: ${doc.documentNumber}) is expiring TOMORROW!`;
      } else if (diffDays <= 0) {
        reminderType = "EXPIRED";
        reminderMessage = `Your ${doc.documentType} (Number: ${doc.documentNumber}) has EXPIRED! Please renew it immediately to avoid penalties.`;
      }

      if (reminderType) {
        // Prevent duplicate spam by checking for already generated matching notifications
        const existingNotif = await Notification.findOne({
          userId: user._id,
          title: `${doc.documentType} Expiry Alert`,
          message: reminderMessage
        });

        if (!existingNotif) {
          console.log(`[VAULT EXPIRY ALERT] Doc ID: ${doc._id} | User: ${user.email} | Type: ${reminderType} | Msg: ${reminderMessage}`);

          const showDashboard = user.notificationSettings?.enabled !== false &&
                                (!user.notificationSettings || user.notificationSettings.dashboardAlerts !== false);
          const sendEmailFlag = user.notificationSettings?.enabled !== false &&
                                (!user.notificationSettings || user.notificationSettings.emailReminders !== false);

          // 1. Create In-App Notification
          if (showDashboard) {
            let priority = "medium";
            if (reminderType === "1_DAY_BEFORE" || reminderType === "EXPIRED") {
              priority = "critical";
            }
            const notification = new Notification({
              userId: user._id,
              title: `${doc.documentType} Expiry Alert`,
              message: reminderMessage,
              type: 'route_alert', // visual attention color indicator
              priority
            });
            await notification.save();
          }

          // 2. Dispatch simulated email alert
          if (sendEmailFlag) {
            try {
              await emailService.sendGenericNotificationEmail(user, `${doc.documentType} Expiry Alert`, reminderMessage);
            } catch (mailError) {
              console.error("[MAIL SCHEDULER ERROR] Failed to send document alert email:", mailError.message);
            }
          }

          // Update actual document status
          if (diffDays <= 0) {
            doc.status = 'Expired';
            await doc.save();
          } else if (diffDays <= 30) {
            doc.status = 'Expiring Soon';
            await doc.save();
          }

          docAlerts++;
        }
      }
    }

    console.log(`Background Reminder Scheduler Completed: Checked ${activeFines.length} tickets and ${activeDocs.length} vault documents. Triggered ${alertsTriggered} fine alerts and ${docAlerts} document alerts.`);
  } catch (error) {
    console.error("Scheduler Error running due reminders background check:", error);
  }
};

/**
 * Initializes and schedules the cron worker.
 */
const start = () => {
  // Cron schedule: Runs hourly at minute 0 (0 * * * *)
  cron.schedule('0 * * * *', async () => {
    await checkAndSendReminders();
  });
  
  console.log("Background Reminder Scheduler Initialized (runs hourly: '0 * * * *')");

  // Trigger an initial checks sweep immediately on startup to verify execution and log output
  setTimeout(async () => {
    await checkAndSendReminders();
  }, 3000);
};

module.exports = {
  start,
  checkAndSendReminders
};
