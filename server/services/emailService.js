const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter = null;
let isSimulationMode = true;

if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
  isSimulationMode = false;
  console.log("🟢 [EMAIL SERVICE] Nodemailer SMTP transport active using secure credentials.");
} else {
  console.warn("🟡 [EMAIL SERVICE WARNING] SMTP credentials not set (EMAIL_USER / EMAIL_PASS missing). Running in Simulated Transmission Mode.");
}

/**
 * Sends a transactional email, falling back to simulated logs if credentials are unconfigured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (isSimulationMode) {
    console.log(`\n==========================================================`);
    console.log(`📬 [SIMULATED EMAIL TRANSMISSION]`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Text):\n${text}`);
    console.log(`==========================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"DriveLegal Compliance Team" <${EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`🟢 [EMAIL SENT] Message sent to: ${to}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`🔴 [EMAIL SENT ERROR] Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Compiles a rich, responsive HTML5 compliance card layout.
 */
const getBaseTemplate = (title, content, actionUrl, actionText) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #121826; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 30px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 40px 30px; line-height: 1.6; }
        .content h2 { color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; }
        .content p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
        .fine-details { background-color: #070a13; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 25px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .detail-value { color: #f1f5f9; font-size: 13px; font-weight: 600; }
        .btn { display: inline-block; background: linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%); color: #ffffff !important; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 14px; font-weight: 700; text-align: center; margin-top: 10px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
        .footer { padding: 25px; border-top: 1px solid #1e293b; background-color: #070a13; text-align: center; font-size: 11px; color: #475569; }
        .footer p { margin: 5px 0; }
        .highlight { color: #38bdf8; font-weight: bold; }
        .warning { color: #fb7185 !important; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>DriveLegal</h1>
        </div>
        <div class="content">
          ${content}
          ${actionUrl ? `<div style="text-align: center;"><a href="${actionUrl}" class="btn">${actionText}</a></div>` : ''}
        </div>
        <div class="footer">
          <p>© 2026 DriveLegal. All rights reserved.</p>
          <p>This is a secure, automated traffic compliance notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Template 1: Fine Due Soon
 */
const sendFineDueEmail = async (user, fine, daysRemaining) => {
  const subject = `DriveLegal Reminder: Fine Due Soon`;
  const isDaysPlural = daysRemaining > 1 ? `${daysRemaining} days` : '1 day';
  const html = getBaseTemplate(
    `DriveLegal Alert: Fine Due Soon`,
    `<h2>Hello ${user.name},</h2>
     <p>This is a secure reminder that your traffic challan is due in <span class="highlight">${isDaysPlural}</span>. Please settle the fine amount before the due date to avoid legal actions or late penalty accumulations.</p>
     <div class="fine-details">
       <div class="detail-row">
         <span class="detail-label">Vehicle Plate</span>
         <span class="detail-value">${fine.vehicleNumber}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Violation</span>
         <span class="detail-value">${fine.violationType}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Fine Amount</span>
         <span class="detail-value" style="color: #fb7185;">₹${fine.amount}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Due Date</span>
         <span class="detail-value">${new Date(fine.dueDate).toLocaleDateString()}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Challan No.</span>
         <span class="detail-value">${fine.fineNumber}</span>
       </div>
     </div>
     <p>Please pay before the deadline.</p>
     <p>Drive safely,</p>
     <p><strong>DriveLegal Team</strong></p>`,
    `http://localhost:5173/fines`,
    `Pay Fine Now`
  );

  const text = `Hello ${user.name},\n\nYour traffic fine is due in ${daysRemaining} days.\n\nVehicle: ${fine.vehicleNumber}\nAmount: ₹${fine.amount}\nDue Date: ${new Date(fine.dueDate).toLocaleDateString()}\nChallan No: ${fine.fineNumber}\n\nPlease pay before the deadline.\n\nDrive safely.\n\nDriveLegal Team`;

  return await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Template 2: Fine Due Tomorrow
 */
const sendFineDueTomorrowEmail = async (user, fine) => {
  const subject = `DriveLegal Reminder: Fine Due Tomorrow!`;
  const html = getBaseTemplate(
    `DriveLegal Alert: Fine Due Tomorrow!`,
    `<h2>Hello ${user.name},</h2>
     <p>Your traffic violation challan is due <span class="highlight warning" style="color:#f43f5e; font-weight:bold;">TOMORROW</span>. Avoid legal exposure by settling the fine immediately.</p>
     <div class="fine-details">
       <div class="detail-row">
         <span class="detail-label">Vehicle Plate</span>
         <span class="detail-value">${fine.vehicleNumber}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Violation</span>
         <span class="detail-value">${fine.violationType}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Fine Amount</span>
         <span class="detail-value" style="color: #f43f5e; font-weight:bold;">₹${fine.amount}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Due Date</span>
         <span class="detail-value">${new Date(fine.dueDate).toLocaleDateString()}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Challan No.</span>
         <span class="detail-value">${fine.fineNumber}</span>
       </div>
     </div>
     <p>Please settle the payment immediately.</p>
     <p>Drive safely,</p>
     <p><strong>DriveLegal Team</strong></p>`,
    `http://localhost:5173/fines`,
    `Settle Fine Instantly`
  );

  const text = `Hello ${user.name},\n\nYour traffic fine is due TOMORROW!\n\nVehicle: ${fine.vehicleNumber}\nAmount: ₹${fine.amount}\nDue Date: ${new Date(fine.dueDate).toLocaleDateString()}\nChallan No: ${fine.fineNumber}\n\nPlease pay before the deadline.\n\nDrive safely.\n\nDriveLegal Team`;

  return await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Template 3: Fine Overdue
 */
const sendFineOverdueEmail = async (user, fine, daysOverdue) => {
  const subject = `DriveLegal Urgent: Fine Overdue!`;
  const pluralDays = daysOverdue > 0 ? `is OVERDUE by ${daysOverdue} day(s)` : 'is OVERDUE';
  const html = getBaseTemplate(
    `DriveLegal Alert: Urgent Overdue Challan`,
    `<h2>Hello ${user.name},</h2>
     <p>Your traffic violation challan <span class="highlight warning" style="color:#f43f5e; font-weight:bold;">${pluralDays}</span>. Immediate payment is required to settle this outstanding enforcement infraction and avoid vehicle blacklist triggers.</p>
     <div class="fine-details" style="border-color: #f43f5e;">
       <div class="detail-row">
         <span class="detail-label">Vehicle Plate</span>
         <span class="detail-value">${fine.vehicleNumber}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Violation</span>
         <span class="detail-value">${fine.violationType}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Fine Amount</span>
         <span class="detail-value" style="color: #f43f5e; font-weight:bold;">₹${fine.amount}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Due Date</span>
         <span class="detail-value">${new Date(fine.dueDate).toLocaleDateString()}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Challan No.</span>
         <span class="detail-value">${fine.fineNumber}</span>
       </div>
     </div>
     <p>Settle the payment immediately to prevent blacklisting and active fine penalties.</p>
     <p>Drive safely,</p>
     <p><strong>DriveLegal Team</strong></p>`,
    `http://localhost:5173/fines`,
    `Settle Overdue Challan`
  );

  const text = `Hello ${user.name},\n\nYour traffic fine is OVERDUE!\n\nVehicle: ${fine.vehicleNumber}\nAmount: ₹${fine.amount}\nDue Date: ${new Date(fine.dueDate).toLocaleDateString()}\nChallan No: ${fine.fineNumber}\n\nPlease pay immediately.\n\nDrive safely.\n\nDriveLegal Team`;

  return await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Template 4: Payment Confirmation
 */
const sendPaymentConfirmationEmail = async (user, fine) => {
  const subject = `DriveLegal: Payment Confirmed`;
  const html = getBaseTemplate(
    `DriveLegal Alert: Payment Receipt Confirmation`,
    `<h2>Hello ${user.name},</h2>
     <p>We are pleased to confirm that your payment for traffic challan <span class="highlight" style="color: #10b981; font-weight:bold;">${fine.fineNumber}</span> has been successfully logged and confirmed on our ledger.</p>
     <div class="fine-details" style="border-color: #10b981;">
       <div class="detail-row">
         <span class="detail-label">Vehicle Plate</span>
         <span class="detail-value">${fine.vehicleNumber}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Violation Type</span>
         <span class="detail-value">${fine.violationType}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Settled Amount</span>
         <span class="detail-value" style="color: #10b981; font-weight:bold;">₹${fine.amount}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Payment Date</span>
         <span class="detail-value">${new Date(fine.paymentDate || Date.now()).toLocaleDateString()}</span>
       </div>
       <div class="detail-row">
         <span class="detail-label">Receipt Status</span>
         <span class="detail-value" style="color:#10b981;">CONFIRMED Paid</span>
       </div>
     </div>
     <p>Thank you for using DriveLegal to maintain your driving compliance.</p>
     <p>Drive safely,</p>
     <p><strong>DriveLegal Team</strong></p>`,
    `http://localhost:5173/fines`,
    `View Payments Ledger`
  );

  const text = `Hello ${user.name},\n\nPayment Confirmed!\n\nVehicle: ${fine.vehicleNumber}\nAmount: ₹${fine.amount}\nPayment Date: ${new Date(fine.paymentDate || Date.now()).toLocaleDateString()}\nChallan No: ${fine.fineNumber}\n\nThank you for maintaining compliance.\n\nDrive safely.\n\nDriveLegal Team`;

  return await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Template 5: Generic compliance notification (e.g. document expiry warnings)
 */
const sendGenericNotificationEmail = async (user, alertTitle, alertMessage) => {
  const subject = `DriveLegal: ${alertTitle}`;
  const html = getBaseTemplate(
    `DriveLegal Compliance Notification`,
    `<h2>Hello ${user.name},</h2>
     <p>This is a secure driving compliance notification regarding your profile documents.</p>
     <div class="fine-details">
       <div class="detail-row">
         <span class="detail-label">Notification Type</span>
         <span class="detail-value">${alertTitle}</span>
       </div>
       <div class="detail-row" style="border: none;">
         <p style="color: #f1f5f9; font-size: 13px; font-weight: 600; margin: 0; padding-top: 8px;">
           ${alertMessage}
         </p>
       </div>
     </div>
     <p>Please check your smart document vault to maintain legal compliance.</p>
     <p>Drive safely,</p>
     <p><strong>DriveLegal Team</strong></p>`,
    `http://localhost:5173/dashboard`,
    `Open Document Vault`
  );

  const text = `Hello ${user.name},\n\nCompliance Notification: ${alertTitle}\n\nMessage: ${alertMessage}\n\nPlease check your smart document vault to maintain legal compliance.\n\nDrive safely.\n\nDriveLegal Team`;

  return await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Template 6: Password Reset Link
 */
const sendResetPasswordEmail = async (user, resetToken) => {
  const subject = `DriveLegal: Password Reset Link`;
  const actionUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
  const html = getBaseTemplate(
    `DriveLegal Alert: Password Reset Request`,
    `<h2>Hello ${user.name},</h2>
     <p>We received a request to reset the password for your DriveLegal account. Click the button below to establish a new password. This link is valid for <span class="highlight">15 minutes</span>.</p>
     <p>If you did not request this, you can safely ignore this email; your credentials will remain unchanged.</p>
     <p>Drive safely,</p>
     <p><strong>DriveLegal Team</strong></p>`,
    actionUrl,
    `Reset Password`
  );

  const text = `Hello ${user.name},\n\nYou requested a password reset for your DriveLegal account.\n\nReset Link: ${actionUrl}\n\nThis link is valid for 15 minutes.\n\nDrive safely.\n\nDriveLegal Team`;

  return await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Template 7: Email Verification Link
 */
const sendVerificationEmail = async (user, verificationToken) => {
  const subject = `DriveLegal: Verify Your Email Address`;
  const actionUrl = `http://localhost:5173/verify-email?token=${verificationToken}`;
  const html = getBaseTemplate(
    `DriveLegal Alert: Email Verification`,
    `<h2>Hello ${user.name},</h2>
     <p>Thank you for registering with DriveLegal! To activate your account and access your dashboard, please verify your email address by clicking the button below. This link is valid for <span class="highlight">24 hours</span>.</p>
     <p>If you did not create this account, you can safely ignore this email.</p>
     <p>Drive safely,</p>
     <p><strong>DriveLegal Team</strong></p>`,
    actionUrl,
    `Verify Email`
  );

  const text = `Hello ${user.name},\n\nPlease verify your DriveLegal account email address.\n\nVerification Link: ${actionUrl}\n\nThis link is valid for 24 hours.\n\nDrive safely.\n\nDriveLegal Team`;

  return await sendEmail({ to: user.email, subject, html, text });
};

module.exports = {
  sendEmail,
  sendFineDueEmail,
  sendFineDueTomorrowEmail,
  sendFineOverdueEmail,
  sendPaymentConfirmationEmail,
  sendGenericNotificationEmail,
  sendResetPasswordEmail,
  sendVerificationEmail
};
