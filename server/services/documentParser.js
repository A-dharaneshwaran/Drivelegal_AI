/**
 * High-Accuracy Document Parser & Confidence Scoring System for Indian Traffic Documents.
 * Implements strict regex matching, keyword-adjacent heuristics, and hybrid LLM-fallback scores.
 */

// Valid Indian state/UT code prefixes
const STATE_PREFIX_PATTERN = '(AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TG|TN|TR|TS|UP|UK|UA|WB)';

// Common Indian Plate regex (e.g. TN-07-CS-9901, DL-03-C-1234)
const INDIAN_PLATE_REGEX = new RegExp('\\b' + STATE_PREFIX_PATTERN + '[-\\s]?(\\d{2})[-\\s]?([A-Z]{1,3})[-\\s]?(\\d{4})\\b', 'i');

// Strict Indian DL regex (e.g. TN07 20150012932, TN-07-2015-0012932)
const Strict_DL_REGEX = new RegExp('\\b' + STATE_PREFIX_PATTERN + '[-\\s]?(\\d{2})[-\\s]?(\\d{4})[-\\s]?(\\d{7})\\b', 'i');
const Generic_DL_REGEX = new RegExp('\\b' + STATE_PREFIX_PATTERN + '[-\\s]?[0-9A-Z\\s-]{12,18}\\b', 'i');

// Standard Date regex (matches DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
const DATE_REGEX = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b|\b(\d{4})[-/.](\d{2})[-/.](\d{2})\b/g;

/**
 * Standardizes an Indian registration plate string into standard XX-00-XX-0000 format.
 * @param {string} plate - Raw plate text
 * @returns {string} - Clean formatted plate
 */
const standardizePlateNumber = (plate) => {
  if (!plate) return '';
  const match = plate.match(INDIAN_PLATE_REGEX);
  if (match) {
    return `${match[1].toUpperCase()}-${match[2]}-${match[3].toUpperCase()}-${match[4]}`;
  }
  return plate.toUpperCase().replace(/\s+/g, '-');
};

/**
 * Parses Driving License (DL) details.
 */
const parseDrivingLicense = (text) => {
  const extracted = {
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    holderName: ''
  };
  const confidences = {
    documentNumber: 0,
    issueDate: 0,
    expiryDate: 0,
    holderName: 0
  };

  const lines = text.split('\n');

  // 1. License Number Match
  const strictMatch = text.match(Strict_DL_REGEX);
  if (strictMatch) {
    extracted.documentNumber = `${strictMatch[1].toUpperCase()}-${strictMatch[2]}-${strictMatch[3]}-${strictMatch[4]}`;
    confidences.documentNumber = 98;
  } else {
    const genericMatch = text.match(Generic_DL_REGEX);
    if (genericMatch) {
      extracted.documentNumber = genericMatch[0].toUpperCase().replace(/\s+/g, '-');
      confidences.documentNumber = 80;
    }
  }

  // 2. Dates Extraction (Issue & Expiry)
  const allDates = [];
  let dateMatch;
  while ((dateMatch = DATE_REGEX.exec(text)) !== null) {
    allDates.push(dateMatch[0]);
  }
  // Reset regex state
  DATE_REGEX.lastIndex = 0;

  // Search keyword locations for issue/expiry dates
  lines.forEach(line => {
    const lower = line.toLowerCase();
    const lineDates = line.match(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b|\b\d{4}[-/.]\d{2}[-/.]\d{2}\b/g);
    if (lineDates && lineDates.length > 0) {
      const matchDate = lineDates[0];
      if (lower.includes('issue') || lower.includes('from') || lower.includes('doi')) {
        extracted.issueDate = matchDate;
        confidences.issueDate = 85;
      }
      if (lower.includes('expiry') || lower.includes('valid') || lower.includes('till') || lower.includes('exp')) {
        extracted.expiryDate = matchDate;
        confidences.expiryDate = 90;
      }
    }
  });

  // Date fallbacks from collected list
  if (allDates.length > 0) {
    if (!extracted.issueDate) {
      extracted.issueDate = allDates[0];
      confidences.issueDate = 60;
    }
    if (!extracted.expiryDate && allDates.length > 1) {
      extracted.expiryDate = allDates[allDates.length - 1];
      confidences.expiryDate = 60;
    }
  }

  // 3. Holder Name Matching
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (lower.includes('name') && !lower.includes('father') && !lower.includes('licence')) {
      const parts = line.split(/[:\-]/);
      if (parts.length > 1 && parts[1].trim().length > 3) {
        extracted.holderName = parts[1].trim();
        confidences.holderName = 85;
      } else if (idx + 1 < lines.length && lines[idx+1].trim().length > 4) {
        // Try next line if labeled but empty
        extracted.holderName = lines[idx+1].trim();
        confidences.holderName = 80;
      }
    }
  });

  return { extracted, confidences };
};

