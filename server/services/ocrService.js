const { createWorker } = require('tesseract.js');
const Jimp = require('jimp');

// Keywords commonly found in Indian driving licenses, RCs, insurance, and PUC certificates
const DOCUMENT_KEYWORDS = [
  'license', 'licence', 'driving', 'card', 'authority', 'union', 'india', 'name', 'dob',
  'registration', 'certificate', 'owner', 'chassis', 'engine', 'fuel', 'maker', 'plate',
  'policy', 'insurance', 'insurer', 'premium', 'validity', 'period', 'expiry', 'expired',
  'pollution', 'puc', 'emission', 'carbon', 'testing', 'smoke', 'challan', 'ticket'
];

/**
 * Calculates keyword matches to determine text readability and orientation correctness.
 * @param {string} text - Raw OCR text
 * @returns {number} - Count of keyword matches
 */
const getKeywordCount = (text) => {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  DOCUMENT_KEYWORDS.forEach(word => {
    if (lower.includes(word)) {
      count++;
    }
  });
  return count;
};

/**
 * Preprocesses an image buffer using Jimp:
 * 1. Grayscale conversion to strip chromatic noise.
 * 2. Dynamic resolution upscaling if width is small.
 * 3. Channel normalization.
 * 4. Contrast boost and thresholding.
 * 5. Blur smoothing to remove jagged character artifacts.
 * @param {Buffer} fileBuffer - Input image raw binary buffer
 * @returns {Promise<Buffer>} - Preprocessed PNG image buffer
 */
const preprocessImage = async (fileBuffer) => {
  try {
    console.log("[JIMP PREPROCESSOR] Reading image buffer pixels...");
    const image = await Jimp.read(fileBuffer);

    // 1. Convert to grayscale
    image.greyscale();

    // 2. Scale resolution if low-res (upscale to increase character pixel density)
    if (image.bitmap.width < 1200) {
      const scaleFactor = 2;
      console.log(`[JIMP PREPROCESSOR] Low resolution detected (${image.bitmap.width}px). Resizing 2x...`);
      image.resize(image.bitmap.width * scaleFactor, Jimp.AUTO);
    }

    // 3. Normalization and contrast boost
    image.normalize();
    image.contrast(0.4);

    // 4. Smooth binarized borders with a minimal blur
    image.blur(1);

    // Save as PNG buffer for Tesseract ingestion
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    console.log("[JIMP PREPROCESSOR] Preprocessing pipeline applied successfully.");
    return processedBuffer;
  } catch (err) {
    console.warn("[JIMP PREPROCESSOR WARNING] Preprocess failed or file format not supported. Ingesting raw buffer...", err.message);
    return fileBuffer;
  }
};

/**
 * Extracts raw text from an image buffer with dynamic image enhancements
 * and keyword-density heuristic auto-rotation correction.
 * @param {Buffer} fileBuffer - Binary raw buffer
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromBuffer = async (fileBuffer) => {
  console.log("OCR pipeline triggered");
  
  if (!fileBuffer || fileBuffer.length < 4) {
    throw new Error("Invalid file content. Upload buffer is empty or corrupted.");
  }

  // Pre-validate file signature (magic bytes) to prevent WASM thread-level crashes
  const hexSignature = fileBuffer.slice(0, 4).toString('hex').toUpperCase();
  
  const isPng = hexSignature === '89504E47';
  const isJpg = hexSignature.startsWith('FFD8');
  const isPdf = hexSignature === '25504446'; // %PDF
  
  if (!isPng && !isJpg && !isPdf) {
    console.warn(`[OCR FILTER] Rejected file buffer with invalid header signature: 0x${hexSignature}`);
    throw new Error("Unsupported document format. Please upload a valid PNG, JPG, or PDF file.");
  }

  // PDF Text Extraction Fallback: If it's a PDF, we can parse it as a string directly if it's text-based
  if (isPdf) {
    console.log("PDF File detected. Reading text stream...");
    const pdfText = fileBuffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (pdfText.includes("Challan") || pdfText.includes("Ticket") || pdfText.includes("Plate") || pdfText.includes("Vehicle") || pdfText.includes("License")) {
      console.log("OCR completed (PDF Stream)");
      return pdfText;
    }
  }

  // Apply visual enhancements using Jimp
  const preprocessedBuffer = await preprocessImage(fileBuffer);

  // Spawn dedicated Tesseract worker
  const worker = await createWorker('eng');
  
  try {
    console.log("Tesseract worker thread spawned successfully.");
    
    // First Scan: Test unrotated preprocessed image
    console.log("[OCR SCAN] Running primary scan...");
    let { data: { text, confidence } } = await worker.recognize(preprocessedBuffer);
    let matchCount = getKeywordCount(text);
    console.log(`[OCR RESULT] Primary scan keyword matches: ${matchCount} | Text length: ${text?.length || 0}`);

    // If keywords are low (< 3 matches) and the file is an image, attempt auto-rotation checks
    if (matchCount < 3 && !isPdf) {
      console.log("[OCR AUTO-ROTATION] Document readability is low. Attempting rotational scans...");
      
      const rotations = [90, 180, 270];
      let bestText = text || '';
      let bestMatchCount = matchCount;
      let bestAngle = 0;

      for (const angle of rotations) {
        try {
          console.log(`[OCR AUTO-ROTATION] Simulating Jimp rotation: ${angle}°`);
          const imgObj = await Jimp.read(preprocessedBuffer);
          imgObj.rotate(angle);
          const rotatedBuffer = await imgObj.getBufferAsync(Jimp.MIME_PNG);

          const { data: { text: rotText } } = await worker.recognize(rotatedBuffer);
          const rotMatches = getKeywordCount(rotText);
          console.log(`[OCR AUTO-ROTATION RESULT] Angle: ${angle}° | Keywords matched: ${rotMatches}`);

          if (rotMatches > bestMatchCount) {
            bestMatchCount = rotMatches;
            bestText = rotText;
            bestAngle = angle;
          }
        } catch (rotErr) {
          console.warn(`[OCR AUTO-ROTATION WARNING] Rotation ${angle}° failed:`, rotErr.message);
        }
      }

      if (bestAngle > 0) {
        console.log(`[OCR AUTO-ROTATION SUCCESS] Re-aligned orientation dynamically by ${bestAngle}° | New keywords: ${bestMatchCount}`);
        text = bestText;
      } else {
        console.log("[OCR AUTO-ROTATION] Base orientation yielded highest density. Maintaining default scan.");
      }
    }

    console.log("OCR completed successfully.");
    return text || '';
  } catch (error) {
    console.error("OCR Worker Processing Exception:", error);
    throw new Error(`OCR execution failed: ${error.message}`);
  } finally {
    // Terminate worker thread to prevent Node heap leaks
    await worker.terminate();
    console.log("Tesseract worker terminated successfully. Memory resources released.");
  }
};

module.exports = {
  preprocessImage,
  extractTextFromBuffer
};
