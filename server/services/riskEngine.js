const axios = require('axios');
const AccidentHotspot = require('../models/AccidentHotspot');
const EnforcementZone = require('../models/EnforcementZone');

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 */
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

/**
 * Dynamically fetches weather conditions for coordinates using keyless Open-Meteo API.
 */
const fetchWeatherMetrics = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const response = await axios.get(url, { timeout: 3000 });
    
    if (response.data && response.data.current_weather) {
      const { temperature, windspeed, weathercode } = response.data.current_weather;
      return { temperature, windspeed, weathercode, fallback: false };
    }
  } catch (error) {
    console.warn(`[WEATHER API WARNING] Fetch failed. Using regional defaults:`, error.message);
  }
  
  // Static regional default — used only when API is unreachable
  return { temperature: 28, windspeed: 12, weathercode: 1, fallback: true };
};

/**
 * Evaluates weather parameters and returns risk value + warnings list.
 */
const calculateWeatherRisk = (weather) => {
  let score = 0;
  const warnings = [];

  const temp = weather.temperature;
  const wind = weather.windspeed;
  const code = weather.weathercode;

  // Map WMO Weather Codes to hazards
  if (code >= 95 && code <= 99) { // Thunderstorm
    score += 30;
    warnings.push("Active Severe Thunderstorms — Avoid high-risk highways due to flooding and lightning hazards.");
  } else if (code >= 45 && code <= 48) { // Fog
    score += 25;
    warnings.push("Dense Fog Alert — Extreme visibility reductions. Switch on fog lights and drive slow.");
  } else if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) { // Rain / Showers
    score += 20;
    warnings.push("Moderate to Heavy Rain Detected — Slippery roads and hydroplaning risks active.");
  } else if (code >= 51 && code <= 55) { // Drizzle
    score += 10;
    warnings.push("Drizzle and Light Mist — Roadways may be slick. Observe speed limits.");
  }

  // Wind speed checks
  if (wind > 40) {
    score += 15;
    warnings.push("High Winds Advisory — Speed exceeds 40 km/h. High-sided vehicles must use extra caution.");
  }

  // Extreme temperatures
  if (temp > 38) {
    score += 10;
    warnings.push("Extreme Heatwave Alert — Ambient temperature exceeds 38°C. Check engine coolant levels.");
  } else if (temp < 5) {
    score += 10;
    warnings.push("Near Freezing Road Warning — Low temperatures may impact tire traction.");
  }

  return {
    score: Math.min(score, 30), // capped at 30 points max contribution
    warnings,
    summary: warnings.length > 0 ? warnings[0] : "Clear skies and ideal weather conditions."
  };
};

/**
 * Evaluates simulated/api traffic densities
 */
const calculateTrafficRisk = (trafficLevel) => {
  const levels = {
    'Low': { score: 0, desc: "Optimal vehicle flow. Traffic congestion is negligible." },
    'Medium': { score: 5, desc: "Moderate traffic grids. Expect minor bottlenecks at junctions." },
    'High': { score: 15, desc: "Dense traffic congestion. Significant speed delays at bottleneck points." },
    'Severe': { score: 25, desc: "Gridlock conditions. Stationary bumper-to-bumper queue flows." }
  };
  return levels[trafficLevel] || levels['Low'];
};

/**
 * Scans route coordinates against AccidentHotspots in the database using Haversine GIS ranges.
 */
