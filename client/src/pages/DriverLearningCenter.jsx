import { useState, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Shield,
  FileText,
  AlertTriangle,
  Info,
  ChevronDown,
  Search,
  X,
  ArrowLeftRight,
  Activity,
  Zap,
  Navigation,
  Bell,
  CheckCircle,
  TrendingUp,
  Clock,
  Eye,
  Car,
  Bike,
  IndianRupee,
  BadgeAlert,
  ShieldCheck,
  TriangleAlert,
  BookOpen,
  Radio
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// STATE DATA ARCHITECTURE
// Future-ready: replace static data with API responses from
// State Traffic APIs, RTO Circulars, Challan Databases, Govt Notifications
// without UI restructuring.
// ─────────────────────────────────────────────────────────────────────────────

const ALL_STATES = [
  'Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana',
  'Maharashtra', 'Delhi', 'Gujarat', 'Rajasthan', 'Uttar Pradesh',
  'West Bengal', 'Punjab', 'Haryana', 'Odisha', 'Assam',
  'Bihar', 'Madhya Pradesh', 'Chhattisgarh', 'Jharkhand', 'Uttarakhand',
  'Himachal Pradesh', 'Jammu & Kashmir', 'Ladakh', 'Goa',
  'Meghalaya', 'Manipur', 'Nagaland', 'Mizoram', 'Tripura', 'Arunachal Pradesh', 'Sikkim',
  'Chandigarh', 'Puducherry', 'Lakshadweep', 'Dadra & Nagar Haveli', 'Andaman & Nicobar'
];

const COMMON_DOCUMENTS = [
  {
    id: 'dl',
    title: 'Driving License (DL)',
    emoji: '🪪',
    purpose: 'Proof of qualification to operate a motor vehicle on public roads.',
    validity: 'Valid for 20 years (LMV) or until age 50, whichever is earlier. Renew 30 days before expiry.',
    violations: 'Driving without DL: ₹5,000 fine + up to 3 months imprisonment (Section 181 MV Act).',
    renewal: 'Renew at RTO or online via Parivahan portal. DigiLocker/mParivahan digital copy is legally valid.',
    color: 'from-sky-500/20 to-indigo-500/20',
    border: 'border-sky-500/30',
    tag: 'text-sky-400'
  },
  {
    id: 'rc',
    title: 'Registration Certificate (RC Book)',
    emoji: '📝',
    purpose: 'Establishes legal ownership and roadworthiness of the vehicle.',
    validity: '15 years for private petrol vehicles; re-register every 5 years thereafter. EVs exempt for 15 years.',
    violations: 'Driving unregistered vehicle: ₹2,000 (first offense) to ₹5,000 fine. Vehicle may be seized.',
    renewal: 'Apply for RC renewal at issuing RTO 60 days before expiry. Required: Form 25, fitness certificate, insurance.',
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    tag: 'text-emerald-400'
  },
  {
    id: 'insurance',
    title: 'Vehicle Insurance Policy',
    emoji: '🛡️',
    purpose: 'Third-party insurance is legally mandatory. Covers liability for damage or injury to third parties.',
    validity: 'Annual renewal. Comprehensive policies vary by insurer. 3rd party insurance is non-negotiable.',
    violations: '1st offense: ₹2,000 + up to 3 months imprisonment. 2nd offense: ₹4,000 + up to 3 months (Section 196 MV Act).',
    renewal: 'Renew online via IRDAI-approved insurers, Parivahan portal, or insurance provider apps.',
    color: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    tag: 'text-purple-400'
  },
  {
    id: 'puc',
    title: 'Pollution Under Control (PUC)',
    emoji: '🌱',
    purpose: 'Certifies that vehicle exhaust emissions comply with Central Motor Vehicles Rules environmental norms.',
    validity: 'New vehicle: exempt for 1 year. Post 1 year: every 6 months (petrol), every 3 months (diesel).',
    violations: 'Expired PUC: ₹10,000 fine (Section 190(2) MV Act). Repeat offense: ₹10,000 + vehicle confiscation.',
    renewal: 'Test at any authorized PUC center. Certificate emailed/printed instantly. Cost: ₹60–₹100.',
    color: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/30',
    tag: 'text-amber-400'
  }
];

const STATE_DATA = {
  'Tamil Nadu': {
    overview: {
      commonViolations: ['Speeding on OMR/ECR', 'Helmet Non-Compliance', 'Signal Jumping', 'Mobile Phone Usage'],
      highRiskDistricts: ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem'],
      majorConcerns: ['High pedestrian fatality zones in Chennai', 'Night driving risks on NH-44', 'Monsoon flooding on coastal roads'],
      lastUpdated: 'May 2025',
      complianceRate: 78,
      trafficDensity: 'Very High'
    },
    rules: [
      { id: 'tn_helmet', title: 'Helmet Rules', icon: '🪖', description: 'Both rider and pillion must wear BIS-certified ISI helmets with chin straps fastened at all times on two-wheelers.', legal: 'Section 129 MV Act — ₹1,000 fine + 3-month DL suspension for repeat offenders.', notes: 'Tamil Nadu Police uses AI-powered cameras on OMR, GST Road, and ECR to detect helmetless riders automatically.' },
      { id: 'tn_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'All occupants including rear-seat passengers are mandated to wear seatbelts. Cab aggregator passengers are legally liable.', legal: 'Section 194B MV Act — ₹1,000 fine per unbelted occupant.', notes: 'Tamil Nadu enforcement is strict on expressways. Random checkpoints operate 24/7 on NH-48 and NH-44.' },
      { id: 'tn_speed', title: 'Speed Limits', icon: '⚡', description: 'Urban areas: 50 km/h. Urban highways: 70 km/h. State highways: 80 km/h. National highways: 100 km/h (cars), 80 km/h (trucks).', legal: 'Section 183 MV Act — ₹1,000–₹2,000 fine. ANPR speed cameras active on OMR and Porur corridor.', notes: 'Speed gun enforcement is active at 47+ fixed points across Chennai. E-challans are issued automatically.' },
      { id: 'tn_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Strictly prohibited to use handheld mobile phone while driving. Hands-free kits allowed only if display is not visible to driver.', legal: 'Section 184 MV Act — ₹1,000 (1st offense), ₹10,000 + DL suspension for repeat offenders.', notes: 'AI cameras at 200+ junctions in Chennai detect phone usage through windshields using IR and pattern recognition.' },
      { id: 'tn_triple', title: 'Triple Riding Restrictions', icon: '🏍️', description: 'Two-wheelers are restricted to a maximum of two riders. Carrying a child under 4 years in approved child seat is permitted but counts as third occupant — check local rules.', legal: 'Section 128 MV Act — ₹100–₹500 fine. High-visibility enforcement zones near schools and colleges.', notes: 'Triple riding enforcement is especially strict during school hours (7–9 AM, 3–5 PM) near educational zones.' },
      { id: 'tn_drunk', title: 'Drunk Driving Rules', icon: '🍺', description: 'BAC (Blood Alcohol Content) limit is 30 mg per 100 ml of blood. Zero tolerance policy is enforced across Tamil Nadu under special task forces.', legal: 'Section 185 MV Act — ₹10,000 + 6 months imprisonment for first offense. DL cancellation for repeat offenders.', notes: 'Night patrols with breathalyzer checks operate every Friday–Sunday from 10 PM to 2 AM on all major Chennai highways.' },
      { id: 'tn_parking', title: 'Parking Regulations', icon: '🅿️', description: 'No parking within 5m of intersections, 15m of bus stops, on yellow-line roads, or blocking fire hydrants. Smart parking zones in Chennai are meter-based.', legal: 'Fines ₹500–₹1,500. Vehicles towed by Chennai Traffic Police from no-parking zones — retrieval fee ₹2,000+.', notes: 'Chennai Corporation uses RFID-based smart parking on Anna Salai, Nungambakkam, and Mylapore corridors.' }
    ],
    challans: [
      { violation: 'Speeding', amount: '₹1,000 – ₹2,000', explanation: 'Speed above the posted limit detected by ANPR/radar camera or officer.', prevention: 'Use Google Maps speed alerts. Maintain 5 km/h buffer below limit.' },
      { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'Crossing stop line after red light, detected by RLVD cameras.', prevention: 'Stop before the stop line. Yellow means slow, not rush.' },
      { violation: 'No Helmet', amount: '₹1,000', explanation: 'Rider/pillion without ISI-certified helmet or unfastened chin strap.', prevention: 'Always carry BIS-marked helmets. Buy from certified dealers.' },
      { violation: 'No Seatbelt', amount: '₹1,000', explanation: 'Driver or any passenger without seatbelt fastened.', prevention: 'Buckle up before starting the engine — make it a reflex.' },
      { violation: 'Mobile Phone Usage', amount: '₹1,000 – ₹10,000', explanation: 'Holding or using phone while vehicle is in motion.', prevention: 'Use Bluetooth/hands-free. Enable Do Not Disturb while driving.' },
      { violation: 'Triple Riding', amount: '₹100 – ₹500', explanation: 'Three or more persons on a two-wheeler simultaneously.', prevention: 'Only two persons per two-wheeler. No exceptions.' },
      { violation: 'Drunk Driving', amount: '₹10,000 + Imprisonment', explanation: 'BAC above 30 mg/100 ml confirmed by breathalyzer.', prevention: 'Never drink and drive. Use designated driver or cab services.' },
      { violation: 'Expired PUC', amount: '₹10,000', explanation: 'PUC certificate expired or vehicle emission above permissible limit.', prevention: 'Set calendar reminder 1 week before PUC expiry.' },
      { violation: 'No Insurance', amount: '₹2,000 – ₹4,000', explanation: 'Third-party insurance lapsed or not carried in vehicle.', prevention: 'Auto-renew insurance. Store digital copy in DigiLocker.' }
    ],
    safetyInsights: [
      { category: 'High-Risk Corridors', icon: '🛣️', detail: 'OMR (Old Mahabalipuram Road), ECR (East Coast Road), NH-44 (Chennai–Bangalore), Inner Ring Road. Heavy speeding and lane discipline violations reported.' },
      { category: 'Night Driving Risks', icon: '🌙', detail: 'NH-44 and GST Road have highest fatality rate between 10 PM and 4 AM. Avoid non-lit state road stretches. Truck movement peaks post-midnight.' },
      { category: 'Weather Risks', icon: '🌧️', detail: 'North-East Monsoon (Oct–Dec) floods Velachery, Tambaram, and Perambur underpasses. Avoid driving through waterlogged roads — electrical shorts and engine damage are common.' },
      { category: 'Highway Safety', icon: '🚛', detail: 'NH-48 (Chennai–Bangalore) has disproportionately high truck-related accidents near Krishnagiri stretch. Maintain 100m following distance behind trucks at night.' },
      { category: 'Seasonal Warnings', icon: '☀️', detail: 'April–June heat causes tire blowouts on dark asphalt. Check tire pressure early morning. Carry water and emergency kit.' }
    ],
    accidentProneAreas: [
      { location: 'Kathipara Junction, Chennai', riskLevel: 'Critical', reason: 'Multi-grade flyover with complex merge lanes; high speeding and confusion.', recommendation: 'Slow to 40 km/h approaching junction. Follow lane markers strictly.' },
      { location: 'Vandalur–Kelambakkam Stretch', riskLevel: 'High', reason: 'High-speed corridor with frequent illegal U-turns and unlit sections.', recommendation: 'Avoid overtaking near median gaps. Use hazard lights in fog.' },
      { location: 'Trichy–Madurai NH-38', riskLevel: 'High', reason: 'Heavy truck traffic + pedestrian crossing without overpass.', recommendation: 'Night driving: reduce speed to 60 km/h. Use high-beam with caution.' },
      { location: 'Coimbatore Avinashi Road', riskLevel: 'Moderate', reason: 'Heavy two-wheeler and pedestrian mix near industrial hubs.', recommendation: 'Strict speed compliance. Watch for workers crossing at factory gates.' },
      { location: 'Salem Bypass – NH-44', riskLevel: 'High', reason: 'Frequent wrong-side driving and unmarked speed breakers.', recommendation: 'Slow down at every unmarked intersection. Honk before blind curves.' }
    ],
    notices: [
      { type: 'campaign', title: 'Chennai Road Safety Month 2025', message: 'TN Police launched 30-day intensive helmet and seatbelt enforcement drive across all 15 Chennai traffic zones.', date: 'May 2025' },
      { type: 'update', title: 'ANPR Cameras Expanded to 1,200 Junctions', message: 'Tamil Nadu has added 400 new ANPR cameras across Tier-2 cities including Madurai, Salem, and Trichy.', date: 'Apr 2025' },
      { type: 'reminder', title: 'PUC Enforcement Drive', message: 'State-wide checking of PUC certificates. Vehicles older than 15 years face enhanced scrutiny and mandatory fitness tests.', date: 'May 2025' },
      { type: 'safety', title: 'Summer Road Safety Advisory', message: 'TNSTC and Highway Police advise avoiding long highway drives between 12 PM and 3 PM due to glare and tire risk.', date: 'Apr 2025' }
    ]
  },

  'Karnataka': {
    overview: {
      commonViolations: ['Lane Cutting at Silk Board', 'Speeding on ORR', 'No Helmet', 'Wrong-Side Driving'],
      highRiskDistricts: ['Bengaluru Urban', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'],
      majorConcerns: ['Bengaluru gridlock causing dangerous U-turns', 'High fatality rate on NH-275', 'Two-wheeler accidents near tech parks'],
      lastUpdated: 'May 2025',
      complianceRate: 72,
      trafficDensity: 'Extreme'
    },
    rules: [
      { id: 'ka_helmet', title: 'Helmet Rules', icon: '🪖', description: 'Mandatory ISI-certified helmet for both rider and pillion across all Karnataka roads including city limits.', legal: '₹1,000 fine + license suspension. BBMP and Bengaluru Traffic Police enforce via AI cameras.', notes: 'Bengaluru traffic police issue over 2,000 helmet challans daily during peak enforcement drives.' },
      { id: 'ka_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'All car occupants including rear passengers must wear seatbelts at all times.', legal: '₹1,000 per unbelted occupant. Spot checks common at Hebbal, Electronic City flyover checkpoints.', notes: 'Rear-seat seatbelt enforcement increased significantly after 2023 MV Amendment rules came into force.' },
      { id: 'ka_speed', title: 'Speed Limits', icon: '⚡', description: 'Bengaluru city: 60 km/h. ORR/PRR: 80 km/h. NH-275: 100 km/h for cars. Speed limits reduced to 30 km/h in school zones.', legal: 'Section 183 — ₹1,000–₹2,000. E-challans issued via ANPR cameras on ORR, NICE Road, and airport expressway.', notes: 'Average speed enforcement is piloted on Bengaluru–Mysuru expressway — cameras at both ends measure average speed.' },
      { id: 'ka_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Complete ban on handheld device usage while driving. Hands-free setup must not distract driver.', legal: '₹1,000 – ₹10,000. Repeat offense leads to DL confiscation under dangerous driving provisions.', notes: 'AI cameras on NICE Road and Hosur Road flag phone usage in real-time, feeding into Bengaluru e-challan system.' },
      { id: 'ka_triple', title: 'Triple Riding', icon: '🏍️', description: 'Maximum two persons on any two-wheeler. Strictly enforced near IT corridors due to high concentration of commuters.', legal: 'Section 128 — ₹100–₹500. Enhanced fines proposed in Karnataka Road Safety Policy 2024.', notes: 'Traffic police deploy plain-clothes teams near Marathahalli, Whitefield, and Electronic City to catch triple riders.' },
      { id: 'ka_drunk', title: 'Drunk Driving', icon: '🍺', description: 'BAC limit: 30 mg/100 ml blood. Karnataka Excise and Traffic Police conduct joint night checkpoints, especially on weekends.', legal: '₹10,000 + 6 months jail (1st offense). Vehicle impounded for 30 days on 2nd offense.', notes: 'Bengaluru\'s Friday-night drives (11 PM–3 AM) are 100% breathalyzer-checked at 22+ checkpoints.' },
      { id: 'ka_parking', title: 'Parking Regulations', icon: '🅿️', description: 'No parking in red-line zones, bus bays, flyover approaches, or on footpaths. BBMP has smart parking on MG Road and Brigade Road.', legal: 'BBMP fines ₹500–₹2,000. Cranes deployed for towing. Retrieval fee ₹2,000–₹3,000.', notes: 'Smart parking meters active in Brigade Road, Cunningham Road. Mobile app available for cashless payment.' }
    ],
    challans: [
      { violation: 'Speeding', amount: '₹1,000 – ₹2,000', explanation: 'Detected by ANPR cameras or radar guns on ORR, NICE Road, NH-275.', prevention: 'Use Google Maps to see speed limits and camera zones.' },
      { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'RLVD cameras at 500+ Bengaluru junctions auto-generate challans.', prevention: 'Stop before the white stop line. Never rush a yellow light.' },
      { violation: 'No Helmet', amount: '₹1,000', explanation: 'Rider/pillion without ISI-mark helmet or unfastened chin strap.', prevention: 'Keep spare helmet for pillion. Avoid borrowed helmets without ISI mark.' },
      { violation: 'Wrong-Side Driving', amount: '₹5,000', explanation: 'Driving against traffic direction detected at one-way junctions.', prevention: 'Never take shortcuts against traffic. Adds 3 demerit points to DL.' },
      { violation: 'No Seatbelt', amount: '₹1,000', explanation: 'Any car occupant not wearing seatbelt while vehicle in motion.', prevention: 'Install seatbelt reminder device. Buckle up before ignition.' },
      { violation: 'Mobile Usage', amount: '₹1,000 – ₹10,000', explanation: 'Handheld phone detected while vehicle is in motion.', prevention: 'Use mobile holder. Enable driving mode on phone.' },
      { violation: 'Drunk Driving', amount: '₹10,000 + Imprisonment', explanation: 'BAC above 30 mg/100 ml confirmed by breathalyzer.', prevention: 'Book a cab. Never compromise.' },
      { violation: 'Expired PUC', amount: '₹10,000', explanation: 'PUC not renewed within validity period.', prevention: 'Test at nearest authorized center. Takes 15 minutes.' }
    ],
    safetyInsights: [
      { category: 'High-Risk Corridors', icon: '🛣️', detail: 'Silk Board Junction, Marathahalli–Sarjapur Road, Hebbal Flyover, and Bellary Road are Bengaluru\'s most accident-prone stretches.' },
      { category: 'Night Driving', icon: '🌙', detail: 'NH-275 Bengaluru–Mysuru stretch sees highest fatalities between 8 PM–12 AM. Drunk driving is primary cause.' },
      { category: 'Weather Risks', icon: '🌧️', detail: 'Bengaluru\'s pre-monsoon (May–Jun) causes instant waterlogging on Koramangala, HSR Layout underpasses. Switch off engine if water level exceeds exhaust pipe height.' },
      { category: 'Highway Safety', icon: '🚛', detail: 'NH-4 (Bengaluru–Pune) has multiple black spots near Belgaum pass. Mountain hairpin bends require gear-down driving.' },
      { category: 'Seasonal Warnings', icon: '☀️', detail: 'October–November: Bengaluru receives heavy rain + Diwali traffic spike. Expect 3–4x longer commute times. Plan routes early.' }
    ],
    accidentProneAreas: [
      { location: 'Silk Board Junction', riskLevel: 'Critical', reason: 'Highest traffic density in India. Multiple merge points, zero pedestrian discipline.', recommendation: 'Avoid 8–10 AM and 6–9 PM. Use BTM Layout alternate route.' },
      { location: 'Hebbal Flyover', riskLevel: 'High', reason: 'High-speed vehicles merging from airport road into city traffic abruptly.', recommendation: 'Maintain 60 km/h max. Do not change lanes on the descent.' },
      { location: 'NH-275 near Ramanagara', riskLevel: 'Critical', reason: 'High speed + animal crossings + limited median. Over 40 fatalities in 2024.', recommendation: 'Reduce to 80 km/h at night. Avoid overtaking near curves.' },
      { location: 'Mysuru Road near Bidadi', riskLevel: 'High', reason: 'Industrial truck movement + uncontrolled intersections.', recommendation: 'Do not tailgate trucks. Leave 150m gap.' },
      { location: 'Tumkur Road NH-48', riskLevel: 'Moderate', reason: 'High bus frequency + unmarked pedestrian crossings.', recommendation: 'Extra caution near Nelamangala town limits.' }
    ],
    notices: [
      { type: 'campaign', title: 'Bengaluru Road Safety Week 2025', message: 'BBMP and Traffic Police launched joint campaign targeting helmet, seatbelt, and wrong-side violations across all 6 zones.', date: 'May 2025' },
      { type: 'update', title: 'Average Speed Enforcement Live on Bengaluru–Mysuru Expressway', message: 'New enforcement system measures average speed between two points — no more sudden braking before cameras.', date: 'Mar 2025' },
      { type: 'reminder', title: 'Demerit Points System Active', message: 'Karnataka has activated the MV Act demerit point system. 12 points in 3 years leads to automatic DL suspension.', date: 'Jan 2025' },
      { type: 'safety', title: 'School Zone Speed Reduction', message: 'All school zones in Bengaluru now marked with 30 km/h limit. Rumble strips installed near 850 schools.', date: 'Apr 2025' }
    ]
  },

  'Kerala': {
    overview: {
      commonViolations: ['Overloading', 'No Helmet on Ghat Roads', 'Speeding on Highways', 'Wrong Parking'],
      highRiskDistricts: ['Thrissur', 'Malappuram', 'Palakkad', 'Kozhikode', 'Kasaragod'],
      majorConcerns: ['Ghat road accidents during monsoon', 'Coastal road flooding risk', 'Drunk driving in tourist zones'],
      lastUpdated: 'May 2025',
      complianceRate: 82,
      trafficDensity: 'High'
    },
    rules: [
      { id: 'kl_helmet', title: 'Helmet Rules', icon: '🪖', description: 'ISI helmets mandatory for all two-wheeler riders. Kerala has the highest density of automatic red-light and helmet cameras.', legal: '₹1,000 fine. Kerala Motor Vehicle Dept issues e-challans within 48 hours to registered mobile number.', notes: 'Kerala\'s AI camera network operates 24/7 on NH-544 (Kochi bypass) and NH-66 coastal highway.' },
      { id: 'kl_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'Mandatory for all occupants. Taxis and autorickshaws are separately monitored by MVD flying squads.', legal: '₹1,000 per violation. Enhanced monitoring on Thiruvananthapuram–Kollam stretch.', notes: 'Kerala MVD uses surprise flash mob checks across district borders, especially on NH-66 during festival seasons.' },
      { id: 'kl_speed', title: 'Speed Limits', icon: '⚡', description: 'Municipal areas: 50 km/h. Highways: 80 km/h. Ghat roads: 30 km/h. Beach roads: 40 km/h. Special zones during monsoon: 40 km/h.', legal: 'Section 183 — ₹1,000–₹2,000. Speed lasers active on NH-66 and NH-544.', notes: 'Ghat road speed limits (30 km/h) are strictly enforced via radar guns. No overtaking allowed on 90% of ghat sections.' },
      { id: 'kl_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Zero tolerance for handheld phone usage. Kerala MVD\'s CCTV network feeds into AI analysis that auto-generates challans.', legal: '₹1,000 – ₹10,000. Kerala among top 3 states for mobile-while-driving conviction rate.', notes: 'Kerala piloted India\'s first AI-based mobile phone distraction detection system in 2024 at 100 junctions.' },
      { id: 'kl_triple', title: 'Triple Riding', icon: '🏍️', description: 'Two-wheelers restricted to maximum two occupants. Stricter enforcement in tourist zones (Munnar, Varkala, Kovalam).', legal: '₹100–₹500. MVD stepping up fines to ₹1,000 under proposed Kerala Road Safety Act 2025.', notes: 'Special enforcement during Onam and Christmas tourist surge in hill station routes.' },
      { id: 'kl_drunk', title: 'Drunk Driving', icon: '🍺', description: 'BAC limit: 30 mg/100 ml. Kerala Excise and Police conduct joint operations on all 14 district headquarters highways every weekend.', legal: '₹10,000 + 6 months imprisonment. Vehicle impoundment is standard for first-time offenders in Kerala.', notes: 'Kerala\'s "Night Patrol" app allows citizens to report suspected drunk driving. Police response time: under 8 minutes.' },
      { id: 'kl_parking', title: 'Parking Regulations', icon: '🅿️', description: 'No parking on pedestrian paths, bus bays, near temples/churches during prayer hours, or on narrow village roads.', legal: 'Fines ₹500–₹1,000. Local bodies (Panchayats) also empowered to issue fines in Kerala.', notes: 'Kochi Smart City initiative has 2,000+ smart parking meters across Fort Kochi and MG Road corridor.' }
    ],
    challans: [
      { violation: 'Speeding', amount: '₹1,000 – ₹2,000', explanation: 'Speed violation on NH-66, NH-544, or ghat roads detected by radar/AI cameras.', prevention: 'Set speed alerts on navigation app. Never exceed 30 km/h on ghat roads.' },
      { violation: 'No Helmet', amount: '₹1,000', explanation: 'Automatically detected at 700+ camera junctions across Kerala.', prevention: 'ISI-marked helmet is mandatory. No exceptions on any road.' },
      { violation: 'Overloading (Goods Vehicles)', amount: '₹2,000/tonne overload', explanation: 'Weigh bridge checks on NH-544 and NH-66. Goods vehicles weighed randomly.', prevention: 'Never load beyond registered GVW. Document load with invoice.' },
      { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'RLVD cameras at all major junctions in Thiruvananthapuram, Kochi, Kozhikode.', prevention: 'Anticipate signal cycles. Slow down 100m before intersections.' },
      { violation: 'Drunk Driving', amount: '₹10,000 + Jail', explanation: 'Joint Excise–Police teams operate at all NH entry/exit points on weekends.', prevention: 'Use ride-sharing. Zero BAC is the only safe limit.' },
      { violation: 'Expired PUC', amount: '₹10,000', explanation: 'Flying squad checks PUC at toll plazas and district borders.', prevention: 'Renew PUC every 6 months. Cost: ₹80–₹120.' },
      { violation: 'Mobile Usage', amount: '₹1,000 – ₹10,000', explanation: 'AI camera detection + officer spot-checks.', prevention: 'Use Bluetooth earpiece. Never text while driving.' }
    ],
    safetyInsights: [
      { category: 'Ghat Road Safety', icon: '⛰️', detail: 'Munnar, Wayanad, and Vagamon ghat roads have sharp hairpin bends. Use lower gears, horn before blind curves, and never attempt overtaking.' },
      { category: 'Coastal Road Hazards', icon: '🌊', detail: 'NH-66 coastal stretch floods during Southwest Monsoon (Jun–Aug). Watch for sudden waterlogging near Kasaragod and Kozhikode.' },
      { category: 'Night Driving Risks', icon: '🌙', detail: 'NH-66 between Kozhikode and Kasaragod has leopard/elephant crossing zones. Reduce to 40 km/h after dark. High beam essential.' },
      { category: 'Festival Season', icon: '🎉', detail: 'Onam (Sep) and Christmas (Dec) bring 3x traffic increase on all routes. Plan journeys with 2-hour buffer time.' },
      { category: 'Monsoon Warnings', icon: '🌧️', detail: 'Kerala receives 3000mm+ rainfall annually. Landslide risk on all hill routes (Wayanad, Idukki) from June–October. Check district alerts before travel.' }
    ],
    accidentProneAreas: [
      { location: 'Muttom – Thiruvananthapuram NH-66', riskLevel: 'High', reason: 'Narrow 2-lane highway with mixed heavy and light traffic near Muttom fishing harbor.', recommendation: 'Use bypass road. Avoid night driving in this segment.' },
      { location: 'Walayar–Palakkad Border Stretch', riskLevel: 'High', reason: 'High truck density + frequent overtaking + limited visibility at Ghats entry.', recommendation: 'Drive at 60 km/h. Do not overtake trucks near inclines.' },
      { location: 'Munnar Ghat Road', riskLevel: 'Critical', reason: '52 hairpin bends, steep gradient, frequent fog, tourist bus overloading.', recommendation: 'Use low gear throughout. Honk at every bend. Avoid after sunset.' },
      { location: 'Kozhikode Bypass NH-766', riskLevel: 'Moderate', reason: 'Fast-moving traffic mixing with local vehicles entering/exiting near Ramanattukara.', recommendation: 'Use frontage road for local access. Do not brake suddenly on main carriageway.' }
    ],
    notices: [
      { type: 'campaign', title: 'Kerala Road Safety Authority Drive 2025', message: '21-day enforcement across all 14 districts targeting helmet, seatbelt, and night-time drunk driving violators.', date: 'May 2025' },
      { type: 'update', title: 'Ghat Road New Speed Limits Effective', message: 'All ghat roads now carry 30 km/h limit with penalty doubling for tourist vehicle violations.', date: 'Mar 2025' },
      { type: 'reminder', title: 'Monsoon Preparedness Advisory', message: 'PWD and Kerala Police advise all motorists to download the KSDMA app for real-time district flood alerts before travel.', date: 'May 2025' },
      { type: 'safety', title: 'Elephant Corridor Night Driving Ban', message: 'Wayanad and Idukki forest roads: Night driving banned 9 PM–6 AM. Violators: ₹10,000 + forest department action.', date: 'Apr 2025' }
    ]
  },

  'Maharashtra': {
    overview: {
      commonViolations: ['Speeding on Expressways', 'No Helmet', 'Lane Changing', 'Signal Jumping'],
      highRiskDistricts: ['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Thane'],
      majorConcerns: ['Mumbai expressway speeding fatalities', 'Pune–Bangalore NH fatal zones', 'Monsoon potholes'],
      lastUpdated: 'May 2025',
      complianceRate: 74,
      trafficDensity: 'Very High'
    },
    rules: [
      { id: 'mh_helmet', title: 'Helmet Rules', icon: '🪖', description: 'ISI helmet compulsory for rider and pillion. Maharashtra RTO conducts drives across all 36 districts.', legal: '₹1,000 + DL confiscation for repeat offenders under Maharashtra Motor Vehicle Act enforcement.', notes: 'Mumbai Traffic Police installed 5,000+ cameras with helmet detection AI across all major intersections.' },
      { id: 'mh_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'Mandatory for all occupants including rear seats. Mumbai Police conduct random checks on expressway entry ramps.', legal: '₹1,000 per unbelted occupant. Auto-detection at toll plazas on Mumbai–Pune Expressway.', notes: 'Maharashtra implemented India\'s first e-challan for rear-seat seatbelt violations via toll camera integration in 2024.' },
      { id: 'mh_speed', title: 'Speed Limits', icon: '⚡', description: 'Mumbai city: 40–60 km/h. Mumbai–Pune Expressway: 100 km/h (cars), 80 km/h (trucks). NH-48: 100 km/h.', legal: '₹1,000–₹2,000. Radar guns active on Mumbai–Nashik Highway and Samruddhi Mahamarg.', notes: 'Samruddhi Mahamarg (Hindu Hrudaysamrat Balasaheb Thackeray Maharashtra Samruddhi Mahamarg): 120 km/h max. ANPR at every 10 km.' },
      { id: 'mh_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Complete ban while driving. Mumbai police issue over 500 challans daily for mobile usage violations.', legal: '₹1,000–₹10,000. 2nd offense leads to 3-month DL suspension.', notes: 'AI cameras at Mumbai\'s 2,000+ signals detect phone usage. Challans reach registered mobile within 2 hours.' },
      { id: 'mh_triple', title: 'Triple Riding', icon: '🏍️', description: 'Strictly prohibited. Pune\'s IT corridor and Mumbai suburbs see heavy enforcement targeting delivery workers and college students.', legal: '₹100–₹500. Enhanced enforcement near colleges, IT parks, and MIDC industrial zones.', notes: 'Pune RTO\'s social media drives have increased voluntary compliance in Hinjewadi and Baner areas.' },
      { id: 'mh_drunk', title: 'Drunk Driving', icon: '🍺', description: 'BAC: 30 mg/100 ml. Mandatory breathalyzer testing at all Mumbai expressway entry points on weekends.', legal: '₹10,000 + imprisonment. 2nd offense: DL cancelled, vehicle confiscated.', notes: 'Maharashtra launched "Don\'t Drink and Drive" public awareness week every December with mass breathalyzer drives.' },
      { id: 'mh_parking', title: 'Parking', icon: '🅿️', description: 'No parking on no-parking zones, expressway shoulders, Bandra–Worli Sea Link, or near fire stations.', legal: 'BMC fines ₹1,000–₹3,000. Vehicles towed from Nariman Point, Bandra, Andheri regularly.', notes: 'Mumbai has cashless smart parking with mobile app booking in BKC, Andheri East, and South Mumbai.' }
    ],
    challans: [
      { violation: 'Speeding', amount: '₹1,000 – ₹2,000', explanation: 'ANPR cameras on Mumbai–Pune Expressway, Samruddhi Mahamarg, and NH-48.', prevention: 'Expressway cruise control helps maintain legal speed.' },
      { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'Over 2,000 RLVD cameras across Maharashtra issue instant e-challans.', prevention: 'Never accelerate at yellow light. Complete stop mandatory at red.' },
      { violation: 'No Helmet', amount: '₹1,000', explanation: 'AI helmet detection at all major Mumbai, Pune, Nagpur junctions.', prevention: 'ISI mark and chin strap required. No exemptions.' },
      { violation: 'Lane Violation', amount: '₹500', explanation: 'Weaving between lanes detected on expressways.', prevention: 'Stay in lane. Use indicator 30m before changing lane.' },
      { violation: 'Drunk Driving', amount: '₹10,000 + Jail', explanation: 'Weekend midnight drives on all expressway entry points.', prevention: 'Zero tolerance. Use Ola/Uber for night outings.' },
      { violation: 'Expired PUC', amount: '₹10,000', explanation: 'Enhanced checking during Maharashtra green initiative drives.', prevention: 'Every 6 months for petrol, 3 months for diesel.' },
      { violation: 'Mobile Usage', amount: '₹1,000 – ₹10,000', explanation: 'AI cameras detect handheld phone in real time.', prevention: 'Use phone holder on dashboard. Never text while moving.' }
    ],
    safetyInsights: [
      { category: 'Expressway Hazards', icon: '🛣️', detail: 'Mumbai–Pune Expressway: 95 km with India\'s highest highway accident rate. Fog, lane drift, tire blowouts at 100+ km/h are leading causes.' },
      { category: 'Night Driving', icon: '🌙', detail: 'Samruddhi Mahamarg: high-speed fatalities at night near Shahapur and Kasara sections. Leopard crossings near Igatpuri forest.' },
      { category: 'Monsoon Risks', icon: '🌧️', detail: 'Mumbai receives 2400mm rain annually. August flashfloods cause instant waterlogging on Sion-Panvel Expressway. Never drive through underpasses during heavy rain.' },
      { category: 'Highway Safety', icon: '🚛', detail: 'NH-48 (Pune–Bangalore): high truck accident zone near Kolhapur–Satara section. Avoid overtaking on mountain approaches.' },
      { category: 'Seasonal Warnings', icon: '🎆', detail: 'Ganesh Chaturthi (Aug–Sep) causes 5x traffic spike in Pune. Plan 3-hour buffer for all inter-city journeys during Navratri and Diwali.' }
    ],
    accidentProneAreas: [
      { location: 'Mumbai–Pune Expressway, Khandala Ghat', riskLevel: 'Critical', reason: 'Fog, hairpin bends, high speed. Dozens of accidents annually.', recommendation: 'Limit to 60 km/h in fog. Use fog lights. Stop at highway rest areas if visibility < 50m.' },
      { location: 'Samruddhi Mahamarg, Shahapur Section', riskLevel: 'High', reason: 'High speed + wildlife crossing + limited lighting.', recommendation: '80 km/h at night. No overtaking near forest boundaries.' },
      { location: 'Pune Katraj Ghat', riskLevel: 'High', reason: 'Sharp bends + construction trucks + rain slick surface.', recommendation: '40 km/h through ghat section. No overtaking.' },
      { location: 'NH-48 near Kolhapur', riskLevel: 'High', reason: 'Heavy truck traffic + narrow stretches + pedestrians.', recommendation: 'Use bypass road. Avoid after 10 PM.' }
    ],
    notices: [
      { type: 'campaign', title: 'Maharashtra Suraksha Abhiyan 2025', message: 'Month-long intensive road safety drive across all expressways and state highways with breathalyzer, helmet, and seatbelt checks.', date: 'May 2025' },
      { type: 'update', title: 'Samruddhi Mahamarg Speed Monitoring Active', message: 'ANPR cameras every 10 km on Samruddhi Expressway now fully operational. Average speed enforcement coming by Q3 2025.', date: 'Apr 2025' },
      { type: 'reminder', title: 'Monsoon Road Safety Advisory', message: 'Check MSRDC road closure updates before Ghat road travel. Mumbai–Pune Expressway closes during extreme rainfall.', date: 'May 2025' },
      { type: 'safety', title: 'Pothole Grievance Portal Active', message: 'Report potholes at PWD Maharashtra portal. Complaints resolved within 72 hours under CM\'s Road Safety Mission.', date: 'Mar 2025' }
    ]
  },

  'Delhi': {
    overview: {
      commonViolations: ['Speeding on Ring Road', 'Signal Jumping', 'Drunk Driving', 'Parking Violations'],
      highRiskDistricts: ['Central Delhi', 'South Delhi', 'East Delhi', 'Outer Ring Road', 'NH-48 Corridor'],
      majorConcerns: ['World\'s highest vehicular pollution', 'Extreme traffic congestion', 'Pedestrian safety crisis'],
      lastUpdated: 'May 2025',
      complianceRate: 66,
      trafficDensity: 'Extreme'
    },
    rules: [
      { id: 'dl_helmet', title: 'Helmet Rules', icon: '🪖', description: 'ISI helmet mandatory for rider and pillion on all Delhi roads. Special enforcement drives conducted during Commonwealth Games legacy routes.', legal: '₹1,000. Delhi Traffic Police issues 3,000+ helmet challans daily across the NCR region.', notes: 'CCTV network of 2.75 lakh cameras across Delhi feeds into AI-powered helmet detection system.' },
      { id: 'dl_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'All car occupants must wear seatbelts. Delhi HC ruled that auto-detection is legally valid evidence.', legal: '₹1,000 per unbelted occupant. Random checks at every police naka.', notes: 'Seatbelt sensors now mandatory in all new vehicles sold in Delhi after 2023. Old vehicles face enhanced scrutiny.' },
      { id: 'dl_speed', title: 'Speed Limits', icon: '⚡', description: 'Delhi city roads: 50 km/h. Inner Ring Road: 60 km/h. Outer Ring Road: 70 km/h. Delhi–Gurugram Expressway: 100 km/h.', legal: '₹1,000–₹2,000. Speed cams active on all 3 Ring Roads, DND Flyway, and NH-48.', notes: 'Delhi ANPR network has 2,000+ speed detection points. E-challan issued within 24 hours to vehicle owner.' },
      { id: 'dl_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Complete ban on handheld phone usage. Delhi Traffic Police dedicated mobile-phone violation team operates in all 13 traffic districts.', legal: '₹1,000–₹10,000. DL suspension for habitual offenders (3+ violations in 12 months).', notes: 'AI cameras at 500+ Delhi junctions detect phone distraction. Instant e-challan system pioneered by Delhi Traffic Police.' },
      { id: 'dl_triple', title: 'Triple Riding', icon: '🏍️', description: 'Maximum 2 persons per two-wheeler. Strict enforcement near universities (Delhi University, JNU, Jamia) and market areas.', legal: '₹100–₹500. Proposed upgrade to ₹1,000 under Delhi Motor Vehicles (Amendment) Bill 2024.', notes: 'Random checks outside Lajpat Nagar, Karol Bagh, and Chandni Chowk markets.' },
      { id: 'dl_drunk', title: 'Drunk Driving', icon: '🍺', description: 'BAC: 30 mg/100 ml. Delhi Police conducts 200+ breathalyzer check points every night across NCR.', legal: '₹10,000 + 6 months imprisonment. Court-ordered counseling for all DUI offenders since 2023.', notes: 'Delhi Police\'s Saturday night crackdown arrested over 12,000 drunk drivers in 2024 alone.' },
      { id: 'dl_parking', title: 'Parking', icon: '🅿️', description: 'No parking on yellow lines, near metro stations (entry/exit), school zones, and emergency vehicle routes.', legal: 'MCD fines ₹2,000. Cranes tow vehicles from Connaught Place, Lajpat Nagar, and Rajouri Garden.', notes: 'Delhi has 79 multi-level parking facilities. Smart parking app covers 45,000+ spots across the city.' }
    ],
    challans: [
      { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'RLVD cameras at 1,000+ Delhi junctions. Highest issuance rate among Indian cities.', prevention: 'Stop at white line. Signal cycle awareness via Google Maps.' },
      { violation: 'Speeding', amount: '₹1,000 – ₹2,000', explanation: 'ANPR on Ring Roads, NH-48, NH-44, DND Flyway.', prevention: 'Speed limit varies by road. Check signs.' },
      { violation: 'Wrong Parking', amount: '₹2,000', explanation: 'Yellow-line areas, metro zones, school zones strictly monitored.', prevention: 'Use multi-level parking. Never park on footpaths.' },
      { violation: 'No Helmet', amount: '₹1,000', explanation: 'AI cameras + officer checks throughout the city.', prevention: 'Always wear ISI-certified helmet.' },
      { violation: 'Drunk Driving', amount: '₹10,000 + Jail', explanation: '200+ breathalyzer checkpoints every night.', prevention: 'Use Delhi Metro or cab. Zero compromise.' },
      { violation: 'No Seatbelt', amount: '₹1,000', explanation: 'Random naka checks + camera detection.', prevention: 'Buckle up before starting engine.' },
      { violation: 'Mobile Usage', amount: '₹1,000 – ₹10,000', explanation: 'AI cameras at 500+ junctions.', prevention: 'Hands-free only. Enable Do Not Disturb.' },
      { violation: 'Over-speeding in School Zone', amount: '₹5,000', explanation: '30 km/h limit in school zones strictly enforced 7–9 AM and 2–4 PM.', prevention: 'School zones marked in red. Always reduce speed.' }
    ],
    safetyInsights: [
      { category: 'Pollution Hazards', icon: '🏭', detail: 'Delhi\'s AQI regularly exceeds 400 in Nov–Jan. Smog reduces visibility to under 50m. Use fog lights. Consider postponing non-essential travel during red AQI alerts.' },
      { category: 'Night Driving', icon: '🌙', detail: 'Outer Ring Road sees highest late-night accident rate. Avoid ORR between 11 PM–4 AM especially on weekends.' },
      { category: 'Monsoon Hazards', icon: '🌧️', detail: 'Delhi underpasses and low-lying roads flood within 2 hours of heavy rain. Never drive through deep water. Palam, Minto Bridge, and ITO area underpasses most affected.' },
      { category: 'Highway Safety', icon: '🚛', detail: 'Delhi–Meerut Expressway: high speed zone. Truck overtaking causes 40% of accidents. Maintain safe distance.' },
      { category: 'Smog Season', icon: '🌫️', detail: 'November–January: stubble burning smog reduces visibility to near-zero on Yamuna Expressway and NH-58 at dawn. Never drive in zero-visibility conditions.' }
    ],
    accidentProneAreas: [
      { location: 'Mukarba Chowk, Outer Ring Road', riskLevel: 'Critical', reason: 'Multiple merge points + high speed + poorly lit at night.', recommendation: 'Slow to 40 km/h. Use overhead lane markers for navigation.' },
      { location: 'Dhaula Kuan Flyover', riskLevel: 'High', reason: 'Vehicles change directions abruptly at this major junction causing rear-end collisions.', recommendation: 'Stay in designated lane well in advance. No last-minute lane changes.' },
      { location: 'NH-48, Sheetla Mata Temple Turn', riskLevel: 'High', reason: 'U-turn location on high-speed highway causes head-on collisions.', recommendation: 'Use official U-turn 1 km ahead. Never stop on main carriageway.' },
      { location: 'Kalindi Kunj, Yamuna Bridge', riskLevel: 'High', reason: 'Narrow bridge + high volume + pedestrian intrusion.', recommendation: 'Use Delhi–Noida Direct flyway as alternate. Reduce to 40 km/h on bridge.' }
    ],
    notices: [
      { type: 'campaign', title: 'Delhi Trafffic Police Vision Zero 2025', message: 'Delhi committed to reducing road fatalities by 50% by 2027. Quarterly campaigns targeting signal jumping, speeding, and drunk driving.', date: 'May 2025' },
      { type: 'update', title: 'Pollution Check Enforcement Intensified', message: 'All petrol vehicles older than 15 years and diesel vehicles older than 10 years banned from Delhi roads. PUC mandatory at all toll points.', date: 'Apr 2025' },
      { type: 'reminder', title: 'Odd-Even Scheme Advisory', message: 'Odd-Even scheme may be activated during AQI emergencies. Follow EPCA advisories. Violations: ₹20,000 fine.', date: 'May 2025' },
      { type: 'safety', title: 'Night Driving Advisory on Expressways', message: 'Delhi Police advise against solo night driving on Yamuna Expressway between 11 PM and 5 AM.', date: 'Mar 2025' }
    ]
  },

  'Andhra Pradesh': {
    overview: {
      commonViolations: ['Speeding on NH-16', 'No Helmet', 'Drunk Driving in Rural Areas', 'Overloading'],
      highRiskDistricts: ['Visakhapatnam', 'Kurnool', 'Nellore', 'Guntur', 'Krishna'],
      majorConcerns: ['High fatality rate on NH-16 coastal corridor', 'Rural road accidents', 'Two-wheeler fatalities'],
      lastUpdated: 'May 2025',
      complianceRate: 70,
      trafficDensity: 'High'
    },
    rules: [
      { id: 'ap_helmet', title: 'Helmet Rules', icon: '🪖', description: 'ISI-certified helmets mandatory for all two-wheeler users across AP. AI cameras operational in Visakhapatnam, Vijayawada, Guntur.', legal: '₹1,000 fine. AP Traffic Police launched "Helmet Drive 2025" targeting rural areas with 10x enforcement.', notes: 'Andhra Pradesh has one of the highest two-wheeler fatality rates in India — helmet compliance is a top priority.' },
      { id: 'ap_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'Mandatory for all vehicle occupants. AP has intensified enforcement on National Highways after 2024 accident spikes.', legal: '₹1,000 per violation. Spot checks at all district headquarter entry points.', notes: 'AP enforces seatbelt rules especially strictly during Sankranti, Ugadi, and Dussehra festival seasons.' },
      { id: 'ap_speed', title: 'Speed Limits', icon: '⚡', description: 'Urban: 50 km/h. State highways: 80 km/h. NH-16: 100 km/h (cars). Construction zones: 40 km/h.', legal: '₹1,000–₹2,000. Radar enforcement active on NH-16 between Visakhapatnam and Vijayawada.', notes: 'AP\'s NH-16 (Amaravati–Visakhapatnam) has 8 speed enforcement zones. Average speed cameras being installed.' },
      { id: 'ap_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Banned while driving. AP Traffic Police spot-checks target highway truckers and cab drivers.', legal: '₹1,000–₹10,000. DL suspension possible for commercial vehicle drivers.', notes: 'AP\'s "Safe Drive, Save Life" program includes mobile phone awareness in 500+ schools.' },
      { id: 'ap_triple', title: 'Triple Riding', icon: '🏍️', description: 'Banned across all roads. Rural enforcement strengthened with gram panchayat involvement.', legal: '₹100–₹500. Enhanced monitoring near agricultural markets and festival processions.', notes: 'AP\'s rural two-wheeler accident rate includes triple-riding as a contributing factor in 22% of fatalities.' },
      { id: 'ap_drunk', title: 'Drunk Driving', icon: '🍺', description: 'BAC: 30 mg/100 ml. AP Police conducts mandatory breathalyzer checks at all State Highway tolls after 8 PM.', legal: '₹10,000 + imprisonment. Vehicle seized for 60 days on first offense in AP.', notes: 'AP has highest weekend drunk driving enforcement density — 300+ checkpoints every Friday and Saturday night.' },
      { id: 'ap_parking', title: 'Parking', icon: '🅿️', description: 'No parking on NHs, at junctions, or near temples/churches during festivals. AP enforces strict tow-away in Vijayawada and Visakhapatnam.', legal: '₹500–₹1,500. APSRTC bus stops and school zones have zero-tolerance parking policies.', notes: 'Amaravati (new capital) has planned parking infrastructure. Vijayawada smart parking in progress.' }
    ],
    challans: [
      { violation: 'Speeding on NH-16', amount: '₹1,000 – ₹2,000', explanation: 'Radar enforcement between Vijayawada and Visakhapatnam.', prevention: 'Never exceed 100 km/h on NH-16. Cargo trucks: 80 km/h max.' },
      { violation: 'No Helmet', amount: '₹1,000', explanation: 'AP\'s helmet drive targets rural riders who historically avoid helmets.', prevention: 'Helmet is not optional. ISI mark is legally required.' },
      { violation: 'Drunk Driving', amount: '₹10,000 + Jail', explanation: 'All NH toll plazas check BAC after 8 PM.', prevention: 'Festival season: arrange designated driver in advance.' },
      { violation: 'Overloading', amount: '₹2,000/tonne', explanation: 'Weigh bridges active on NH-16 and NH-65.', prevention: 'Document cargo weight. Never exceed GVW.' },
      { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'RLVD cameras operational at Vijayawada and Visakhapatnam city junctions.', prevention: 'Full stop at red. No exceptions.' },
      { violation: 'Expired PUC', amount: '₹10,000', explanation: 'AP intensifying PUC checks during monsoon season.', prevention: 'Renew PUC every 6 months. Online renewal available.' }
    ],
    safetyInsights: [
      { category: 'NH-16 Coastal Corridor', icon: '🛣️', detail: 'NH-16 between Nellore and Visakhapatnam has India\'s highest highway fatality density per km. Speed + lane indiscipline are primary causes.' },
      { category: 'Cyclone Season Risk', icon: '🌀', detail: 'Bay of Bengal cyclones (Oct–Dec) bring extreme rainfall to coastal AP. Avoid driving during cyclone alerts. Follow Cyclone Warning Center advisories.' },
      { category: 'Night Driving', icon: '🌙', detail: 'NH-16 night fatality rate peaks between 9 PM–3 AM. Inadequate lighting near Ongole and Naidupet stretches.' },
      { category: 'Festival Season', icon: '🎉', detail: 'Sankranti (Jan) creates peak traffic on all AP state routes. Expect 5–8 hour delays on Vijayawada–Hyderabad NH-65.' },
      { category: 'Rural Road Risks', icon: '🚜', detail: 'Agricultural vehicles (tractors, bullocks) on state roads without reflectors cause night accidents. Keep full-beam and reduce speed near farm areas after sunset.' }
    ],
    accidentProneAreas: [
      { location: 'NH-16, Ongole Bypass', riskLevel: 'Critical', reason: 'High-speed zone + frequent U-turns + inadequate lighting.', recommendation: 'Reduce to 70 km/h through bypass. No U-turns on NH.' },
      { location: 'Vijayawada–Eluru Road', riskLevel: 'High', reason: 'Heavy truck traffic + narrow stretches + poor road surface.', recommendation: 'Avoid overtaking. 60 km/h limit strictly.' },
      { location: 'Visakhapatnam Ghat Road (Simhachalam)', riskLevel: 'High', reason: 'Narrow ghat road + pilgrim traffic + seasonal rainfall.', recommendation: '30 km/h through ghat. One-way traffic during festival days.' },
      { location: 'Kurnool–Nandyal NH-340', riskLevel: 'Moderate', reason: 'Rocky terrain + limited visibility at bends.', recommendation: 'Honk before blind curves. 60 km/h maximum.' }
    ],
    notices: [
      { type: 'campaign', title: 'AP Road Safety Authority Drive 2025', message: 'Statewide 45-day drive targeting NH-16 speed violations, helmet compliance, and rural drunk driving.', date: 'May 2025' },
      { type: 'update', title: 'New Speed Cameras on NH-16', message: '50 new ANPR cameras added on NH-16 between Nellore and Ongole. Average speed enforcement coming Q4 2025.', date: 'Apr 2025' },
      { type: 'reminder', title: 'Cyclone Season Travel Advisory', message: 'NDRF and AP Police advise against coastal road travel during cyclone warnings. Activate location sharing before driving in coastal AP.', date: 'May 2025' },
      { type: 'safety', title: 'Rural Road Reflector Drive', message: 'AP Government distributing free reflective strips to all agricultural vehicles. Tractor owners can collect from nearest RTO.', date: 'Mar 2025' }
    ]
  },

  'Telangana': {
    overview: {
      commonViolations: ['No Helmet', 'Signal Jumping in Hyderabad', 'Speeding on ORR', 'Wrong Parking'],
      highRiskDistricts: ['Hyderabad', 'Rangareddy', 'Medchal', 'Warangal', 'Khammam'],
      majorConcerns: ['Hyderabad outer ring road speeding', 'Night accidents on NH-44', 'Drunk driving near Jubilee Hills'],
      lastUpdated: 'May 2025',
      complianceRate: 71,
      trafficDensity: 'Very High'
    },
    rules: [
      { id: 'ts_helmet', title: 'Helmet Rules', icon: '🪖', description: 'ISI helmets mandatory for both rider and pillion. Hyderabad Traffic Police cameras detect helmetless riders automatically.', legal: '₹1,000. Repeat violations: DL confiscated + court appearance mandatory.', notes: 'Hyderabad\'s 8,000+ CCTV cameras include helmet-detection AI covering all 60 traffic circles.' },
      { id: 'ts_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'All occupants must wear seatbelts. Hyderabad Police conduct regular seatbelt drives during peak hours.', legal: '₹1,000 per unbelted occupant.', notes: 'Enhanced enforcement near Hitec City, Gachibowli — tech park commuters frequently targeted.' },
      { id: 'ts_speed', title: 'Speed Limits', icon: '⚡', description: 'Hyderabad city: 60 km/h. ORR (Outer Ring Road): 100 km/h. NH-44: 100 km/h. Construction zones: 40 km/h.', legal: '₹1,000–₹2,000. ANPR cameras active on ORR at 20 points.', notes: 'ORR\'s high-speed limit (100 km/h) has been misused — average vehicle speed exceeds 130 km/h. Strict enforcement ongoing.' },
      { id: 'ts_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Complete ban. Hyderabad Traffic Police issue 2,000+ mobile-usage challans monthly.', legal: '₹1,000 – ₹10,000. Dangerous driving charges added for phone use on ORR.', notes: 'AI camera integration at 500 Hyderabad junctions feeds auto-challan system.' },
      { id: 'ts_triple', title: 'Triple Riding', icon: '🏍️', description: 'Banned across all Telangana roads. Strong enforcement near Osmania University and Jubilee Hills residential areas.', legal: '₹100–₹500.', notes: 'Hyderabad Traffic Police\'s Instagram-based awareness campaign reduced triple riding complaints by 30% in 2024.' },
      { id: 'ts_drunk', title: 'Drunk Driving', icon: '🍺', description: 'BAC: 30 mg/100 ml. Hyderabad Police operate 50+ naka checks every Friday and Saturday after 9 PM.', legal: '₹10,000 + 6 months imprisonment. Permanent record maintained in VAHAN database.', notes: 'Jubilee Hills, Banjara Hills, and Gachibowli checkpoints are Hyderabad\'s highest DUI arrest zones.' },
      { id: 'ts_parking', title: 'Parking', icon: '🅿️', description: 'No parking on Tank Bund, near TSRTC bus stops, PVNR Expressway, or in No-Parking zones marked by Hyderabad Traffic Police.', legal: 'Fines ₹500–₹2,000. Towing from Banjara Hills, Jubilee Hills, and HITEC City areas.', notes: 'GHMC smart parking operational in Secunderabad and Gachibowli. Parking app: Park Smart Hyderabad.' }
    ],
    challans: [
      { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'Hyderabad has 600+ RLVD cameras. Highest challan issuance in South India.', prevention: 'Anticipate signal phases. Never run yellow light.' },
      { violation: 'No Helmet', amount: '₹1,000', explanation: 'AI cameras detect helmetless riders at all major junctions.', prevention: 'Always wear ISI-certified helmet. Check chin strap.' },
      { violation: 'Speeding on ORR', amount: '₹1,000 – ₹2,000', explanation: 'ANPR cameras at 20 ORR points catch vehicles over 100 km/h.', prevention: 'Set speed alert at 95 km/h on navigation app.' },
      { violation: 'Wrong Parking', amount: '₹500 – ₹2,000', explanation: 'GHMC and Traffic Police coordinate towing drives in commercial areas.', prevention: 'Use GHMC multi-level parking. Never park on main roads.' },
      { violation: 'Drunk Driving', amount: '₹10,000 + Jail', explanation: '50+ naka points every Friday–Saturday night.', prevention: 'Use cab services for nightlife. Never compromise.' },
      { violation: 'Mobile Usage', amount: '₹1,000 – ₹10,000', explanation: 'AI camera detection + officer spot checks.', prevention: 'Use Bluetooth. Activate DND while driving.' },
      { violation: 'Expired PUC', amount: '₹10,000', explanation: 'RTA Telangana conducts surprise vehicle checks at ORR toll plazas.', prevention: 'Renew at any authorized PUC center. Cost: ₹80.' }
    ],
    safetyInsights: [
      { category: 'ORR Safety', icon: '🛣️', detail: 'Hyderabad\'s Outer Ring Road (ORR) — 158 km circular expressway. High-speed accidents near Shamshabad and Patancheru stretches. Maintain 100 km/h max.' },
      { category: 'Night Hazards', icon: '🌙', detail: 'NH-44 between Hyderabad and Nagpur: fatalities peak between 9 PM–3 AM. Animal crossings near Adilabad sections.' },
      { category: 'Monsoon', icon: '🌧️', detail: 'Hyderabad receives 800mm annual rainfall. August flash floods affect Malkajgiri, Uppal, and LB Nagar underpasses. Monitor GHMC flood alerts.' },
      { category: 'Tech Corridor', icon: '🏢', detail: 'HITEC City–Gachibowli belt: peak congestion 8–10 AM and 6–9 PM. Extremely high two-wheeler density increases collision risk.' },
      { category: 'Festival Season', icon: '🎉', detail: 'Ganesh Chaturthi and Bonalu create massive processions on Tank Bund and Old City roads. Expect 6–8 hour delays. Plan alternate routes.' }
    ],
    accidentProneAreas: [
      { location: 'ORR–Narsingi Interchange', riskLevel: 'Critical', reason: 'High speed + sudden merge + poor lane discipline.', recommendation: '80 km/h approaching interchange. Use lane markings strictly.' },
      { location: 'Mehdipatnam–Attapur Flyover', riskLevel: 'High', reason: 'High vehicle density + steep flyover gradient + water pooling in monsoon.', recommendation: 'Reduce speed in rain. Avoid heavy vehicles using this flyover.' },
      { location: 'NH-44 near Zaheerabad', riskLevel: 'High', reason: 'High truck traffic + limited lighting + animal crossings.', recommendation: '70 km/h at night. Use high beam in open stretches.' },
      { location: 'Shamshabad Airport Stretch', riskLevel: 'Moderate', reason: 'High cab/taxi traffic + airport approach lane confusion.', recommendation: 'Follow lane markers. Allow airport traffic to merge safely.' }
    ],
    notices: [
      { type: 'campaign', title: 'Hyderabad Road Safety Week 2025', message: 'Rachakonda, Cyberabad, and Hyderabad commissionerates launched joint 7-day blitz targeting signal jumping and helmet violations.', date: 'May 2025' },
      { type: 'update', title: 'ANPR Camera Expansion on ORR', message: 'Telangana State Road Transport Corporation adds 60 new ANPR cameras on ORR by September 2025.', date: 'Apr 2025' },
      { type: 'reminder', title: 'Monsoon Flood Safety Advisory', message: 'Avoid waterlogged underpasses during monsoon. GHMC early warning system sends SMS alerts — register at ghmc.gov.in.', date: 'May 2025' },
      { type: 'safety', title: 'Cybercrime–Traffic Integration', message: 'Hyderabad Police integrates traffic violation records with cybercrime database to flag license fraud and ownership manipulation.', date: 'Mar 2025' }
    ]
  }
};

// Fallback data for states without full data
const FALLBACK_STATE = {
  overview: {
    commonViolations: ['Speeding', 'No Helmet', 'Signal Jumping', 'Mobile Phone Usage'],
    highRiskDistricts: ['State Capital', 'Major Urban Centers', 'Highway Corridors'],
    majorConcerns: ['Urban traffic congestion', 'Two-wheeler safety', 'Night driving risks'],
    lastUpdated: 'May 2025',
    complianceRate: 70,
    trafficDensity: 'High'
  },
  rules: [
    { id: 'fb_helmet', title: 'Helmet Rules', icon: '🪖', description: 'ISI-certified helmet mandatory for rider and pillion on all roads.', legal: 'Section 129 MV Act — ₹1,000 fine.', notes: 'Helmet compliance reduces head injury risk by 69%. BIS-marked helmets only.' },
    { id: 'fb_seatbelt', title: 'Seatbelt Rules', icon: '🚗', description: 'All car occupants must wear seatbelts, including rear passengers.', legal: 'Section 194B MV Act — ₹1,000 per unbelted occupant.', notes: 'Seatbelts reduce fatality risk in crashes by 40%. Buckle up before ignition.' },
    { id: 'fb_speed', title: 'Speed Limits', icon: '⚡', description: 'Urban: 50 km/h. State Highways: 80 km/h. National Highways: 100 km/h for cars.', legal: 'Section 183 MV Act — ₹1,000–₹2,000. ANPR cameras deployed at key points.', notes: 'Maintain 5 km/h buffer below limit. Speed adapts to weather and road conditions.' },
    { id: 'fb_mobile', title: 'Mobile Phone Usage', icon: '📱', description: 'Handheld phone usage while driving is strictly prohibited at all times.', legal: 'Section 184 — ₹1,000 (1st offense), ₹10,000 for repeat offenders.', notes: 'Using a phone while driving multiplies crash risk by 4x. Use Bluetooth or DND.' },
    { id: 'fb_triple', title: 'Triple Riding', icon: '🏍️', description: 'Two-wheelers limited to maximum two occupants at all times.', legal: 'Section 128 MV Act — ₹100–₹500 fine.', notes: 'Three riders destabilize vehicle and significantly impair braking capability.' },
    { id: 'fb_drunk', title: 'Drunk Driving', icon: '🍺', description: 'BAC limit: 30 mg/100 ml. Zero tolerance enforcement on all major roads.', legal: 'Section 185 — ₹10,000 + 6 months imprisonment for first offense.', notes: 'Even one drink can impair reaction time. Use a designated driver or cab.' },
    { id: 'fb_parking', title: 'Parking Rules', icon: '🅿️', description: 'No parking near junctions, bus stops, fire hydrants, or on marked yellow-line roads.', legal: 'Municipal fines ₹500–₹2,000. Vehicles towed from no-parking zones.', notes: 'Always use designated parking. Illegal parking contributes to traffic congestion and accidents.' }
  ],
  challans: [
    { violation: 'Speeding', amount: '₹1,000 – ₹2,000', explanation: 'Detected by radar/ANPR cameras on highways and city roads.', prevention: 'Maintain speed within posted limits. Use navigation speed alerts.' },
    { violation: 'Signal Jumping', amount: '₹1,000 – ₹5,000', explanation: 'RLVD cameras at major intersections auto-generate challans.', prevention: 'Full stop at red light. Wait for green before proceeding.' },
    { violation: 'No Helmet', amount: '₹1,000', explanation: 'Camera detection and officer spot checks enforce helmet rules.', prevention: 'Always wear ISI-certified helmet with fastened chin strap.' },
    { violation: 'No Seatbelt', amount: '₹1,000', explanation: 'Spot checks and camera detection at major checkpoints.', prevention: 'Buckle up before starting engine. All passengers must comply.' },
    { violation: 'Mobile Usage', amount: '₹1,000 – ₹10,000', explanation: 'Handheld phone detected by cameras or officers.', prevention: 'Use Bluetooth. Enable Do Not Disturb while driving.' },
    { violation: 'Drunk Driving', amount: '₹10,000 + Imprisonment', explanation: 'Breathalyzer checks at night checkpoints and highway tolls.', prevention: 'Never drink and drive. Use cab or designate a sober driver.' },
    { violation: 'Expired PUC', amount: '₹10,000', explanation: 'PUC checked at toll plazas and during vehicle inspection drives.', prevention: 'Renew every 6 months. Cost ₹60–₹100 at authorized centers.' }
  ],
  safetyInsights: [
    { category: 'High-Risk Corridors', icon: '🛣️', detail: 'National and state highways carry highest accident rates. Maintain lane discipline and safe following distance at all times.' },
    { category: 'Night Driving', icon: '🌙', detail: 'Over 50% of road fatalities occur at night. Use high beam on open roads, dip for oncoming traffic. Never drive sleepy.' },
    { category: 'Weather Risks', icon: '🌧️', detail: 'Monsoon season (Jun–Sep) increases accident risk on all roads. Reduce speed by 30%, increase following distance, use wipers and low-beam headlights.' },
    { category: 'Highway Safety', icon: '🚛', detail: 'Maintain 100m following distance behind trucks on highways. Never overtake at blind curves or on crests. Use indicators early.' },
    { category: 'Seasonal Warnings', icon: '☀️', detail: 'Summer heat (Mar–May) causes tire blowouts and driver fatigue. Check tire pressure, carry water, take breaks every 2 hours.' }
  ],
  accidentProneAreas: [
    { location: 'Major City Entry/Exit Points', riskLevel: 'High', reason: 'Heavy mixed traffic, pedestrian crossings, and varying speed limits.', recommendation: 'Slow down approaching city limits. Observe local speed restrictions.' },
    { location: 'National Highway Junctions', riskLevel: 'High', reason: 'High-speed vehicles meeting local traffic at uncontrolled junctions.', recommendation: 'Slow down at all NH junctions. Watch for vehicles crossing from side roads.' },
    { location: 'School and Hospital Zones', riskLevel: 'Moderate', reason: 'Pedestrian density, irregular stopping, and emergency vehicles.', recommendation: 'Reduce to 30 km/h near schools/hospitals. Never honk near hospitals.' },
    { location: 'Night Market Areas', riskLevel: 'Moderate', reason: 'Encroachment on road, poor lighting, and drunk pedestrians.', recommendation: 'Reduce to 20 km/h near night markets. Stay alert for pedestrians stepping into road.' }
  ],
  notices: [
    { type: 'reminder', title: 'Keep Your Documents Updated', message: 'Ensure your Driving License, RC, Insurance, and PUC are valid and accessible at all times. Digital copies on DigiLocker are legally valid.', date: 'May 2025' },
    { type: 'safety', title: 'National Road Safety Month', message: 'Ministry of Road Transport & Highways observes January as National Road Safety Month. Participate in awareness drives in your district.', date: 'Jan 2025' },
    { type: 'campaign', title: 'Good Samaritan Guidelines', message: 'Helping accident victims is now legally protected. Good Samaritans cannot be harassed by police. Call 112 immediately after witnessing any accident.', date: 'Dec 2024' },
    { type: 'update', title: 'e-Challan Payment Portal', message: 'Pay traffic challans online at echallan.parivahan.gov.in. Virtual court appearances now accepted for minor violations.', date: 'Apr 2025' }
  ]
};

// Ensure all states have data
const getStateData = (stateName) => STATE_DATA[stateName] || FALLBACK_STATE;

const NOTICE_STYLES = {
  campaign: { color: 'from-sky-500/20 to-indigo-500/20', border: 'border-sky-500/30', tag: 'bg-sky-500/20 text-sky-400', icon: Radio, label: 'Campaign' },
  update: { color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', tag: 'bg-emerald-500/20 text-emerald-400', icon: TrendingUp, label: 'Update' },
  reminder: { color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', tag: 'bg-amber-500/20 text-amber-400', icon: Bell, label: 'Reminder' },
  safety: { color: 'from-rose-500/20 to-pink-500/20', border: 'border-rose-500/30', tag: 'bg-rose-500/20 text-rose-400', icon: ShieldCheck, label: 'Safety' }
};

const RISK_STYLES = {
  Critical: { badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30', dot: 'bg-rose-400' },
  High: { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', dot: 'bg-amber-400' },
  Moderate: { badge: 'bg-sky-500/20 text-sky-400 border border-sky-500/30', dot: 'bg-sky-400' }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const StateTrafficExplorer = () => {
  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [searchQuery, setSearchQuery] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareStateA, setCompareStateA] = useState('Tamil Nadu');
  const [compareStateB, setCompareStateB] = useState('Karnataka');
  const [expandedSection, setExpandedSection] = useState(null);

  const stateData = getStateData(selectedState);

  const filteredStates = useMemo(() =>
    ALL_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())),
    [stateSearch]
  );

  // Search filter — covers all sections
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return stateData;
    const q = searchQuery.toLowerCase();
    return {
      ...stateData,
      rules: stateData.rules.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.legal.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      ),
      challans: stateData.challans.filter(c =>
        c.violation.toLowerCase().includes(q) ||
        c.explanation.toLowerCase().includes(q) ||
        c.prevention.toLowerCase().includes(q) ||
        c.amount.toLowerCase().includes(q)
      ),
      documents: COMMON_DOCUMENTS.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.purpose.toLowerCase().includes(q) ||
        d.violations.toLowerCase().includes(q) ||
        d.validity.toLowerCase().includes(q) ||
        d.renewal.toLowerCase().includes(q)
      ),
      safetyInsights: stateData.safetyInsights.filter(s =>
        s.category.toLowerCase().includes(q) ||
        s.detail.toLowerCase().includes(q)
      ),
      accidentProneAreas: stateData.accidentProneAreas.filter(a =>
        a.location.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        a.recommendation.toLowerCase().includes(q) ||
        a.riskLevel.toLowerCase().includes(q)
      ),
      notices: stateData.notices.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
      )
    };
  }, [searchQuery, stateData]);

  const hasResults = searchQuery.trim() && (
    filteredData.rules.length > 0 ||
    filteredData.challans.length > 0 ||
    (filteredData.documents || []).length > 0 ||
    filteredData.safetyInsights.length > 0 ||
    filteredData.accidentProneAreas.length > 0 ||
    filteredData.notices.length > 0
  );

  const displayDocuments = searchQuery.trim() ? (filteredData.documents || []) : COMMON_DOCUMENTS;

  const totalResults = searchQuery.trim()
    ? filteredData.rules.length + filteredData.challans.length +
      displayDocuments.length + filteredData.safetyInsights.length +
      filteredData.accidentProneAreas.length + filteredData.notices.length
    : null;

  const selectState = (state) => {
    setSelectedState(state);
    setShowStateDropdown(false);
    setStateSearch('');
    setExpandedSection(null);
  };

  const logSectionView = async (moduleId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await axios.post(`${API_URL}/api/auth/learning/view`, { moduleId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Dispatch authentication state changed event so Navbar updates scores in real-time
      window.dispatchEvent(new Event('auth-state-changed'));
    } catch (err) {
      console.error("Failed to log learning module view:", err.message);
    }
  };

  const handleToggleSection = (id) => {
    const isExpanding = expandedSection !== id;
    setExpandedSection(isExpanding ? id : null);
    if (isExpanding) {
      logSectionView(id);
    }
  };

  const SectionHeader = ({ id, icon: Icon, title, count, color }) => (
    <div
      className="flex items-center justify-between cursor-pointer select-none group"
      onClick={() => handleToggleSection(id)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} border border-white/5`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-black text-white group-hover:text-sky-300 transition-colors">{title}</h2>
          {count !== undefined && <span className="text-[10px] text-slate-500 font-semibold">{count} items</span>}
        </div>
      </div>
      <motion.div animate={{ rotate: expandedSection === id ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
      </motion.div>
    </div>
  );

  // Compare States Table
  const COMPARE_FIELDS = [
    { label: 'Helmet Fine', extract: (d) => d.challans?.find(c => c.violation.toLowerCase().includes('helmet'))?.amount || 'N/A' },
    { label: 'Seatbelt Fine', extract: (d) => d.challans?.find(c => c.violation.toLowerCase().includes('seatbelt') || c.violation.toLowerCase().includes('seat'))?.amount || '₹1,000' },
    { label: 'Speeding Fine', extract: (d) => d.challans?.find(c => c.violation.toLowerCase().includes('speed'))?.amount || '₹1,000–₹2,000' },
    { label: 'Drunk Driving Fine', extract: (d) => d.challans?.find(c => c.violation.toLowerCase().includes('drunk'))?.amount || '₹10,000+' },
    { label: 'PUC Fine', extract: (d) => d.challans?.find(c => c.violation.toLowerCase().includes('puc'))?.amount || '₹10,000' },
    { label: 'Compliance Rate', extract: (d) => `${d.overview?.complianceRate || 70}%` },
    { label: 'Traffic Density', extract: (d) => d.overview?.trafficDensity || 'High' },
    { label: 'Common Violations', extract: (d) => (d.overview?.commonViolations || []).slice(0, 2).join(', ') }
  ];

  return (
    <div className="pt-20 min-h-screen bg-[#070b14] text-slate-100 font-sans pb-20 relative overflow-x-hidden">

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-500/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/3 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/30 px-4 py-1.5 rounded-full text-sky-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Navigation className="w-3.5 h-3.5" />
            Traffic Intelligence Portal
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-sky-100 to-indigo-300 leading-tight">
            State Traffic Rules &<br className="hidden sm:block" /> Safety Explorer
          </h1>
          <p className="text-slate-400 text-sm mt-3 max-w-2xl leading-relaxed">
            Explore state-specific traffic regulations, challan penalties, compliance requirements, accident hotspots, and road safety insights across India.
          </p>
        </motion.div>

        {/* ── TOP CONTROLS ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">

          {/* State Selector */}
          <div className="relative flex-1 sm:max-w-xs">
            <button
              onClick={() => setShowStateDropdown(v => !v)}
              className="w-full flex items-center justify-between gap-3 bg-slate-900/80 border border-slate-700 hover:border-sky-500/50 px-4 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all group"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>{selectedState}</span>
              </div>
              <motion.div animate={{ rotate: showStateDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showStateDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-slate-900">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search state..."
                        value={stateSearch}
                        onChange={e => setStateSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-2">
                    {filteredStates.map(state => (
                      <button
                        key={state}
                        onClick={() => selectState(state)}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                          selectedState === state
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        {selectedState === state && <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        <span className={selectedState === state ? '' : 'ml-5'}>{state}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search rules, penalties, documents, safety tips..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 hover:border-sky-500/30 focus:border-sky-500/50 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Compare Button */}
          <button
            onClick={() => setCompareMode(v => !v)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all border ${
              compareMode
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900/80 border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="hidden sm:inline">Compare States</span>
          </button>
        </div>

        {/* Search result count */}
        {searchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-5 flex items-center gap-2"
          >
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              totalResults > 0
                ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}>
              {totalResults > 0 ? (
                <><Activity className="w-3 h-3" />{totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"</>
              ) : (
                <><AlertTriangle className="w-3 h-3" />No matching results found for "{searchQuery}"</>
              )}
            </div>
          </motion.div>
        )}

        {/* ── COMPARE STATES PANEL ────────────────────────────────────────────── */}
        <AnimatePresence>
          {compareMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 bg-slate-950/70 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/5"
            >
              <div className="p-5 border-b border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-xl">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">Compare States</h2>
                    <p className="text-[10px] text-slate-500">Side-by-side traffic regulation comparison</p>
                  </div>
                </div>
                <button onClick={() => setCompareMode(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                {/* State pickers */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'State A', value: compareStateA, set: setCompareStateA },
                    { label: 'State B', value: compareStateB, set: setCompareStateB }
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">{label}</span>
                      <select
                        value={value}
                        onChange={e => set(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/70 transition-all"
                      >
                        {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Compare Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-1/3">Metric</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black text-sky-400 uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />{compareStateA}
                          </div>
                        </th>
                        <th className="text-left px-4 py-3 text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />{compareStateB}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARE_FIELDS.map((field, idx) => {
                        const dataA = getStateData(compareStateA);
                        const dataB = getStateData(compareStateB);
                        const valA = field.extract(dataA);
                        const valB = field.extract(dataB);
                        return (
                          <tr key={field.label} className={`border-b border-slate-900/50 ${idx % 2 === 0 ? 'bg-slate-950/40' : ''}`}>
                            <td className="px-4 py-3 text-xs text-slate-400 font-semibold">{field.label}</td>
                            <td className="px-4 py-3 text-xs text-white font-bold">{valA}</td>
                            <td className="px-4 py-3 text-xs text-white font-bold">{valB}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-slate-600 mt-3 text-center">
                  Data based on Motor Vehicles Act 2019 and state-specific amendments. Future: integrates live RTO & State Traffic APIs.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATE OVERVIEW CARD ─────────────────────────────────────────────── */}
        {!searchQuery.trim() && (
          <motion.div
            key={selectedState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-br from-slate-950/80 to-slate-900/60 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl"
          >
            <div className="p-5 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 rounded-2xl border border-sky-500/20">
                  <Activity className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">{selectedState}</h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      State Overview
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Updated {stateData.overview.lastUpdated}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Car className="w-3 h-3" /> {stateData.overview.trafficDensity} Density
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Compliance Rate</div>
                  <div className={`text-2xl font-black ${
                    stateData.overview.complianceRate >= 80 ? 'text-emerald-400' :
                    stateData.overview.complianceRate >= 70 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{stateData.overview.complianceRate}%</div>
                </div>
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={stateData.overview.complianceRate >= 80 ? '#34d399' : stateData.overview.complianceRate >= 70 ? '#fbbf24' : '#f87171'}
                      strokeWidth="3"
                      strokeDasharray={`${stateData.overview.complianceRate}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/50">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TriangleAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Common Violations</span>
                </div>
                <ul className="space-y-1.5">
                  {stateData.overview.commonViolations.map((v, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">High-Risk Districts</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stateData.overview.highRiskDistricts.map((d, i) => (
                    <span key={i} className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2.5 py-1 rounded-lg">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BadgeAlert className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Major Safety Concerns</span>
                </div>
                <ul className="space-y-1.5">
                  {stateData.overview.majorConcerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── MAIN CONTENT SECTIONS ────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Section 1: Traffic Rules */}
          {filteredData.rules.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950/70 border border-slate-800/60 rounded-3xl overflow-hidden"
            >
              <div className="p-5">
                <SectionHeader
                  id="rules"
                  icon={BookOpen}
                  title="Traffic Rules & Regulations"
                  count={filteredData.rules.length}
                  color="from-sky-500/30 to-indigo-500/30"
                />
              </div>

              <AnimatePresence>
                {(expandedSection === 'rules' || searchQuery.trim()) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredData.rules.map(rule => (
                        <div key={rule.id} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 hover:border-sky-500/30 transition-all group">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-2xl shrink-0">{rule.icon}</span>
                            <div>
                              <h3 className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">{rule.title}</h3>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rule.description}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider block mb-0.5">Legal Requirement</span>
                              <p className="text-xs text-rose-200/80 leading-relaxed">{rule.legal}</p>
                            </div>
                            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2">
                              <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider block mb-0.5">Awareness Notes</span>
                              <p className="text-xs text-sky-200/80 leading-relaxed">{rule.notes}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Section 2: Challans & Penalties */}
          {filteredData.challans.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-slate-950/70 border border-slate-800/60 rounded-3xl overflow-hidden"
            >
              <div className="p-5">
                <SectionHeader
                  id="challans"
                  icon={IndianRupee}
                  title="Common Challans & Penalties"
                  count={filteredData.challans.length}
                  color="from-amber-500/30 to-orange-500/30"
                />
              </div>

              <AnimatePresence>
                {(expandedSection === 'challans' || searchQuery.trim()) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-5 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800">
                            <th className="text-left pb-3 px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Violation</th>
                            <th className="text-left pb-3 px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Fine</th>
                            <th className="text-left pb-3 px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Explanation</th>
                            <th className="text-left pb-3 px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Prevention</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/50">
                          {filteredData.challans.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-900/30 transition-all group">
                              <td className="py-3 px-3">
                                <span className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">{c.violation}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-xs font-black text-amber-400 whitespace-nowrap">{c.amount}</span>
                              </td>
                              <td className="py-3 px-3 hidden md:table-cell">
                                <span className="text-xs text-slate-400 leading-relaxed">{c.explanation}</span>
                              </td>
                              <td className="py-3 px-3 hidden lg:table-cell">
                                <span className="text-xs text-emerald-400 font-semibold">{c.prevention}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Section 3: Required Documents */}
          {displayDocuments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-950/70 border border-slate-800/60 rounded-3xl overflow-hidden"
            >
              <div className="p-5">
                <SectionHeader
                  id="documents"
                  icon={FileText}
                  title="Required Documents"
                  count={displayDocuments.length}
                  color="from-emerald-500/30 to-teal-500/30"
                />
              </div>

              <AnimatePresence>
                {(expandedSection === 'documents' || searchQuery.trim()) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayDocuments.map(doc => (
                        <div key={doc.id} className={`bg-gradient-to-br ${doc.color} border ${doc.border} rounded-2xl p-4 hover:shadow-lg transition-all`}>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{doc.emoji}</span>
                            <div>
                              <h3 className="text-sm font-black text-white">{doc.title}</h3>
                              <span className={`text-[9px] font-black uppercase tracking-wider ${doc.tag}`}>Mandatory Document</span>
                            </div>
                          </div>
                          <div className="space-y-2.5 text-xs">
                            <div>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Purpose</span>
                              <p className="text-slate-300 leading-relaxed">{doc.purpose}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Validity</span>
                              <p className="text-slate-300 leading-relaxed">{doc.validity}</p>
                            </div>
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider block mb-0.5">Violation Consequences</span>
                              <p className="text-rose-200/80 leading-relaxed">{doc.violations}</p>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block mb-0.5">Renewal Guidance</span>
                              <p className="text-emerald-200/80 leading-relaxed">{doc.renewal}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Section 4: Road Safety Insights */}
          {filteredData.safetyInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-950/70 border border-slate-800/60 rounded-3xl overflow-hidden"
            >
              <div className="p-5">
                <SectionHeader
                  id="safety"
                  icon={Eye}
                  title="Road Safety Insights"
                  count={filteredData.safetyInsights.length}
                  color="from-indigo-500/30 to-purple-500/30"
                />
              </div>

              <AnimatePresence>
                {(expandedSection === 'safety' || searchQuery.trim()) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredData.safetyInsights.map((insight, i) => (
                        <div key={i} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{insight.icon}</span>
                            <h3 className="text-xs font-black text-indigo-300">{insight.category}</h3>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{insight.detail}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Section 5: Accident-Prone Areas */}
          {filteredData.accidentProneAreas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-950/70 border border-slate-800/60 rounded-3xl overflow-hidden"
            >
              <div className="p-5">
                <SectionHeader
                  id="hotspots"
                  icon={AlertTriangle}
                  title="Accident-Prone Areas"
                  count={filteredData.accidentProneAreas.length}
                  color="from-rose-500/30 to-orange-500/30"
                />
              </div>

              <AnimatePresence>
                {(expandedSection === 'hotspots' || searchQuery.trim()) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-5 space-y-3">
                      {filteredData.accidentProneAreas.map((area, i) => {
                        const riskStyle = RISK_STYLES[area.riskLevel] || RISK_STYLES.Moderate;
                        return (
                          <div key={i} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 hover:border-rose-500/20 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${riskStyle.dot} shrink-0 animate-pulse`} />
                                <h3 className="text-sm font-black text-white">{area.location}</h3>
                              </div>
                              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${riskStyle.badge} shrink-0`}>
                                {area.riskLevel} Risk
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider block mb-0.5">Why It's Dangerous</span>
                                <p className="text-slate-300 leading-relaxed">{area.reason}</p>
                              </div>
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block mb-0.5">Recommended Precautions</span>
                                <p className="text-slate-300 leading-relaxed">{area.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Section 6: Important Notices */}
          {filteredData.notices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-slate-950/70 border border-slate-800/60 rounded-3xl overflow-hidden"
            >
              <div className="p-5">
                <SectionHeader
                  id="notices"
                  icon={Bell}
                  title="Important Notices"
                  count={filteredData.notices.length}
                  color="from-teal-500/30 to-cyan-500/30"
                />
              </div>

              <AnimatePresence>
                {(expandedSection === 'notices' || searchQuery.trim()) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredData.notices.map((notice, i) => {
                        const style = NOTICE_STYLES[notice.type] || NOTICE_STYLES.reminder;
                        const NoticeIcon = style.icon;
                        return (
                          <div key={i} className={`bg-gradient-to-br ${style.color} border ${style.border} rounded-2xl p-4 hover:shadow-lg transition-all`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <NoticeIcon className="w-4 h-4 text-current shrink-0" style={{ color: 'inherit' }} />
                                <h3 className="text-sm font-black text-white">{notice.title}</h3>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${style.tag} shrink-0`}>
                                {style.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">{notice.message}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <Clock className="w-3 h-3" />
                              {notice.date}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* No results state */}
          {searchQuery.trim() && totalResults === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-black text-white mb-2">No matching results found</h3>
              <p className="text-slate-500 text-sm">Try searching for "helmet", "insurance", "speeding", or "PUC"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-6 px-5 py-2.5 bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold text-sm rounded-xl hover:bg-sky-500/30 transition-all"
              >
                Clear Search
              </button>
            </motion.div>
          )}

          {/* Quick-expand help when not searching and nothing expanded */}
          {!searchQuery.trim() && !expandedSection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-slate-600 text-xs"
            >
              <Zap className="w-4 h-4 mx-auto mb-2 text-slate-700" />
              Click any section above to expand it, or use the search bar to instantly filter content across all sections.
            </motion.div>
          )}

        </div>

        {/* Footer data note */}
        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-600">
          <p>Data based on Motor Vehicles Act 2019 and state-specific amendments. Subject to change.</p>
          <p className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-sky-700" />
            API-ready architecture — integrates with State Traffic APIs, RTO Circulars & Challan Databases
          </p>
        </div>

      </div>
    </div>
  );
};

export default StateTrafficExplorer;
