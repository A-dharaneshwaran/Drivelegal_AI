const AccidentHotspot = require('../models/AccidentHotspot');
const EnforcementZone = require('../models/EnforcementZone');

const SEED_HOTSPOTS = [
  {
    name: "Silk Board Junction ORR",
    state: "Karnataka",
    latitude: 12.9176,
    longitude: 77.6244,
    severity: "High",
    accidentCount: 48,
    description: "Heavy congestion bottleneck. High rate of minor rear-end collisions and two-wheeler bumper-to-bumper crashes."
  },
  {
    name: "Marathahalli Bridge Intersection",
    state: "Karnataka",
    latitude: 12.9562,
    longitude: 77.7011,
    severity: "Moderate",
    accidentCount: 29,
    description: "Frequent accidents involving two-wheelers merging into high-speed lanes without warning."
  },
  {
    name: "Kathipara Flyover Cloverleaf",
    state: "Tamil Nadu",
    latitude: 13.0063,
    longitude: 80.2019,
    severity: "Moderate",
    accidentCount: 22,
    description: "Complex multi-level cloverleaf intersection. Frequent lane-drifting and side-swipe collisions."
  },
  {
    name: "Maduravoyal Bypass Interchange NH-4",
    state: "Tamil Nadu",
    latitude: 13.0682,
    longitude: 80.1610,
    severity: "Critical",
    accidentCount: 64,
    description: "Heavy freight truck corridor. High incidence of fatal night-time pileups due to low visibility and high speeds."
  },
  {
    name: "Goregaon Western Express Highway Junction",
    state: "Maharashtra",
    latitude: 19.1634,
    longitude: 72.8512,
    severity: "High",
    accidentCount: 53,
    description: "Major arterial bottleneck. Prone to severe aquaplaning and skid crashes during heavy monsoon seasons."
  },
  {
    name: "Panvel Expressway Entry NH-48",
    state: "Maharashtra",
    latitude: 19.0142,
    longitude: 73.1114,
    severity: "Critical",
    accidentCount: 78,
    description: "Expressway entry point. Severe truck collision corridor caused by steep banking and heavy freight speeds."
  },
  {
    name: "Dhaula Kuan Bypass Loop",
    state: "Delhi",
    latitude: 28.5912,
    longitude: 77.1615,
    severity: "High",
    accidentCount: 41,
    description: "High-volume lane merging point. Prone to speed-related collisions and sudden braking pileups."
  },
  {
    name: "Rajiv Chowk Highway Intersect NH-48",
    state: "Haryana",
    latitude: 28.4552,
    longitude: 77.0315,
    severity: "Critical",
    accidentCount: 89,
    description: "Extremely dangerous highway section with high pedestrian traffic and rapid lane merges. Frequent fatal crashes."
  },
  {
    name: "Outer Ring Road Gachibowli Corridor",
    state: "Telangana",
    latitude: 17.4402,
    longitude: 78.3489,
    severity: "Critical",
    accidentCount: 37,
    description: "High-speed expressway curve. Major high-speed drifting and single-vehicle crash hazard zone."
  }
];

const SEED_ENFORCEMENT_ZONES = [
  {
    name: "Koramangala Helmet Compliance Check",
    state: "Karnataka",
    latitude: 12.9272,
    longitude: 77.6210,
    type: "helmet_enforcement",
    severity: "high",
    description: "Strict police check for helmets, triple riding, and side mirrors. Active daily."
  },
  {
    name: "Outer Ring Road Speed Radar Trap",
    state: "Karnataka",
    latitude: 12.9342,
    longitude: 77.6111,
    type: "speed_enforcement",
    severity: "high",
    description: "Radar checking interceptor vehicle active. Speed limit strictly capped at 60 km/h."
  },
  {
    name: "OMR Speed Trap Flyover Corridor",
    state: "Tamil Nadu",
    latitude: 12.9782,
    longitude: 80.2415,
    type: "speed_enforcement",
    severity: "high",
    description: "Automated speed-traps mounted on bridges. Fines issued for speeds exceeding 60 km/h."
  },
  {
    name: "Anna Salai ANPR Light Camera Corridor",
    state: "Tamil Nadu",
    latitude: 13.0402,
    longitude: 80.2425,
    type: "red_light_camera",
    severity: "medium",
    description: "Automated red light and stop line infraction tracking cameras."
  },
  {
    name: "Ring Road Speed Limit Radar Check",
    state: "Delhi",
    latitude: 28.5802,
    longitude: 77.1810,
    type: "speed_enforcement",
    severity: "high",
    description: "Speed radar flashes active capping speeds at 50 km/h on loop curves."
  },
  {
    name: "Connaught Place No-Parking Corridor",
    state: "Delhi",
    latitude: 28.6292,
    longitude: 77.2185,
    type: "parking_enforcement",
    severity: "high",
    description: "Strict tow-away zone. Round-the-clock fine issuance for vehicles parked outside designated grids."
  },
  {
    name: "Bandra Sea Link Automated Speed Trap",
    state: "Maharashtra",
    latitude: 19.0282,
    longitude: 72.8185,
    type: "speed_enforcement",
    severity: "high",
    description: "Automated radar sensors active. Speed limit strictly capped and fined at 80 km/h."
  },
  {
    name: "CST Junction ANPR Camera Loop",
    state: "Maharashtra",
    latitude: 18.9402,
    longitude: 72.8355,
    type: "red_light_camera",
    severity: "medium",
    description: "Automated ANPR red-light crossing camera system."
  }
];

const seedHotspots = async () => {
  try {
    // 1. Seed Accident Hotspots
    const countHotspots = await AccidentHotspot.countDocuments();
    if (countHotspots === 0) {
      console.log("[SEED] AccidentHotspots collection is empty. Populating safety ledger data...");
      await AccidentHotspot.insertMany(SEED_HOTSPOTS);
      console.log(`[SEED] Successfully seeded ${SEED_HOTSPOTS.length} premium Indian accident hotspots.`);
    } else {
      console.log(`[SEED] AccidentHotspots ledger is already seeded. Found ${countHotspots} active danger zones.`);
    }

    // 2. Seed Enforcement Zones
    const countEnforcement = await EnforcementZone.countDocuments();
    if (countEnforcement === 0) {
      console.log("[SEED] EnforcementZones collection is empty. Populating radar check zones...");
      await EnforcementZone.insertMany(SEED_ENFORCEMENT_ZONES);
      console.log(`[SEED] Successfully seeded ${SEED_ENFORCEMENT_ZONES.length} premium Indian speed radar zones.`);
    } else {
      console.log(`[SEED] EnforcementZones ledger is already seeded. Found ${countEnforcement} active camera corridors.`);
    }

  } catch (error) {
    console.error("[SEED ERROR] Failed to seed accident/enforcement database collections:", error);
  }
};

module.exports = {
  seedHotspots
};