const evaluateAccidentHotspots = async (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return { score: 0, encountered: [], nearestSpot: null, nearestDistance: null };
  }

  const hotspots = await AccidentHotspot.find();
  const encounteredIds = new Set();
  let nearestDistance = Infinity;
  let nearestSpot = null;

  // Step downsample processing to ensure backend speeds are sub-100ms even under long routes
  const step = coordinates.length > 300 ? Math.ceil(coordinates.length / 50) : coordinates.length > 100 ? 3 : 1;

  for (let i = 0; i < coordinates.length; i += step) {
    const [lon, lat] = coordinates[i];

    for (const spot of hotspots) {
      const dist = getHaversineDistance(lat, lon, spot.latitude, spot.longitude);
      
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestSpot = spot;
      }

      // Flag a hotspot encounter if route coordinate falls within a 2.0 km danger envelope
      if (dist <= 2.0) {
        encounteredIds.add(spot._id.toString());
      }
    }
  }

  // Compile full information on unique hotspots traversed
  const encounteredHotspots = hotspots.filter(s => encounteredIds.has(s._id.toString()));

  // Calculate score contribution based on hotspot count and severities
  let score = 0;
  encounteredHotspots.forEach(spot => {
    if (spot.severity === 'Critical') score += 15;
    else if (spot.severity === 'High') score += 10;
    else score += 5;
  });

  return {
    score: Math.min(score, 30), // capped at 30 points max contribution
    encountered: encounteredHotspots,
    nearestSpot,
    nearestDistance: nearestDistance === Infinity ? null : Number(nearestDistance.toFixed(2))
  };
};

/**
 * Scans route coordinates against EnforcementZones in the database using Haversine GIS envelopes.
 */
const evaluateEnforcementZones = async (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return { score: 0, encountered: [] };
  }

  const zones = await EnforcementZone.find();
  const encounteredIds = new Set();
  
  // Downsample coordinates
  const step = coordinates.length > 300 ? Math.ceil(coordinates.length / 50) : coordinates.length > 100 ? 3 : 1;

  for (let i = 0; i < coordinates.length; i += step) {
    const [lon, lat] = coordinates[i];

    for (const zone of zones) {
      const dist = getHaversineDistance(lat, lon, zone.latitude, zone.longitude);
      
      if (dist <= 2.0) { // 2.0 km radar scan envelopes
        encounteredIds.add(zone._id.toString());
      }
    }
  }

  const encounteredZones = zones.filter(z => encounteredIds.has(z._id.toString()));

  // Deduct risk scores based on enforcement types
  let score = 0;
  encounteredZones.forEach(zone => {
    if (zone.type === 'speed_enforcement') score += 10; // Speed check radar (+10)
    else if (zone.type === 'helmet_enforcement') score += 10; // Helmet compliance (+10)
    else if (zone.type === 'red_light_camera') score += 10; // Traffic signal crossing (+10)
    else if (zone.type === 'parking_enforcement') score += 10; // No parking enforcement sweeps (+10)
  });

  return {
    score: Math.min(score, 25), // capped at 25 points maximum
    encountered: encounteredZones
  };
};

/**
 * Evaluates fatigue risks based on overall trip duration
 */
const calculateFatigueRisk = (durationMinutes) => {
  const hours = durationMinutes / 60;
  let score = 0;
  let recommendation = "Drive safely and remain focused.";

  if (hours > 6) {
    score = 25;
    recommendation = "☕ CRITICAL FATIGUE WARNING: Trip exceeds 6 hours. Take a 30-minute rest break every 2 hours. Switch drivers if possible.";
  } else if (hours > 4) {
    score = 15;
    recommendation = "☕ HIGH FATIGUE WARNING: Trip exceeds 4 hours. Stop at a highway rest station for a 20-minute refreshment pause.";
  } else if (hours > 2) {
    score = 5;
    recommendation = "☕ MODERATE FATIGUE: Trip exceeds 2 hours. Take a quick 10-minute stretch break before driving further.";
  }

  return { score, recommendation };
};

/**
 * Evaluates night driving hazards based on departure timestamps
 */
