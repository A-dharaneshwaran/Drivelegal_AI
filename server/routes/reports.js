const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// 1. Live dashboard snapshot (scores, docs, fines, vehicles, routes, notifications)
router.get('/dashboard', auth, reportController.getDashboardSnapshot);

// 2. Analytics aggregation (trend charts, violation breakdown, doc health pie)
router.get('/analytics', auth, reportController.getAnalytics);

// 3. Compliance timeline (chronological event feed)
router.get('/timeline', auth, reportController.getComplianceTimeline);

// 4. List all monthly saved reports
router.get('/', auth, reportController.listReports);

// 5. Compile / generate current month's report
router.post('/generate', auth, reportController.generateReport);

// 6. Download a specific report as a branded PDF
router.get('/pdf/:id', auth, reportController.downloadReportPdf);

module.exports = router;
