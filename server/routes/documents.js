const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

// 1. Upload a document (Accepts image/pdf up to 10MB) and processes OCR
router.post('/upload', auth, upload.single('file'), documentController.uploadDocument);

// 1b. Pre-flight OCR processing (No direct write to DB)
router.post('/ocr-preflight', auth, upload.single('file'), documentController.ocrPreflight);

// 1c. Direct OCR save confirmation after user edits
router.post('/ocr-confirm', auth, documentController.ocrConfirm);

// 2. Manual entry fallback
router.post('/manual', auth, documentController.createDocumentManual);

// 3. Listings
router.get('/', auth, documentController.listDocuments);

// 4. Detail, Manual Update, Deletion
router.get('/:id', auth, documentController.getDocumentById);
router.put('/update/:id', auth, documentController.updateDocument);
router.delete('/:id', auth, documentController.deleteDocument);

module.exports = router;