const calculateNightRisk = (departureTimeStr) => {
  let score = 0;
  let warning = "Daylight transit conditions. Optimal driving visibility.";

  if (!departureTimeStr) return { score, warning };

  try {
    // Expecting departureTimeStr as standard HH:MM
    const [hourStr] = departureTimeStr.split(':');
    const hour = parseInt(hourStr, 10);

    if (hour >= 2 && hour < 5) { // Midnight to Pre-dawn (highest drowsiness risk)
      score = 25;
      warning = "🌙 CRITICAL NIGHT RISK: High drowsiness and poor highway ambient light. Drive with high-beam assistance and stay alert.";
    } else if (hour >= 22 || hour < 2) { // Late Night
      score = 15;
      warning = "🌙 HIGH NIGHT RISK: Low visual visibility. Watch out for slow-moving trucks and transport trailers without reflectors.";
    } else if (hour >= 18 && hour < 22) { // Twilight / Evening Rush
      score = 5;
      warning = "🌙 MODERATE NIGHT RISK: Evening twilight glare. Heavy passenger traffic moving simultaneously.";
    }
  } catch (error) {
    console.error("[NIGHT RISK ERROR] Failed to parse departure hour:", error.message);
  }

  return { score, warning };
};

/**
 * Computes overall audit reliability confidence percentages (0-100).
 */
const calculateAnalysisConfidence = (weatherCode, coordinates, weatherFallback = false) => {
  let confidence = 100;

  // 1. Weather data check — if API failed and fallback defaults were used, reduce confidence
  if (weatherFallback) {
    confidence -= 15; // Reverted to simulated fallback parameters
  }

  // 2. Traffic transparency disclosure: estimated traffic deductions
  confidence -= 5;

  // 3. Route geometry completeness check
  if (!coordinates || coordinates.length < 10) {
    confidence -= 10;
  }

  let rating = "Excellent";
  if (confidence < 50) rating = "Limited Data";
  else if (confidence < 70) rating = "Moderate";
  else if (confidence < 90) rating = "Good";

  return {
    score: Math.max(confidence, 10),
    rating
  };
};

/**
 * DepartureOptimizer algorithm evaluating combined risk scores across 6 hours.
 */
const runDepartureOptimizer = (baseScores) => {
  const slots = [
    { time: "06:00 AM", traffic: 5, night: 0, desc: "lowest traffic queues, bright daylight conditions, and low drowsiness fatigue." },
    { time: "09:00 AM", traffic: 20, night: 0, desc: "heavy morning peak rush-hour transit bottlenecks." },
    { time: "12:00 PM", traffic: 10, night: 0, desc: "standard midday traffic flows with high midday sun visibility." },
    { time: "03:00 PM", traffic: 10, night: 0, desc: "stable traffic densities, but watch for rising afternoon driving drowsiness." },
    { time: "06:00 PM", traffic: 25, night: 5, desc: "critical evening rush-hour gridlock and twilight sunset glare." },
    { time: "09:00 PM", traffic: 10, night: 15, desc: "lower traffic congestion but high night-driving visibility hazards." }
  ];

  let optimalSlot = slots[0];
  let lowestRisk = Infinity;

  const weatherRisk = baseScores.weatherRisk;
  const fatigueRisk = baseScores.fatigueRisk;
  const hotspotRisk = baseScores.hotspotRisk;
  const legalRisk = baseScores.legalRisk;

  slots.forEach(slot => {
    // Combine base scores with slot-specific traffic and night risk offsets
    const combinedRisk = weatherRisk + slot.traffic + fatigueRisk + slot.night + hotspotRisk + legalRisk;
    if (combinedRisk < lowestRisk) {
      lowestRisk = combinedRisk;
      optimalSlot = slot;
    }
  });

  return {
    recommendedTime: optimalSlot.time,
    reason: `Recommended departure at ${optimalSlot.time} provides the safest transit window with ${optimalSlot.desc}`
  };
};

/**
 * Computes all safety risks and compiles the final normalized scores ledger.
 */
