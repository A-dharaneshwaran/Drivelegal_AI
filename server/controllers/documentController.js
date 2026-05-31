const DriverDocument = require('../models/DriverDocument');
const Vehicle = require('../models/Vehicle');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');
const complianceEngine = require('../services/complianceEngine');

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT DATE VALIDATION RULES
// Business rules per document type.
// Future: replace static thresholds with RTO regulation API data.
// ─────────────────────────────────────────────────────────────────────────────
const VALIDATION_RULES = {
  DL: {
    minValidityMonths: 12,        // At least 1 year
    maxValidityMonths: 240,       // Max 20 years
    typicalMinYears: 5,
    typicalMaxYears: 20,
    label: 'Driving License'
  },
  RC: {
    minValidityMonths: 12,
    maxValidityMonths: 240,       // Max 20 years
    typicalMinYears: 10,
    typicalMaxYears: 20,
    label: 'Registration Certificate'
  },
  Insurance: {
    minValidityMonths: 1,
    maxValidityMonths: 60,        // Max 5 years
    typicalMinYears: 1,
    typicalMaxYears: 3,
    label: 'Insurance Policy'
  },
  PUC: {
    minValidityMonths: 1,
    maxValidityMonths: 18,        // Absolute max 18 months
    typicalMinMonths: 3,
    typicalMaxMonths: 12,
    label: 'PUC Certificate'
  }
};

/**
 * Validates issue date / expiry date pair against document-specific business rules.
 * Returns { valid: bool, errors: string[], warnings: string[], validityMonths: number|null }
 *
 * Hard errors block saving. Warnings are stored but do not block saving.
 */
const validateDocumentDates = (documentType, issueDate, expiryDate) => {
  const errors = [];
  const warnings = [];
  const rules = VALIDATION_RULES[documentType];

  if (!rules) {
    return { valid: false, errors: [`Unknown document type: ${documentType}`], warnings: [], validityMonths: null };
  }

  const now = new Date();
  let parsedIssue = null;
  let parsedExpiry = null;

  // Parse expiry date — required for all document types
  if (!expiryDate) {
    errors.push('Expiry date is required.');
    return { valid: false, errors, warnings, validityMonths: null };
  }

  parsedExpiry = new Date(expiryDate);
  if (isNaN(parsedExpiry.getTime())) {
    errors.push('Expiry date is not a valid date.');
    return { valid: false, errors, warnings, validityMonths: null };
  }

  // Parse issue date if provided
  if (issueDate) {
    parsedIssue = new Date(issueDate);
    if (isNaN(parsedIssue.getTime())) {
      errors.push('Issue date is not a valid date.');
      return { valid: false, errors, warnings, validityMonths: null };
    }

    // HARD CHECK: Expiry must be after issue date
    if (parsedExpiry <= parsedIssue) {
      errors.push(`Expiry date must be after issue date for ${rules.label}.`);
    }

    // HARD CHECK: Issue date cannot be in the future (more than 7 days tolerance)
    const futureTolerance = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (parsedIssue > futureTolerance) {
      errors.push(`Issue date cannot be in the future for ${rules.label}.`);
    }
  }

  // Return early on hard errors — no point computing validity range
  if (errors.length > 0) {
    return { valid: false, errors, warnings, validityMonths: null };
  }

  // Compute validity duration in months
  let validityMonths = null;
  if (parsedIssue && parsedExpiry) {
    const diffMs = parsedExpiry.getTime() - parsedIssue.getTime();
    validityMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  } else if (parsedExpiry) {
    // If no issue date, compute from today to get remaining validity
    const diffMs = parsedExpiry.getTime() - now.getTime();
    validityMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  }

  // RANGE WARNINGS — soft warnings for unusual validity ranges
  if (validityMonths !== null && parsedIssue) {
    const { minValidityMonths, maxValidityMonths } = rules;

    if (validityMonths < minValidityMonths) {
      warnings.push(`${rules.label} validity of ${validityMonths} month(s) is unusually short (minimum expected: ${minValidityMonths} months). Please verify the dates.`);
    }

    if (validityMonths > maxValidityMonths) {
      warnings.push(`${rules.label} validity of ${Math.round(validityMonths / 12)} year(s) is unusually long (maximum expected: ${Math.round(maxValidityMonths / 12)} years). Please verify the dates.`);
    }

    // Type-specific typical range warnings
    if (documentType === 'DL') {
      const validityYears = validityMonths / 12;
      if (validityYears < rules.typicalMinYears) {
        warnings.push(`DL validity of ${validityMonths} months is below the typical 5–20 year range.`);
      } else if (validityYears > rules.typicalMaxYears) {
        warnings.push(`DL validity of ${Math.round(validityYears)} years exceeds the typical 20-year maximum.`);
      }
    }

    if (documentType === 'RC') {
      const validityYears = validityMonths / 12;
      if (validityYears < rules.typicalMinYears) {
        warnings.push(`RC validity of ${Math.round(validityYears)} year(s) is below the expected ~15-year range.`);
      } else if (validityYears > rules.typicalMaxYears) {
        warnings.push(`RC validity of ${Math.round(validityYears)} years exceeds typical 20-year registration window.`);
      }
    }

    if (documentType === 'Insurance') {
      const validityYears = validityMonths / 12;
      if (validityYears > 5) {
        warnings.push(`Insurance policy validity of ${Math.round(validityYears)} years exceeds 5 years — typical policies are 1–3 years. Verify policy terms.`);
      } else if (validityMonths < 1) {
        warnings.push(`Insurance validity appears extremely short. Verify policy start and end dates.`);
      }
    }

    if (documentType === 'PUC') {
      if (validityMonths > 12) {
        warnings.push(`PUC certificate validity of ${validityMonths} months exceeds 12 months. PUC is typically valid for 3–12 months.`);
      } else if (validityMonths < 1) {
        warnings.push(`PUC validity appears less than 1 month — verify certificate issue and expiry dates.`);
      }
    }
  }

  return {
    valid: true,
    errors,
    warnings,
    validityMonths
  };
};

