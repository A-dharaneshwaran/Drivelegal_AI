const express = require('express');
const router = express.Router();
const fineController = require('../controllers/fineController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

/**
 * Traffic Fine & Challan Routes mapping directly to the MVC fineController.
 */

// 1. Manual Creation
router.post('/create', auth, fineController.createFineManual);

// 2. Real OCR Bill Scanner (Accepts JPG/JPEG/PNG/PDF up to 10MB)
// Supporting both /ocr and /upload paths to avoid client-side integration bugs
router.post('/ocr', auth, upload.single('file'), fineController.processOcrChallan);
router.post('/upload', auth, upload.single('file'), fineController.processOcrChallan);

// 3. Listings, Queries and Analytics
router.get('/', auth, fineController.listFines);
router.get('/analytics', auth, fineController.getFineAnalytics);

// 4. Challan Detail, Updates, Payment Settlement & Deletion
router.get('/:id', auth, fineController.getFineById);
router.put('/update/:id', auth, fineController.updateFine);
router.put('/mark-paid/:id', auth, fineController.settleFinePaid);
router.delete('/:id', auth, fineController.deleteFine);

module.exports = router;
