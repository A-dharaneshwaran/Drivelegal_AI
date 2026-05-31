/**
 * Parser utility to dynamically extract traffic ticket details from raw OCR text.
 * Strictly avoids fallback mocks or preloaded default values.
 */

const parseOcrText = (text) => {
  if (!text) {
    return {
      fineNumber: "",
      vehicleNumber: "",
      amount: "",
      violationType: "",
      issueDate: "",
      dueDate: "",
      location: "",
      description: "",
      rawText: ""
    };
  }

  // 1. Vehicle Number Regex (Indian plates like TN-05-AB-1234, DL-3C-AS-8872, MH12PQ9908)
  let vehicleNumber = "";
  const platePatterns = [
    /\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z][-\s]?[A-Z]{1,2}[-\s]?\d{4})\b/i, // DL-3C-AS-8872, DL3CAS8872
    /\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,2}[-\s]?\d{4})\b/i  // TN-05-AB-1234, MH-12-PQ-9908
  ];

  for (const pattern of platePatterns) {
    const match = text.match(pattern);
    if (match) {
      vehicleNumber = match[1].toUpperCase().replace(/[-\s]+/g, '-');
      break;
    }
  }

  // 2. Fine Number Regex (MH-2026-88021, DLCH9924)
  // Tighten matching constraints to prevent capturing adjacent general dictionary words like "Department"
  let fineNumber = "";
  const fineNoRegex = /(?:challan|fine|ticket|challanno|receipt|bill)\s*(?:number|no|id)\.?\s*[:#-]?\s*([A-Z0-9-]+)/i;
  const fineNoMatch = text.match(fineNoRegex);
  
  if (fineNoMatch) {
    fineNumber = fineNoMatch[1].trim();
  } else {
    // Structural fallback matcher - checks for standard challan shapes (e.g. MH-2026-88021 or KACH88721)
    const structMatch = text.match(/\b([A-Z]{2,4}-\d{4}-\d{5,8}|[A-Z]{4,6}\d{4,8})\b/i);
    if (structMatch) {
      fineNumber = structMatch[1].trim().toUpperCase();
    }
  }

  // 3. Amount (₹500, Rs. 500, INR 250)
  let amount = "";
  const amountRegex = /(?:rs\.?|inr|₹|amount|fine|penalty|total)\s*[:=]?\s*(\d{3,5})\b/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    amount = amountMatch[1];
  } else {
    const generalAmountMatch = text.match(/\b(250|500|1000|1500|2000|5000)\b/);
    if (generalAmountMatch) {
      amount = generalAmountMatch[1];
    }
  }

  // 4. Violation Type Classifications
  let violationType = "";
  const lowerText = text.toLowerCase();
  if (lowerText.includes("speed") || lowerText.includes("velocity") || lowerText.includes("fast")) {
    violationType = "Speeding";
  } else if (lowerText.includes("helmet") || lowerText.includes("headgear") || lowerText.includes("rider without")) {
    violationType = "No Helmet";
  } else if (lowerText.includes("signal") || lowerText.includes("red light") || lowerText.includes("red-light") || lowerText.includes("jumped")) {
    violationType = "Signal Jump";
  } else if (lowerText.includes("parking") || lowerText.includes("no park") || lowerText.includes("tow")) {
    violationType = "Wrong Parking";
  } else if (lowerText.includes("seatbelt") || lowerText.includes("seat belt") || lowerText.includes("harness")) {
    violationType = "Seat Belt Violation";
  } else if (lowerText.includes("license") || lowerText.includes("driving licence") || lowerText.includes("without dl")) {
    violationType = "Driving Without License";
  } else if (lowerText.includes("pollution") || lowerText.includes("puc") || lowerText.includes("emission")) {
    violationType = "No Pollution Under Control (PUC)";
  }

  // 5. Date Extractions (DD/MM/YYYY, YYYY-MM-DD, etc.)
  const dateRegex = /\b(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})\b/g;
  const allDates = [...text.matchAll(dateRegex)].map(m => m[1]);
  
  let issueDate = "";
  let dueDate = "";

  if (allDates.length > 0) {
    const normalizeDate = (dateStr) => {
      try {
        const parts = dateStr.split(/[-/\.]/);
        if (parts.length === 3) {
          let day, month, year;
          if (parts[0].length === 4) { // YYYY-MM-DD
            year = parts[0];
            month = parts[1];
            day = parts[2];
          } else { // DD-MM-YYYY or MM-DD-YYYY
            day = parts[0];
            month = parts[1];
            year = parts[2];
          }
          month = month.padStart(2, '0');
          day = day.padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {}
      return "";
    };

    issueDate = normalizeDate(allDates[0]);
    if (allDates.length > 1) {
      dueDate = normalizeDate(allDates[1]);
    } else {
      if (issueDate) {
        const d = new Date(issueDate);
        d.setDate(d.getDate() + 14);
        dueDate = d.toISOString().split('T')[0];
      }
    }
  }

  // 6. Location Extractions
  let location = "";
  const locationRegex = /(?:location|place|venue|at|near)\s*[:=]?\s*([a-zA-Z0-9\s,\.]+)(?=\n|$)/i;
  const locationMatch = text.match(locationRegex);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else {
    const streetRegex = /([a-zA-Z0-9\s]+(?:road|junction|street|flyover|circle|cross|bypass|toll))\b/i;
    const streetMatch = text.match(streetRegex);
    if (streetMatch) {
      location = streetMatch[1].trim();
    }
  }

  // 7. Description Extractions
  let description = "";
  const descRegex = /(?:description|offense|offence|remarks|reason|violation)\s*[:=]?\s*([a-zA-Z0-9\s,\.\(\)-]+)(?=\n|$)/i;
  const descMatch = text.match(descRegex);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  return {
    fineNumber,
    vehicleNumber,
    amount,
    violationType,
    issueDate,
    dueDate,
    location,
    description,
    rawText: text
  };
};

module.exports = {
  parseOcrText
};