/**
 * Detects the document type from OCR text using keyword/regex heuristics.
 * Returns the most likely type string: 'DL' | 'RC' | 'Insurance' | 'PUC' | 'Unknown'
 * @param {string} text - Raw OCR text
 * @returns {{ detectedType: string, scores: Object }}
 */
const detectDocumentType = (text) => {
  if (!text) return { detectedType: 'Unknown', scores: {} };
  const lower = text.toLowerCase();

  const signals = {
    DL: [
      /driving\s*licen[sc]e/i,
      /\bDL\s*no/i,
      /\blicen[sc]e\s*no/i,
      /transport\s*authority/i,
      /motor\s*vehicles\s*act/i,
      /\bRTO\b/i,
      /class\s*of\s*vehicle/i,
      /\bdob\b/i,
      /badge\s*no/i
    ],
    RC: [
      /registration\s*certificate/i,
      /\bRC\s*book/i,
      /vehicle\s*class/i,
      /chassis\s*no/i,
      /engine\s*no/i,
      /fuel\s*type/i,
      /maker[\s\/]model/i,
      /maker.*model/i,
      /registration\s*no/i,
      /owner.*name/i
    ],
    Insurance: [
      /policy\s*no/i,
      /insurance/i,
      /insured/i,
      /premium/i,
      /\bIDV\b/i,
      /\bTPPD\b/i,
      /coverage\s*period/i,
      /sum\s*insured/i,
      /motor\s*policy/i,
      /comprehensive/i
    ],
    PUC: [
      /pollution\s*under\s*control/i,
      /\bPUC\b/,
      /emission\s*test/i,
      /\bCO\s*level/i,
      /\bHC\s*level/i,
      /emission\s*norms/i,
      /pucc/i,
      /bharat\s*stage/i,
      /carbon\s*monoxide/i
    ]
  };

  const scores = {};
  for (const [type, patterns] of Object.entries(signals)) {
    scores[type] = patterns.filter(p => p.test(text)).length;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return { detectedType: 'Unknown', scores };

  const detectedType = Object.entries(scores).find(([, v]) => v === maxScore)[0];
  return { detectedType, scores };
};

/**
 * Uploads a document, processes Tesseract OCR, parses details via Gemini AI, and saves it directly.
 * Maintains full backward compatibility with non-review APIs.
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded for OCR parsing.' });
    }

    const { documentType, vehicleId } = req.body;
    if (!documentType || !['DL', 'RC', 'Insurance', 'PUC'].includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing documentType.' });
    }

    console.log(`[VAULT DOCUMENT UPLOAD] Uploaded ${req.file.originalname} of type ${documentType}`);

    // 1. Tesseract OCR parsing with Jimp enhancements
    const rawText = await ocrService.extractTextFromBuffer(req.file.buffer);

    // 2. Hybrid AI parsing with confidences
    const parsedRes = await aiService.extractDocumentFieldsFromOcr(rawText, documentType);
    const { extracted, confidences } = parsedRes;

    // 3. Status logic based on Expiry Date
    let status = 'Valid';
    let parsedExpiry = null;
    let parsedIssue = null;

    if (extracted.expiryDate) {
      parsedExpiry = new Date(extracted.expiryDate);
      if (parsedExpiry < new Date()) {
        status = 'Expired';
      } else {
        const diffDays = Math.ceil((parsedExpiry - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          status = 'Expiring Soon';
        }
      }
    }

    if (extracted.issueDate) {
      parsedIssue = new Date(extracted.issueDate);
    }

    // 4. Try matching vehicle plate number if RC/Insurance/PUC
    let linkedVehicleId = vehicleId || null;
    if (!linkedVehicleId && extracted.vehicleNumber && documentType !== 'DL') {
      const matchVeh = await Vehicle.findOne({
        userId: req.userId,
        plateNumber: extracted.vehicleNumber.toUpperCase().replace(/\s+/g, '-')
      });
      if (matchVeh) {
        linkedVehicleId = matchVeh._id;
      }
    }

    // 5. Check if document already exists for this type to update it, keeping exactly 1 active copy
    const query = { userId: req.userId, documentType };
    if (documentType !== 'DL' && linkedVehicleId) {
      query.vehicleId = linkedVehicleId;
    }

    let doc = await DriverDocument.findOne(query);
    if (!doc) {
      doc = new DriverDocument({
        userId: req.userId,
        documentType
      });
    }

    doc.documentNumber = extracted.documentNumber || doc.documentNumber || 'PENDING';
    if (parsedIssue) doc.issueDate = parsedIssue;
    if (parsedExpiry) doc.expiryDate = parsedExpiry;
    doc.vehicleId = linkedVehicleId;
    doc.status = status;
    doc.confidences = confidences;
    doc.ocrExtractedData = {
      rawText: rawText.substring(0, 1000),
      geminiParsed: extracted
    };

    // Store in-memory simulation url
    doc.fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64').substring(0, 100)}...`;

    await doc.save();

    // 6. Dynamically trigger score calculations
    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);

    res.status(201).json({
      success: true,
      message: `${documentType} processed and uploaded successfully!`,
      document: doc,
      scores: updatedScores
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Pre-flight OCR processing: Runs Jimp image enhancements + OCR + hybrid parsing
 * and returns details for User Review without committing to the database.
 */
const ocrPreflight = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded for OCR pre-flight.' });
    }

    const { documentType, vehicleId } = req.body;
    if (!documentType || !['DL', 'RC', 'Insurance', 'PUC'].includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing documentType.' });
    }

    console.log(`[OCR PRE-FLIGHT] Ingesting ${req.file.originalname} for ${documentType}...`);

    // 1. Tesseract OCR with Jimp enhancements
    const rawText = await ocrService.extractTextFromBuffer(req.file.buffer);

    // 2. Document Type Auto-Detection (Phase 1)
    const { detectedType, scores: detectionScores } = detectDocumentType(rawText);
    console.log(`[OCR TYPE DETECTION] User declared: ${documentType} | Auto-detected: ${detectedType} | Scores:`, detectionScores);

    // 3. Mismatch Detection — warn when declared type differs from detected type (Phase 4)
    const typeMismatch = detectedType !== 'Unknown' && detectedType !== documentType;
    if (typeMismatch) {
      console.warn(`[OCR TYPE MISMATCH] User uploaded ${documentType} but document appears to be a ${detectedType}`);
    }

    // 4. Hybrid parsers with AI fallback (uses user-declared type for field extraction)
    const { extracted, confidences } = await aiService.extractDocumentFieldsFromOcr(rawText, documentType);

    // 5. Critically Low Confidence Rejection (Phase 3) — hard reject if < 20% and no key fields
    const criticallyLow = (confidences.overallOcr || 0) < 20 && !extracted.documentNumber;
    if (criticallyLow) {
      console.error(`[OCR REJECTION] Critically low readability: ${confidences.overallOcr}%. Rejecting document.`);
      return res.status(422).json({
        success: false,
        message: 'Document could not be read. The image quality is too low or the document is unreadable. Please upload a clearer photo.',
        confidences,
        detectedType,
        typeMismatch
      });
    }

    // 6. Duplicate Document Detection (Phase 8) — check if this type already exists in vault
    const existingDoc = await DriverDocument.findOne({ userId: req.userId, documentType });
    const isDuplicate = !!existingDoc;

    // Generate lightweight base64 preview for display in user review screen
    const base64Preview = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    console.log(`[OCR PRE-FLIGHT SUCCESS] OCR completed for ${documentType}. Overall confidence: ${confidences.overallOcr}% | Duplicate: ${isDuplicate} | Mismatch: ${typeMismatch}`);

    res.json({
      success: true,
      documentType,
      vehicleId: vehicleId || null,
      extracted,
      confidences,
      rawText: rawText.substring(0, 1000),
      filePreview: base64Preview,
      // Validation metadata
      detectedType,
      detectionScores,
      typeMismatch,
      isDuplicate,
      existingDocId: existingDoc ? existingDoc._id : null
    });

  } catch (error) {
    console.error("[OCR PRE-FLIGHT EXCEPTION]:", error);
    res.status(500).json({ success: false, message: error.message || 'OCR Pre-flight failed.' });
  }
};