/**
 * Parses Registration Certificate (RC Book) details.
 */
const parseRCBook = (text) => {
  const extracted = {
    documentNumber: '',
    ownerName: '',
    vehicleNumber: '',
    issueDate: ''
  };
  const confidences = {
    documentNumber: 0,
    ownerName: 0,
    vehicleNumber: 0,
    issueDate: 0
  };

  const lines = text.split('\n');

  // 1. Vehicle Registration Plate Number
  const plateMatch = text.match(INDIAN_PLATE_REGEX);
  if (plateMatch) {
    extracted.vehicleNumber = standardizePlateNumber(plateMatch[0]);
    extracted.documentNumber = extracted.vehicleNumber; // For RC, registration number serves as doc number
    confidences.vehicleNumber = 98;
    confidences.documentNumber = 95;
  }

  // 2. Registration Date (Issue Date)
  lines.forEach(line => {
    const lower = line.toLowerCase();
    const lineDates = line.match(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b|\b\d{4}[-/.]\d{2}[-/.]\d{2}\b/g);
    if (lineDates && lineDates.length > 0) {
      if (lower.includes('reg') || lower.includes('date') || lower.includes('doi') || lower.includes('issue')) {
        extracted.issueDate = lineDates[0];
        confidences.issueDate = 85;
      }
    }
  });

  // 3. Owner Name
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (lower.includes('owner') || lower.includes('name')) {
      const parts = line.split(/[:\-]/);
      if (parts.length > 1 && parts[1].trim().length > 3) {
        extracted.ownerName = parts[1].trim();
        confidences.ownerName = 85;
      } else if (idx + 1 < lines.length && lines[idx+1].trim().length > 4) {
        extracted.ownerName = lines[idx+1].trim();
        confidences.ownerName = 80;
      }
    }
  });

  return { extracted, confidences };
};

/**
 * Parses Vehicle Insurance policy details.
 */
