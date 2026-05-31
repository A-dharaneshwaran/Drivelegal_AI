const MonthlyReport = require('../models/MonthlyReport');
const User = require('../models/User');
const Fine = require('../models/Fine');
const DriverDocument = require('../models/DriverDocument');
const RouteAnalysis = require('../models/RouteAnalysis');
const Vehicle = require('../models/Vehicle');
const Notification = require('../models/Notification');
const complianceEngine = require('../services/complianceEngine');
const PDFDocument = require('pdfkit');

// ─────────────────────────────────────────────────────────────────────────────
// LIST REPORTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Lists all generated monthly report cards for the driver.
 */
const listReports = async (req, res, next) => {
  try {
    const reports = await MonthlyReport.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE / COMPILE REPORT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Manually compiles or updates the report card for the current calendar month.
 */
const generateReport = async (req, res, next) => {
  try {
    // 1. Recalculate scores to sync current values
    const scores = await complianceEngine.recalculateUserComplianceScores(req.userId);
    const user = await User.findById(req.userId);

    const now = new Date();
    const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' }); // e.g. "May 2026"

    const pendingFines = await Fine.countDocuments({ userId: req.userId, status: { $in: ['Pending', 'Overdue'] } });
    const routesCount = await RouteAnalysis.countDocuments({ userId: req.userId });

    // 2. Generate personalized compliance recommendations
    const recommendations = [];
    if (scores.documentStatus['DL'] === 'Missing' || scores.documentStatus['DL'] === 'Expired') {
      recommendations.push("Upload or renew your Driving License immediately to restore road legality and gain +30 Readiness points.");
    }
    if (scores.documentStatus['Insurance'] === 'Missing' || scores.documentStatus['Insurance'] === 'Expired') {
      recommendations.push("Renew vehicle Insurance policy to protect against liabilities and restore +25 Readiness points.");
    }
    if (scores.documentStatus['RC'] === 'Missing' || scores.documentStatus['RC'] === 'Expired') {
      recommendations.push("Upload your Vehicle Registration Certificate (RC) to verify active registration and gain +20 Readiness points.");
    }
    if (scores.documentStatus['PUC'] === 'Missing' || scores.documentStatus['PUC'] === 'Expired') {
      recommendations.push("Schedule a vehicle emissions test and upload a valid PUC certificate to get +15 Readiness points.");
    }
    if (pendingFines > 0) {
      recommendations.push(`Settle your ${pendingFines} unpaid traffic fine(s) immediately to clear pending challans and raise Compliance Score by +15.`);
    }
    if (scores.awarenessScore < 60) {
      recommendations.push("Visit the Driver Learning Center to complete quiz challenges, study road signs, and unlock Champion Badges.");
    }
    if (routesCount === 0) {
      recommendations.push("Run your first Route Safety Analysis from the dashboard to get an AI-powered road risk briefing for your commute.");
    }
    if (scores.complianceScore === 100 && pendingFines === 0 && scores.awarenessScore >= 90) {
      recommendations.push("Outstanding driving profile! You are currently maintaining perfect compliance. Keep up the clean driving habits!");
    }

    // 3. Save / Update report in database
    let report = await MonthlyReport.findOne({ userId: req.userId, month: monthLabel });
    if (!report) {
      report = new MonthlyReport({ userId: req.userId, month: monthLabel });
    }

    report.complianceScore = scores.complianceScore;
    report.awarenessScore = scores.awarenessScore;
    report.travelReadinessScore = scores.travelReadinessScore;
    report.violationRiskScore = scores.violationRiskScore;
    report.documentStatus = scores.documentStatus;
    report.pendingFinesCount = pendingFines;
    report.routesAnalyzedCount = routesCount;
    report.learningProgressCount = (user.learningModulesViewed || []).length;
    report.aiChatsCount = user.trafficAssistantChatsCount || 0;
    report.recommendations = recommendations;

    await report.save();

    // 4. Create in-app system notification
    if (user.notificationSettings?.enabled !== false && (!user.notificationSettings || user.notificationSettings.dashboardAlerts)) {
      const notif = new Notification({
        userId: req.userId,
        title: `New Report Card: ${monthLabel}`,
        message: `Your driver compliance report card for ${monthLabel} has been generated. Compliance Score: ${scores.complianceScore}/100.`,
        type: 'system',
        priority: 'medium'
      });
      await notif.save();
    }

    res.status(201).json({
      success: true,
      message: `Report card compiled for ${monthLabel}.`,
      report
    });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE TIMELINE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Renders a complete chronological compliance feed timeline.
 */
const getComplianceTimeline = async (req, res, next) => {
  try {
    const timeline = [];

    const docs = await DriverDocument.find({ userId: req.userId });
    docs.forEach(doc => {
      timeline.push({
        id: `doc-up-${doc._id}`,
        date: doc.createdAt,
        type: 'document_uploaded',
        title: `Uploaded ${doc.documentType} Document`,
        description: `Successfully stored ${doc.documentType} (Number: ${doc.documentNumber}) in vault.`,
        category: 'document',
        status: doc.status
      });
      if (doc.expiryDate) {
        const isExpired = new Date(doc.expiryDate) < new Date();
        timeline.push({
          id: `doc-exp-${doc._id}`,
          date: doc.expiryDate,
          type: 'document_expiry',
          title: `${doc.documentType} Expiration Date`,
          description: `${doc.documentType} ${isExpired ? 'expired' : 'expires'} on ${new Date(doc.expiryDate).toLocaleDateString()}.`,
          category: 'expiry',
          status: isExpired ? 'Expired' : 'Valid'
        });
      }
    });

    const fines = await Fine.find({ userId: req.userId });
    fines.forEach(fine => {
      timeline.push({
        id: `fine-iss-${fine._id}`,
        date: fine.issueDate,
        type: 'fine_issued',
        title: `New Traffic Fine Issued`,
        description: `Ticket of ₹${fine.amount} for ${fine.violationType} issued at ${fine.location || 'Unknown'}.`,
        category: 'fine',
        status: fine.status
      });
      if (fine.status === 'Paid' && fine.paymentDate) {
        timeline.push({
          id: `fine-pay-${fine._id}`,
          date: fine.paymentDate,
          type: 'payment_confirmed',
          title: `Settled Challan Payment`,
          description: `Paid and cleared ₹${fine.amount} for fine ${fine.fineNumber}.`,
          category: 'payment',
          status: 'Paid'
        });
      }
    });

    const alerts = await Notification.find({ userId: req.userId }).limit(10);
    alerts.forEach(a => {
      timeline.push({
        id: `notif-${a._id}`,
        date: a.createdAt,
        type: 'system_alert',
        title: a.title,
        description: a.message,
        category: 'alert',
        status: a.isRead ? 'Read' : 'Unread'
      });
    });

    const routes = await RouteAnalysis.find({ userId: req.userId }).limit(5).sort({ createdAt: -1 });
    routes.forEach(r => {
      timeline.push({
        id: `route-${r._id}`,
        date: r.createdAt,
        type: 'route_analyzed',
        title: `Route Safety Analysis`,
        description: `Analyzed route ${r.source} → ${r.destination}. Safety Score: ${r.safetyScore}/100.`,
        category: 'route',
        status: r.safetyScore >= 70 ? 'Safe' : 'High Risk'
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, timeline });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns a complete live snapshot of all driver intelligence data for the Overview tab.
 */
const getDashboardSnapshot = async (req, res, next) => {
  try {
    // Recalculate live scores
    const scores = await complianceEngine.recalculateUserComplianceScores(req.userId);
    const user = await User.findById(req.userId);

    // Fines breakdown
    const allFines = await Fine.find({ userId: req.userId });
    const pendingFines = allFines.filter(f => f.status === 'Pending');
    const overdueFines = allFines.filter(f => f.status === 'Overdue');
    const paidFines = allFines.filter(f => f.status === 'Paid');
    const totalFineAmount = allFines.reduce((s, f) => s + f.amount, 0);
    const pendingAmount = pendingFines.concat(overdueFines).reduce((s, f) => s + f.amount, 0);
    const paidAmount = paidFines.reduce((s, f) => s + f.amount, 0);

    // Violation category breakdown
    const violationCounts = {};
    allFines.forEach(f => {
      violationCounts[f.violationType] = (violationCounts[f.violationType] || 0) + 1;
    });
    const violationBreakdown = Object.entries(violationCounts).map(([name, value]) => ({ name, value }));

    // Documents
    const docs = await DriverDocument.find({ userId: req.userId });
    const docCounts = { Valid: 0, 'Expiring Soon': 0, Expired: 0, Missing: 0 };
    const docTypes = ['DL', 'RC', 'Insurance', 'PUC'];
    docTypes.forEach(type => {
      const status = scores.documentStatus[type] || 'Missing';
      docCounts[status] = (docCounts[status] || 0) + 1;
    });
    const docHealthChart = Object.entries(docCounts).map(([name, value]) => ({ name, value }));

    // Vehicles
    const vehicles = await Vehicle.find({ userId: req.userId });

    // Routes
    const routes = await RouteAnalysis.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(5);
    const avgSafetyScore = routes.length > 0
      ? Math.round(routes.reduce((s, r) => s + r.safetyScore, 0) / routes.length)
      : null;
    const avgRiskScore = routes.length > 0
      ? Math.round(routes.reduce((s, r) => s + r.riskScore, 0) / routes.length)
      : null;

    // Most common risk factors across routes
    const riskFactorCounts = {};
    routes.forEach(r => {
      if (r.weatherRisk > 15) riskFactorCounts['Weather'] = (riskFactorCounts['Weather'] || 0) + 1;
      if (r.trafficRisk > 15) riskFactorCounts['Traffic'] = (riskFactorCounts['Traffic'] || 0) + 1;
      if (r.fatigueRisk > 15) riskFactorCounts['Fatigue'] = (riskFactorCounts['Fatigue'] || 0) + 1;
      if (r.hotspotRisk > 15) riskFactorCounts['Hotspots'] = (riskFactorCounts['Hotspots'] || 0) + 1;
      if (r.legalComplianceRisk > 10) riskFactorCounts['Legal'] = (riskFactorCounts['Legal'] || 0) + 1;
    });
    const topRiskFactors = Object.entries(riskFactorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor]) => factor);

    // Notifications
    const recentNotifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 }).limit(5);
    const unreadCount = await Notification.countDocuments({ userId: req.userId, isRead: false });

    res.json({
      success: true,
      snapshot: {
        user: { name: user.name, email: user.email },
        scores: {
          complianceScore: scores.complianceScore,
          complianceContributors: scores.complianceContributors || [],
          awarenessScore: scores.awarenessScore,
          travelReadinessScore: scores.travelReadinessScore,
          violationRiskScore: scores.violationRiskScore,
          aiChatsCount: user.trafficAssistantChatsCount || 0,
          quizCompletionCount: user.quizCompletionCount || 0,
          learningModulesCount: (user.learningModulesViewed || []).length
        },
        documentStatus: scores.documentStatus,
        docHealthChart,
        validDocsCount: docCounts.Valid,
        totalDocsRequired: 4,
        fines: {
          total: allFines.length,
          pending: pendingFines.length,
          overdue: overdueFines.length,
          paid: paidFines.length,
          totalAmount: totalFineAmount,
          pendingAmount,
          paidAmount
        },
        violationBreakdown,
        vehicles: {
          count: vehicles.length,
          list: vehicles.map(v => ({ id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model }))
        },
        routes: {
          total: await RouteAnalysis.countDocuments({ userId: req.userId }),
          avgSafetyScore,
          avgRiskScore,
          topRiskFactors,
          recent: routes.map(r => ({
            id: r._id,
            source: r.source,
            destination: r.destination,
            safetyScore: r.safetyScore,
            riskScore: r.riskScore,
            date: r.createdAt
          }))
        },
        notifications: {
          unreadCount,
          recent: recentNotifications.map(n => ({
            id: n._id,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority,
            isRead: n.isRead,
            createdAt: n.createdAt
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns aggregated analytics: score trends, doc health, challan breakdown, route stats.
 */
const getAnalytics = async (req, res, next) => {
  try {
    // Score trend data from historical MonthlyReports
    const reports = await MonthlyReport.find({ userId: req.userId }).sort({ createdAt: 1 });
    const scoreTrend = reports.map(r => ({
      month: r.month,
      complianceScore: r.complianceScore,
      awarenessScore: r.awarenessScore,
      travelReadiness: r.travelReadinessScore,
      violationRisk: r.violationRiskScore
    }));

    // All routes for safety trend
    const allRoutes = await RouteAnalysis.find({ userId: req.userId }).sort({ createdAt: 1 });
    const routeSafetyTrend = allRoutes.map(r => ({
      date: new Date(r.createdAt).toLocaleDateString(),
      safetyScore: r.safetyScore,
      riskScore: r.riskScore,
      route: `${r.source.substring(0, 12)}→${r.destination.substring(0, 12)}`
    }));

    // Fine amount history
    const allFines = await Fine.find({ userId: req.userId }).sort({ issueDate: 1 });
    const fineAmountHistory = allFines.map(f => ({
      date: new Date(f.issueDate).toLocaleDateString(),
      amount: f.amount,
      status: f.status,
      type: f.violationType
    }));

    // Violation breakdown
    const violationCounts = {};
    allFines.forEach(f => {
      violationCounts[f.violationType] = (violationCounts[f.violationType] || 0) + 1;
    });
    const violationBreakdown = Object.entries(violationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Document health snapshot
    const scores = await complianceEngine.recalculateUserComplianceScores(req.userId);
    const docCounts = { Valid: 0, 'Expiring Soon': 0, Expired: 0, Missing: 0 };
    ['DL', 'RC', 'Insurance', 'PUC'].forEach(type => {
      const status = scores.documentStatus[type] || 'Missing';
      docCounts[status] = (docCounts[status] || 0) + 1;
    });
    const docHealthChart = [
      { name: 'Valid', value: docCounts['Valid'], fill: '#10b981' },
      { name: 'Expiring Soon', value: docCounts['Expiring Soon'], fill: '#f59e0b' },
      { name: 'Expired', value: docCounts['Expired'], fill: '#f43f5e' },
      { name: 'Missing', value: docCounts['Missing'], fill: '#475569' }
    ].filter(d => d.value > 0);

    res.json({
      success: true,
      analytics: {
        scoreTrend,
        routeSafetyTrend,
        fineAmountHistory,
        violationBreakdown,
        docHealthChart,
        totals: {
          reportsGenerated: reports.length,
          routesAnalyzed: allRoutes.length,
          totalFines: allFines.length,
          totalFineAmount: allFines.reduce((s, f) => s + f.amount, 0),
          paidAmount: allFines.filter(f => f.status === 'Paid').reduce((s, f) => s + f.amount, 0),
          // AI interaction totals aggregated from stored report snapshots
          totalAiChats: reports.reduce((s, r) => s + (r.aiChatsCount || 0), 0),
          learningProgress: reports.reduce((s, r) => s + (r.learningProgressCount || 0), 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATION
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Streams a branded PDF of a MonthlyReport using pdfkit.
 */
const downloadReportPdf = async (req, res, next) => {
  try {
    const report = await MonthlyReport.findOne({ _id: req.params.id, userId: req.userId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const user = await User.findById(req.userId);

    // Stream PDF directly to response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DriveLegal-Report-${report.month.replace(/\s+/g, '-')}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── Header Band ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill('#0f172a');

    doc.fillColor('#38bdf8')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('DRIVELEGAL AI', 50, 28, { align: 'left' });

    doc.fillColor('#ffffff')
       .fontSize(20)
       .text('Driver Compliance Report', 50, 44, { align: 'left' });

    doc.fillColor('#94a3b8')
       .fontSize(9)
       .font('Helvetica')
       .text(`Assessment Period: ${report.month}  •  Generated: ${new Date().toLocaleString()}`, 50, 72);

    // Driver name top-right
    doc.fillColor('#ffffff')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(user?.name || 'Driver', doc.page.width - 200, 44, { align: 'right', width: 150 });

    doc.moveDown(4.5);

    // ── Score Summary Table ───────────────────────────────────────────────────
    doc.fillColor('#1e293b')
       .rect(50, doc.y, doc.page.width - 100, 28).fill();

    doc.fillColor('#94a3b8')
       .fontSize(8)
       .font('Helvetica-Bold')
       .text('COMPLIANCE SCORE SUMMARY', 55, doc.y - 22);

    doc.moveDown(1.6);

    const scoreData = [
      { label: 'Compliance Score', value: `${report.complianceScore}/100`, note: report.complianceScore >= 90 ? 'Excellent' : report.complianceScore >= 70 ? 'Good' : 'Needs Work' },
      { label: 'Awareness Score', value: `${report.awarenessScore}/100`, note: 'Road Knowledge' },
      { label: 'Travel Readiness', value: `${report.travelReadinessScore}/100`, note: 'Ready to Drive' },
      { label: 'Violation Risk', value: `${report.violationRiskScore}/100`, note: report.violationRiskScore >= 50 ? 'HIGH RISK' : 'LOW RISK' }
    ];

    let scoreY = doc.y;
    scoreData.forEach((s, i) => {
      const rowY = scoreY + (i * 28);
      if (i % 2 === 0) {
        doc.fillColor('#f8fafc').rect(50, rowY, doc.page.width - 100, 26).fill();
      } else {
        doc.fillColor('#ffffff').rect(50, rowY, doc.page.width - 100, 26).fill();
      }
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(s.label, 60, rowY + 8);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(s.value, 260, rowY + 6);
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(s.note, 370, rowY + 8);
    });
    doc.y = scoreY + (scoreData.length * 28);

    doc.moveDown(5.5);

    // ── Document Health ───────────────────────────────────────────────────────
    doc.fillColor('#1e293b').rect(50, doc.y, doc.page.width - 100, 28).fill();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('DOCUMENT VAULT STATUS', 55, doc.y - 20);
    doc.moveDown(1.6);

    const docTypes = ['DL', 'RC', 'Insurance', 'PUC'];
    const docLabels = { DL: 'Driving License', RC: 'Registration (RC)', Insurance: 'Insurance Policy', PUC: 'Emission (PUC)' };

    const baseDocsY = doc.y;
    docTypes.forEach((type, i) => {
      const status = report.documentStatus ? (report.documentStatus.get ? report.documentStatus.get(type) : report.documentStatus[type]) || 'Missing' : 'Missing';
      const rowY = baseDocsY + (i * 26);
      if (i % 2 === 0) {
        doc.fillColor('#f8fafc').rect(50, rowY, doc.page.width - 100, 24).fill();
      } else {
        doc.fillColor('#ffffff').rect(50, rowY, doc.page.width - 100, 24).fill();
      }
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(docLabels[type], 60, rowY + 7);
      const statusColor = status === 'Valid' ? '#059669' : status === 'Expiring Soon' ? '#d97706' : '#e11d48';
      doc.fillColor(statusColor).fontSize(9).font('Helvetica-Bold').text(status.toUpperCase(), 370, rowY + 7);
    });
    doc.y = baseDocsY + (docTypes.length * 26);

    doc.moveDown(5.2);

    // ── Fines Summary ─────────────────────────────────────────────────────────
    doc.fillColor('#1e293b').rect(50, doc.y, doc.page.width - 100, 28).fill();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('CHALLAN & FINE SUMMARY', 55, doc.y - 20);
    doc.moveDown(1.6);

    const fineData = [
      { label: 'Pending / Overdue Challans', value: String(report.pendingFinesCount) },
      { label: 'Routes Safety Analyzed', value: String(report.routesAnalyzedCount) }
    ];
    const baseFineY = doc.y;
    fineData.forEach((f, i) => {
      const rowY = baseFineY + (i * 26);
      if (i % 2 === 0) doc.fillColor('#f8fafc').rect(50, rowY, doc.page.width - 100, 24).fill();
      else doc.fillColor('#ffffff').rect(50, rowY, doc.page.width - 100, 24).fill();
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(f.label, 60, rowY + 7);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(f.value, 370, rowY + 6);
    });
    doc.y = baseFineY + (fineData.length * 26);

    doc.moveDown(3.2);

    // ── Recommendations ───────────────────────────────────────────────────────
    if (report.recommendations && report.recommendations.length > 0) {
      doc.fillColor('#1e293b').rect(50, doc.y, doc.page.width - 100, 28).fill();
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('PERSONALISED COMPLIANCE RECOMMENDATIONS', 55, doc.y - 20);
      doc.moveDown(1.8);

      report.recommendations.forEach((rec, i) => {
        const textHeight = doc.heightOfString(rec, { width: doc.page.width - 130 });
        const rowHeight = Math.max(36, textHeight + 16);
        const startY = doc.y;

        doc.fillColor('#1e3a5f').rect(50, startY, doc.page.width - 100, rowHeight).fill();
        doc.fillColor('#38bdf8').fontSize(8.5).font('Helvetica-Bold').text(`${i + 1}.`, 58, startY + 10);
        doc.fillColor('#e2e8f0').fontSize(8.5).font('Helvetica').text(rec, 72, startY + 10, { width: doc.page.width - 130 });
        
        doc.y = startY + rowHeight + 6;
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.fillColor('#0f172a').rect(0, doc.page.height - 50, doc.page.width, 50).fill();
    doc.fillColor('#475569').fontSize(7).font('Helvetica')
       .text(
         `DriveLegal AI Compliance Authority  •  Digital Certificate  •  Generated ${new Date().toLocaleString()}  •  Report ID: ${report._id}`,
         50, doc.page.height - 32, { align: 'center', width: doc.page.width - 100 }
       );

    doc.end();

  } catch (error) {
    console.error('[PDF GENERATION ERROR]', error.message);
    if (!res.headersSent) {
      next(error);
    }
  }
};

module.exports = {
  listReports,
  generateReport,
  getComplianceTimeline,
  getDashboardSnapshot,
  getAnalytics,
  downloadReportPdf
};