/**
 * Commits the finalized, verified document fields to MongoDB after User Review corrections.
 */
const ocrConfirm = async (req, res, next) => {
  try {
    const { documentType, documentNumber, issueDate, expiryDate, vehicleId, confidences, filePreview, holderName, ownerName, insurerName, vehicleNumber } = req.body;

    if (!documentType || !documentNumber || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Missing confirmed document parameters.' });
    }

    // ── DATE VALIDATION ENGINE ────────────────────────────────────────────────
    const dateValidation = validateDocumentDates(documentType, issueDate || null, expiryDate);
    if (!dateValidation.valid) {
      return res.status(422).json({
        success: false,
        message: dateValidation.errors[0] || 'Invalid date combination.',
        errors: dateValidation.errors,
        warnings: dateValidation.warnings
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    let status = 'Valid';
    const parsedExpiry = new Date(expiryDate);
    if (parsedExpiry < new Date()) {
      status = 'Expired';
    } else {
      const diffDays = Math.ceil((parsedExpiry - new Date()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        status = 'Expiring Soon';
      }
    }
    // Flag unusual validity on document status
    if (dateValidation.warnings.length > 0 && status === 'Valid') {
      status = 'Unusual Validity';
    }

    let parsedIssue = issueDate ? new Date(issueDate) : null;

    // Check if we need to resolve linked vehicle
    let linkedVehicleId = vehicleId || null;

    // Keep exactly 1 active copy per type
    const query = { userId: req.userId, documentType };
    if (documentType !== 'DL' && linkedVehicleId) {
      query.vehicleId = linkedVehicleId;
    }

    let doc = await DriverDocument.findOne(query);
    if (!doc) {
      doc = new DriverDocument({
        userId: req.userId,
        documentType
      });
    }

    doc.documentNumber = documentNumber;
    doc.expiryDate = parsedExpiry;
    if (parsedIssue) doc.issueDate = parsedIssue;
    doc.vehicleId = linkedVehicleId;
    doc.status = status;
    doc.confidences = confidences || { overallOcr: 100 };
    doc.validityWarnings = dateValidation.warnings;
    
    // Put other metadata into ocrExtractedData
    doc.ocrExtractedData = {
      geminiParsed: {
        documentNumber,
        issueDate,
        expiryDate,
        vehicleNumber,
        holderName,
        ownerName,
        insurerName
      }
    };
    
    // Save lightweight preview URL
    if (filePreview) {
      doc.fileUrl = filePreview.substring(0, 500) + '...'; // Keep DB lightweight
    } else {
      doc.fileUrl = 'manual_verified_ocr';
    }

    await doc.save();

    // Dynamically recalculate user compliance score
    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);

    console.log(`[OCR CONFIRMATION] Saved ${documentType} | Status: ${status} | Warnings: ${dateValidation.warnings.length}`);

    res.status(201).json({
      success: true,
      message: `${documentType} saved and compliance scores recalculated successfully!`,
      document: doc,
      scores: updatedScores,
      validationWarnings: dateValidation.warnings
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Creates/Updates a document metadata manually without OCR fallback.
 */
const createDocumentManual = async (req, res, next) => {
  try {
    const { documentType, documentNumber, issueDate, expiryDate, vehicleId } = req.body;
    if (!documentType || !['DL', 'RC', 'Insurance', 'PUC'].includes(documentType) || !documentNumber || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Missing required manual fields.' });
    }

    // ── DATE VALIDATION ENGINE ────────────────────────────────────────────────
    const dateValidation = validateDocumentDates(documentType, issueDate || null, expiryDate);
    if (!dateValidation.valid) {
      return res.status(422).json({
        success: false,
        message: dateValidation.errors[0] || 'Invalid date combination.',
        errors: dateValidation.errors,
        warnings: dateValidation.warnings
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    let status = 'Valid';
    const parsedExpiry = new Date(expiryDate);
    if (parsedExpiry < new Date()) {
      status = 'Expired';
    } else {
      const diffDays = Math.ceil((parsedExpiry - new Date()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        status = 'Expiring Soon';
      }
    }
    // Flag unusual validity on document status
    if (dateValidation.warnings.length > 0 && status === 'Valid') {
      status = 'Unusual Validity';
    }

    const query = { userId: req.userId, documentType };
    if (documentType !== 'DL' && vehicleId) {
      query.vehicleId = vehicleId;
    }

    let doc = await DriverDocument.findOne(query);
    if (!doc) {
      doc = new DriverDocument({
        userId: req.userId,
        documentType
      });
    }

    doc.documentNumber = documentNumber;
    doc.expiryDate = parsedExpiry;
    if (issueDate) doc.issueDate = new Date(issueDate);
    if (vehicleId) doc.vehicleId = vehicleId;
    doc.status = status;
    doc.fileUrl = 'manual_entry';
    doc.confidences = { overallOcr: 100 }; // 100% confidence since manually inputted by owner
    doc.validityWarnings = dateValidation.warnings;

    await doc.save();

    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);

    console.log(`[MANUAL DOCUMENT] Saved ${documentType} | Status: ${status} | Warnings: ${dateValidation.warnings.length}`);

    res.status(201).json({
      success: true,
      message: `${documentType} saved manually.`,
      document: doc,
      scores: updatedScores,
      validationWarnings: dateValidation.warnings
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Lists all documents in user vault.
 */
const listDocuments = async (req, res, next) => {
  try {
    // Refresh document expiries on list sweep
    await complianceEngine.recalculateUserComplianceScores(req.userId);
    
    const documents = await DriverDocument.find({ userId: req.userId }).populate('vehicleId');
    res.json({ success: true, documents });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches a single document's details.
 */
const getDocumentById = async (req, res, next) => {
  try {
    const doc = await DriverDocument.findOne({ _id: req.params.id, userId: req.userId }).populate('vehicleId');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    res.json({ success: true, document: doc });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing document's details.
 */
const updateDocument = async (req, res, next) => {
  try {
    const doc = await DriverDocument.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const { documentNumber, issueDate, expiryDate, vehicleId } = req.body;
    if (documentNumber) doc.documentNumber = documentNumber;

    // ── DATE VALIDATION ENGINE (on update) ────────────────────────────────────
    if (expiryDate || issueDate) {
      const effectiveIssue = issueDate || (doc.issueDate ? doc.issueDate.toISOString().split('T')[0] : null);
      const effectiveExpiry = expiryDate || (doc.expiryDate ? doc.expiryDate.toISOString().split('T')[0] : null);

      const dateValidation = validateDocumentDates(doc.documentType, effectiveIssue, effectiveExpiry);
      if (!dateValidation.valid) {
        return res.status(422).json({
          success: false,
          message: dateValidation.errors[0] || 'Invalid date combination.',
          errors: dateValidation.errors,
          warnings: dateValidation.warnings
        });
      }

      if (issueDate) doc.issueDate = new Date(issueDate);
      if (expiryDate) {
        doc.expiryDate = new Date(expiryDate);
        if (doc.expiryDate < new Date()) {
          doc.status = 'Expired';
        } else {
          const diffDays = Math.ceil((doc.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          doc.status = diffDays <= 30 ? 'Expiring Soon' : 'Valid';
        }
        // Flag unusual validity
        if (dateValidation.warnings.length > 0 && doc.status === 'Valid') {
          doc.status = 'Unusual Validity';
        }
      }
      doc.validityWarnings = dateValidation.warnings;
    }

    if (vehicleId !== undefined) doc.vehicleId = vehicleId || null;

    await doc.save();

    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);

    res.json({ success: true, document: doc, scores: updatedScores, validationWarnings: doc.validityWarnings || [] });

  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a document.
 */
const deleteDocument = async (req, res, next) => {
  try {
    const doc = await DriverDocument.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);
    res.json({ success: true, message: 'Document deleted successfully.', scores: updatedScores });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  ocrPreflight,
  ocrConfirm,
  createDocumentManual,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument
};