const parseInsurance = (text) => {
  const extracted = {
    documentNumber: '',
    vehicleNumber: '',
    expiryDate: '',
    insurerName: ''
  };
  const confidences = {
    documentNumber: 0,
    vehicleNumber: 0,
    expiryDate: 0,
    insurerName: 0
  };

  const lines = text.split('\n');

  // 1. Policy / Certificate Document Number
  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.includes('policy') || lower.includes('cert') || lower.includes('policy no')) {
      // Find matches for standard policy code formats (length 8-25)
      const match = line.match(/[A-Z0-9/\-]{8,25}/i);
      if (match && !lower.includes('vehicle') && !lower.includes('plate')) {
        extracted.documentNumber = match[0].toUpperCase();
        confidences.documentNumber = 90;
      }
    }
  });

  // 2. Vehicle Plate Number
  const plateMatch = text.match(INDIAN_PLATE_REGEX);
  if (plateMatch) {
    extracted.vehicleNumber = standardizePlateNumber(plateMatch[0]);
    confidences.vehicleNumber = 98;
  }

  // 3. Expiry Date (Insurance Period End)
  lines.forEach(line => {
    const lower = line.toLowerCase();
    const lineDates = line.match(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b|\b\d{4}[-/.]\d{2}[-/.]\d{2}\b/g);
    if (lineDates && lineDates.length > 0) {
      if (lower.includes('expiry') || lower.includes('valid') || lower.includes('to') || lower.includes('till') || lower.includes('exp')) {
        extracted.expiryDate = lineDates[lineDates.length - 1]; // To date is usually expiry
        confidences.expiryDate = 90;
      }
    }
  });

  // 4. Insurer Name scanning
  const commonInsurers = [
    'ICICI Lombard', 'HDFC ERGO', 'New India Assurance', 'United India', 'Tata AIG',
    'LIC', 'National Insurance', 'Bajaj Allianz', 'Acko', 'Digit', 'SBI General',
    'Reliance General', 'Chola MS', 'IFFCO Tokio', 'Royal Sundaram'
  ];
  
  commonInsurers.forEach(insurer => {
    const escaped = insurer.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'i');
    if (regex.test(text)) {
      extracted.insurerName = insurer;
      confidences.insurerName = 95;
    }
  });

  return { extracted, confidences };
};

/**
 * Parses Pollution Under Control (PUC) certificate details.
 */
const parsePUC = (text) => {
  const extracted = {
    documentNumber: '',
    vehicleNumber: '',
    expiryDate: ''
  };
  const confidences = {
    documentNumber: 0,
    vehicleNumber: 0,
    expiryDate: 0
  };

  const lines = text.split('\n');

  // 1. Certificate Number
  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.includes('cert') || lower.includes('puc no') || lower.includes('sl no')) {
      const match = line.match(/[A-Z0-9\-]{8,20}/i);
      if (match && !lower.includes('vehicle') && !lower.includes('plate')) {
        extracted.documentNumber = match[0].toUpperCase();
        confidences.documentNumber = 90;
      }
    }
  });

  // 2. Vehicle Plate Number
  const plateMatch = text.match(INDIAN_PLATE_REGEX);
  if (plateMatch) {
    extracted.vehicleNumber = standardizePlateNumber(plateMatch[0]);
    confidences.vehicleNumber = 98;
  }

  // 3. Expiry Date
  lines.forEach(line => {
    const lower = line.toLowerCase();
    const lineDates = line.match(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b|\b\d{4}[-/.]\d{2}[-/.]\d{2}\b/g);
    if (lineDates && lineDates.length > 0) {
      if (lower.includes('valid') || lower.includes('expiry') || lower.includes('till') || lower.includes('exp')) {
        extracted.expiryDate = lineDates[0];
        confidences.expiryDate = 90;
      }
    }
  });

  return { extracted, confidences };
};

/**
 * Core Orchestrator that chooses the parser based on type,
 * handles confidence calculation blending, and returns unified metadata.
 * @param {string} text - Raw OCR text
 * @param {string} documentType - 'DL' | 'RC' | 'Insurance' | 'PUC'
 * @returns {Object} - Parsed fields & field confidence ratings
 */
const parseDocumentText = (text, documentType) => {
  let parsed;
  if (documentType === 'DL') {
    parsed = parseDrivingLicense(text);
  } else if (documentType === 'RC') {
    parsed = parseRCBook(text);
  } else if (documentType === 'Insurance') {
    parsed = parseInsurance(text);
  } else {
    parsed = parsePUC(text);
  }

  // Calculate Overall OCR Blended Confidence
  const values = Object.values(parsed.confidences);
  const overall = values.length > 0 
    ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
    : 0;

  parsed.confidences.overallOcr = overall;

  return parsed;
};

module.exports = {
  parseDocumentText,
  standardizePlateNumber
};
