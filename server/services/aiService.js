const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Executes a text generation prompt on Gemini with automatic model fallback.
 * Tries gemini-2.5-flash first, then switches to gemini-2.5-pro if unavailable.
 * @param {string} prompt - Input text prompt
 * @returns {Promise<string>} - Model text response
 */
const generateContentWithFallback = async (prompt) => {
  console.log("Prompt received");
  
  // Set of models to try in priority order
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro'];
  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`Attempting generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
        }
      });
      
      const response = await result.response;
      const text = response.text();
      
      console.log("Gemini response generated");
      return text;
    } catch (error) {
      console.error(`Error with model ${modelName}:`, error.message);
      lastError = error;
      console.log("Attempting automatic model fallback...");
    }
  }

  // If both models fail, log stack trace and throw
  console.error("Gemini AI API completely failed on all prioritized models.", lastError.stack);
  throw new Error(`Gemini AI service error: ${lastError.message}`);
};

/**
 * Handles conversational queries by compiling history into a single-pass context prompt.
 * Bypasses deprecated startChat / role:model state structures.
 */
const chat = async (message, history = []) => {
  let context = "You are an AI Smart Travel & Road Safety Platform Assistant. You help users with travel advice, road safety, routes, emergency guidance, traffic rules, and fine disputes. Be concise and professional.\n\n";
  
  if (history && history.length > 0) {
    context += "Conversational Context:\n";
    history.forEach(msg => {
      const roleName = msg.role === 'user' ? 'User' : 'Assistant';
      context += `${roleName}: ${msg.text}\n`;
    });
    context += "\n";
  }
  
  context += `User: ${message}\nAssistant:`;
  return await generateContentWithFallback(context);
};

/**
 * Uses Gemini to polish, resolve ambiguities, and classify fields extracted via Tesseract/Regex.
 */
const improveExtractedFields = async (parsedData) => {
  const prompt = `
You are a Traffic Fine Field Refiner. We scanned a traffic challan document and extracted some basic metadata using Regex and OCR.
Your job is to review the raw fields, improve text qualities, standardise values, classify violation categories, and return clean JSON.

Raw OCR Extracted Data:
- Fine Number: ${parsedData.fineNumber}
- Vehicle Plate: ${parsedData.vehicleNumber}
- Parsed Amount: ${parsedData.amount}
- Extracted Offense: ${parsedData.violationType}
- Location Found: ${parsedData.location}
- Raw OCR Text: ${parsedData.rawText ? parsedData.rawText.substring(0, 500) : ''}

Refining Rules:
1. "fineNumber": If the raw field is empty but you find a ticket number like structure in the Raw OCR Text, extract it. Keep it uppercase.
2. "vehicleNumber": Standardise Indian plates to "XX-00-XX-0000" format (e.g. TN-05-AB-1234). If plate is slightly corrupted (like TN05AB1234 or TN-O5-AB-l234), correct character typos (like 'O' to '0', 'l' to '1').
3. "amount": Clean currency. Return a standard raw number (e.g. 500). Remove symbols like Rs., ₹.
4. "violationType": Classify the violation type strictly into one of these standard classifications:
   ["Speeding", "No Helmet", "Signal Jump", "Wrong Parking", "Seat Belt Violation", "Driving Without License", "No Pollution Under Control (PUC)", "Reckless Driving"].
5. "issueDate": Format to YYYY-MM-DD.
6. "dueDate": Format to YYYY-MM-DD. If none found, add 14 days to the issueDate.
7. "location": Clean up typographical errors in location name (e.g., capitalize properly).
8. "description": Write a highly professional 1-sentence legal summary of the violation.

Return ONLY a valid, plain JSON object, with NO Markdown wrapping, NO backticks, no wrap, just the raw JSON itself:
{
  "fineNumber": "...",
  "vehicleNumber": "...",
  "amount": ..., // Number
  "violationType": "...",
  "issueDate": "...",
  "dueDate": "...",
  "location": "...",
  "description": "..."
}

If any value is completely missing and cannot be inferred, return an empty string "" (or null for amount). NEVER insert fake pre-loaded or mock values.
`;

  const responseText = await generateContentWithFallback(prompt);
  const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  console.log("Gemini Parser Polish Completed. Parsed Fields:", cleanJson);
  return JSON.parse(cleanJson);
};

/**
 * Generates an actionable, professional driving safety briefing using Gemini AI.
 * Incorporates weather risks, fatigue levels, night risks, and GIS accident hotspots.
 */
const generateRouteSafetyAdvice = async (assessment) => {
  try {
    const prompt = `
You are an AI Route Safety & Fleet Compliance Risk Analyst. Analyze the following Route Safety Report metrics and compile a professional, highly practical, and actionable Driving Safety Briefing.

Trip Overview:
- Distance: ${assessment.distance} km
- Duration: ${Math.round(assessment.duration)} minutes
- Route Complexity: ${assessment.factors.routeComplexity}
- Highway Segment Ratio: ${assessment.factors.highwayPercentage}%
- Urban Segment Ratio: ${assessment.factors.urbanPercentage}%

Calculated Risk Assessment:
- Overall Safety Score: ${assessment.scores.safetyScore}/100
- Combined Risk Rating: ${assessment.scores.riskScore}/100
- Safety Classification: ${assessment.classification}
- Weather Threat Level: ${assessment.scores.weatherRisk}/30 (Current condition: "${assessment.factors.weather.summary}")
- Traffic Congestion Level: ${assessment.scores.trafficRisk}/25 (Current congestion: "${assessment.factors.traffic.level}")
- Driver Fatigue Warning: ${assessment.scores.fatigueRisk}/25 ("${assessment.factors.fatigue.recommendation}")
- Night Hazards Index: ${assessment.scores.nightRisk}/25 ("${assessment.factors.night.warning}")
- Accident Hotspot Encounters: ${assessment.scores.hotspotRisk}/30 (Found ${assessment.factors.hotspots.encounteredCount} major hotspots along corridor)
- Legal Compliance Risk Index: ${assessment.scores.legalComplianceRisk}/25 (Classification: "${assessment.factors.legalCompliance.classification}")

Accident Hotspots Detailed List:
${assessment.factors.hotspots.encounteredDetails.map((h, idx) => `${idx + 1}. ${h.name} (${h.severity} Danger) - Count: ${h.accidentCount} historical pileups. Description: "${h.description}"`).join('\n') || "None detected."}

Legal Enforcement Zones Detailed List:
${assessment.factors.legalCompliance.encounteredDetails.map((z, idx) => `${idx + 1}. ${z.name} (${z.type}) - Details: "${z.description}"`).join('\n') || "No speed cameras or enforcement zones detected."}

Optimal Departure Window Mapped by Departure Optimizer:
- Recommended Departure Time: ${assessment.departureOptimization.recommendedTime}
- Optimization Reasoning: ${assessment.departureOptimization.reason}

Analysis Requirements:
Please respond with a raw JSON object containing exactly the following keys, with NO markdown backticks, NO markdown wrapping, just the raw JSON itself:
{
  "summary": "A concise 2-sentence executive summary of the overall route safety and legal compliance state.",
  "riskExplanation": "A detailed 3-sentence technical breakdown explaining the primary threats (including weather, fatigue, hotspots, and active speed radar / enforcement checkpoints) and why they contributed to the risk score.",
  "safetyAdvice": [
    "Advice 1: Bulleted highly actionable driving precaution (e.g. speed thresholds, visibility lighting, spacing rules, compliance behavior at enforcement zones).",
    "Advice 2: Bulleted precaution.",
    "Advice 3: Bulleted precaution."
  ],
  "bestDepartureTime": "The optimized recommended departure time (e.g. ${assessment.departureOptimization.recommendedTime}) with a 1-sentence summary of why it's the safest option.",
  "alternativeSuggestions": "A constructive alternative suggestion (e.g. bypass routes, avoiding high-risk enforcement zones, or shifting travel times)."
}
`;

    const responseText = await generateContentWithFallback(prompt);
    let cleanJson = responseText.trim();
    
    // Strip potential markdown JSON code block wrappers
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    
    console.log("Gemini Route Assessment Polish Completed. Raw Output:", cleanJson);
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("[GEMINI EXCEPTION] Failed to compile Gemini safety briefing. Recovering with fallback brief...", error.message);
    
    // High-fidelity fallback recovery brief utilizing the computed safety score parameters
    return {
      summary: `This trip is currently rated as ${assessment.classification} with a safety score of ${assessment.scores.safetyScore}/100 and a Legal Compliance Risk rating of ${assessment.factors.legalCompliance.classification}.`,
      riskExplanation: `The calculated risk factor of ${assessment.scores.riskScore}% reflects active threat vectors, including weather indexes of ${assessment.scores.weatherRisk}/30, night visibility factors of ${assessment.scores.nightRisk}/25, fatigue thresholds of ${assessment.scores.fatigueRisk}/25, and a Legal Compliance exposure score of ${assessment.scores.legalComplianceRisk}/25.`,
      safetyAdvice: [
        `Adjust vehicle speed dynamically to match current road visibility and traffic flows.`,
        `Maintain continuous speed compliance at active speed radar corridors to prevent automated fine challans.`,
        `Observe helmet and traffic signal crossings diligently across all flagged red-light intersection cameras.`,
        `Maintain a safe 3-second braking buffer distance from trucks and larger commercial vehicles.`
      ],
      bestDepartureTime: `${assessment.departureOptimization.recommendedTime}. ${assessment.departureOptimization.reason}`,
      alternativeSuggestions: "If weather conditions deteriorate, consider taking public transit, delaying travel, or utilizing an alternate route that bypasses known high-density enforcement areas."
    };
  }
};

/**
 * Uses Gemini to parse a driver document and return standardized metadata.
 */
const extractDocumentFieldsFromOcr = async (rawText, documentType) => {
  const documentParser = require('./documentParser');
  
  // 1. First-pass: Fast Local Regex matching & confidence calculation
  const localParsed = documentParser.parseDocumentText(rawText, documentType);
  const { extracted, confidences } = localParsed;
  
  // Check if we need AI fallback refinement (i.e. are any key fields missing?)
  const missingFields = Object.keys(extracted).filter(key => !extracted[key]);
  
  if (missingFields.length === 0) {
    console.log("[HYBRID OCR PARSER] All fields extracted successfully via high-precision Regex. Skipping AI fallback.");
    return { extracted, confidences };
  }

  console.log(`[HYBRID OCR PARSER] Missing fields [${missingFields.join(', ')}]. Invoking Gemini AI fallback scanner...`);

  // Prompt Gemini to fill in the blanks
  const prompt = `
You are a Traffic Document Scanner. We scanned a driver document (${documentType}) and extracted raw text using OCR.
Our high-precision local regexes extracted the following:
${Object.keys(extracted).map(key => `- ${key}: ${extracted[key] || 'MISSING'}`).join('\n')}

Your job is to read the Raw OCR Text below, identify the missing values (${missingFields.join(', ')}), and resolve any typographical errors.

Raw OCR Text:
"${rawText.substring(0, 1000)}"

Parsing Rules:
1. "documentNumber": Find the core reference number:
   - For DL: Driving License number (e.g. DL-1420110012345 or TN-07-2015-0012932).
   - For RC: Registration/Plate number (e.g. TN-05-AB-1234) or Certificate number.
   - For Insurance: Policy number.
   - For PUC: Certificate number (e.g. TN0050012891).
2. "issueDate": Find the document's date of issue or start of coverage. Format strictly to YYYY-MM-DD.
3. "expiryDate": Find when the document expires or coverage ends. Format strictly to YYYY-MM-DD.
4. "vehicleNumber": If this is an RC, Insurance, or PUC, try to locate the linked vehicle registration plate number (e.g. TN-05-AB-1234).
5. "holderName" / "ownerName" / "insurerName": Extract these if applicable for the document type.

Return ONLY a valid, plain JSON object containing the finalized resolved fields, with NO Markdown wrapping, NO backticks:
{
  "documentNumber": "...",
  "issueDate": "...", // YYYY-MM-DD
  "expiryDate": "...", // YYYY-MM-DD
  "vehicleNumber": "...", // format XX-00-XX-0000 or empty string if not found/applicable
  "holderName": "...", // DL holder name
  "ownerName": "...", // RC owner name
  "policyNumber": "...", // Insurance policy number
  "certificateNumber": "...", // PUC certificate number
  "insurerName": "..." // Insurer company name
}

If any value is completely missing, return an empty string "". NEVER insert fake or pre-loaded dates or values.
`;

  try {
    const responseText = await generateContentWithFallback(prompt);
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    
    console.log("Gemini OCR refinement completed. Output:", cleanJson);
    const aiParsed = JSON.parse(cleanJson);

    // Merge AI extracted values and set confidence to 75% for AI-filled values
    Object.keys(extracted).forEach(key => {
      if (!extracted[key] && aiParsed[key]) {
        extracted[key] = aiParsed[key];
        confidences[key] = 75; // Reliable AI fallback confidence
      }
    });

    // Also populate specialized sub-fields if present
    const extraFields = ['holderName', 'ownerName', 'policyNumber', 'certificateNumber', 'insurerName'];
    extraFields.forEach(key => {
      if (aiParsed[key] && !extracted[key]) {
        extracted[key] = aiParsed[key];
        confidences[key] = 75;
      }
    });

    // Re-blend overall confidence rate
    const scoreKeys = Object.keys(confidences).filter(k => k !== 'overallOcr');
    let sum = 0;
    scoreKeys.forEach(k => { sum += confidences[k]; });
    confidences.overallOcr = Math.round(sum / scoreKeys.length);

    return { extracted, confidences };
  } catch (error) {
    console.error("[GEMINI EXCEPTION] OCR fallback refinement failed. Using local parsed values only...", error.message);
    return { extracted, confidences };
  }
};

module.exports = {
  chat,
  improveExtractedFields,
  generateRouteSafetyAdvice,
  extractDocumentFieldsFromOcr
};