const compileSafetyAssessment = async (routeData, params) => {
  const { coordinates, distance, duration } = routeData;
  const { departureTime, trafficLevel = 'Low' } = params;

  // 1. Fetch destination weather parameters
  const destCoords = coordinates[coordinates.length - 1]; // [lon, lat]
  const weatherData = await fetchWeatherMetrics(destCoords[1], destCoords[0]);
  const weatherFallback = weatherData.fallback === true;
  
  // 2. Resolve individual scores
  const weatherAssess = calculateWeatherRisk(weatherData);
  const trafficAssess = calculateTrafficRisk(trafficLevel);
  const fatigueAssess = calculateFatigueRisk(duration);
  const nightAssess = calculateNightRisk(departureTime);
  const hotspotAssess = await evaluateAccidentHotspots(coordinates);
  const legalAssess = await evaluateEnforcementZones(coordinates);

  // 3. Compile audit reliability confidence percentage
  const confidenceAssess = calculateAnalysisConfidence(weatherData.weathercode, coordinates, weatherFallback);


  // 4. Trigger DepartureOptimizer across all 6 slots
  const optimization = runDepartureOptimizer({
    weatherRisk: weatherAssess.score,
    fatigueRisk: fatigueAssess.score,
    hotspotRisk: hotspotAssess.score,
    legalRisk: legalAssess.score
  });

  // 5. Aggregate total risk points (max possible accumulation: 30 + 25 + 25 + 25 + 30 + 25 = 160 points)
  const rawRiskSum = weatherAssess.score + trafficAssess.score + fatigueAssess.score + nightAssess.score + hotspotAssess.score + legalAssess.score;
  
  // 6. Normalize raw points out of 130 max realistic points to 0-100 risk score
  const riskScore = Math.min(Math.round((rawRiskSum / 130) * 100), 100);
  const safetyScore = 100 - riskScore;

  // 7. Classify Safety Ratings
  let classification = "Very Safe";
  let color = "emerald";
  
  if (safetyScore <= 20) {
    classification = "Critical";
    color = "rose";
  } else if (safetyScore <= 40) {
    classification = "High Risk";
    color = "orange";
  } else if (safetyScore <= 60) {
    classification = "Moderate";
    color = "amber";
  } else if (safetyScore <= 80) {
    classification = "Safe";
    color = "sky";
  }

  // 8. Classify Legal Compliance exposures
  let legalClassification = "Low";
  if (legalAssess.score >= 20) legalClassification = "Critical";
  else if (legalAssess.score >= 13) legalClassification = "High";
  else if (legalAssess.score >= 6) legalClassification = "Medium";

  // 9. Estimate Segment Complexities (Highway/Urban splits)
  const highwayPercentage = distance > 100 ? 80 : distance > 30 ? 60 : 30;
  const urbanPercentage = 100 - highwayPercentage;
  const routeComplexity = coordinates.length > 200 ? 'High' : coordinates.length > 80 ? 'Medium' : 'Low';

  return {
    scores: {
      safetyScore,
      riskScore,
      weatherRisk: weatherAssess.score,
      trafficRisk: trafficAssess.score,
      fatigueRisk: fatigueAssess.score,
      nightRisk: nightAssess.score,
      hotspotRisk: hotspotAssess.score,
      legalComplianceRisk: legalAssess.score,
      analysisConfidence: confidenceAssess.score
    },
    classification,
    color,
    confidenceRating: confidenceAssess.rating,
    departureOptimization: optimization,
    factors: {
      routeComplexity,
      highwayPercentage,
      urbanPercentage,
      weather: {
        ...weatherData,
        summary: weatherAssess.summary,
        warnings: weatherAssess.warnings
      },
      traffic: {
        level: trafficLevel,
        desc: trafficAssess.desc
      },
      fatigue: fatigueAssess,
      night: nightAssess,
      legalCompliance: {
        score: legalAssess.score,
        classification: legalClassification,
        encounteredCount: legalAssess.encountered.length,
        encounteredDetails: legalAssess.encountered
      },
      hotspots: {
        encounteredCount: hotspotAssess.encountered.length,
        encounteredDetails: hotspotAssess.encountered,
        nearestSpot: hotspotAssess.nearestSpot,
        nearestDistance: hotspotAssess.nearestDistance
      }
    }
  };
};

module.exports = {
  compileSafetyAssessment
};
