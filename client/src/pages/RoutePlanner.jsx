import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import {
  Navigation,
  MapPin,
  Clock,
  Sparkles,
  Loader2,
  ChevronDown,
  History,
  ZoomIn,
  ZoomOut,
  Flag,
  RotateCcw,
  X,
  AlertCircle,
  AlertOctagon,
  Locate,
  Settings,
  ArrowRight,
  IndianRupee,
  AlertTriangle,
  Plus
} from 'lucide-react';
import axios from 'axios';
import L from 'leaflet';

// Leaflet markers fix
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const INDIA_BOUNDS = [
  [6.5, 68.0],
  [37.5, 97.5]
];

// Helper: Haversine distance in km between two sets of coordinates
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper: Format duration from minutes to Xh Ym format
const formatDuration = (mins) => {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
};

// Sub-component to fit map bounds to the route geometry automatically
const MapRefitter = ({ coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [120, 120], maxZoom: 14 });
    }
  }, [coordinates, map]);
  return null;
};

// Sub-component to pan/zoom map smoothly when center changes
const ChangeMapCenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

// Sub-component to trigger invalidation of Leaflet map layout on sidebar toggle transitions
const MapResizeTrigger = ({ isCollapsed }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 350); // Matches CSS transitions
    return () => clearTimeout(timer);
  }, [isCollapsed, map]);
  return null;
};

// Custom HTML DivIcons using premium glassmorphism layouts and ping animations
const hotspotIcon = L.divIcon({
  className: 'custom-hotspot-marker',
  html: `<div class="relative flex items-center justify-center">
    <div class="absolute w-8 h-8 rounded-full bg-rose-500 opacity-60 animate-ping"></div>
    <div class="relative w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center">
      <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
    </div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const speedCameraIcon = L.divIcon({
  className: 'custom-camera-marker',
  html: `<div class="relative flex items-center justify-center p-1.5 rounded-full bg-emerald-955/95 border border-emerald-500 shadow-lg text-emerald-450">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const anprCameraIcon = L.divIcon({
  className: 'custom-anpr-marker',
  html: `<div class="relative flex items-center justify-center p-1.5 rounded-full bg-sky-955/95 border border-sky-500 shadow-lg text-sky-400">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const policeCheckpointIcon = L.divIcon({
  className: 'custom-police-marker',
  html: `<div class="relative flex items-center justify-center p-1.5 rounded-full bg-amber-955/95 border border-amber-500 shadow-lg text-amber-400">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const RoutePlanner = () => {
  // Navigation & Address Inputs
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');

  // Nominatim Autocomplete lists & focus states
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWhyRecommendedOpen, setIsWhyRecommendedOpen] = useState(false);

  const [basemap, setBasemap] = useState('streets');
  const basemapUrls = {
    streets: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  // Core Route Safety Analysis variables
  const [routeData, setRouteData] = useState(null);
  const [assessment, setAssessment] = useState(null);

  // Telemetry & Documents
  const [telemetry, setTelemetry] = useState({
    complianceScore: 100,
    travelReadinessScore: 100,
    violationRiskScore: 10,
    awarenessScore: 0,
    documentStatus: {}
  });
  const [documents, setDocuments] = useState([]);

  // Live Overlays & History state
  const [hotspotsList, setHotspotsList] = useState([]);
  const [enforcementZones, setEnforcementZones] = useState([]);
  const [pastReports, setPastReports] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  // Map view scopes - INDIA ONLY
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([22.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');

  const getAuthHeaders = () => {
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load cache on mount
  useEffect(() => {
    const cached = localStorage.getItem('drivelegal_recent_searches');
    if (cached) {
      setRecentSearches(JSON.parse(cached));
    }
  }, []);

  const saveRecentSearch = (source, destination) => {
    const term = `${source.split(',')[0]} ➜ ${destination.split(',')[0]}`;
    let list = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(list);
    localStorage.setItem('drivelegal_recent_searches', JSON.stringify(list));
  };

  // Fetch telemetry, documents and master overlays on mount
  const fetchBaseData = async () => {
    if (!token) return;
    try {
      const telRes = await axios.get(`${API_URL}/auth/telemetry`, getAuthHeaders());
      if (telRes.data?.success) {
        setTelemetry(telRes.data.telemetry);
      }

      const docsRes = await axios.get(`${API_URL}/documents`, getAuthHeaders());
      if (docsRes.data?.success) {
        setDocuments(docsRes.data.documents);
      }

      const reportsRes = await axios.get(`${API_URL}/navigation/past-reports`, getAuthHeaders());
      if (reportsRes.data?.success) {
        setPastReports(reportsRes.data.reports.slice(0, 10));
      }

      const spotsRes = await axios.get(`${API_URL}/navigation/hotspots`);
      if (spotsRes.data?.success) {
        setHotspotsList(spotsRes.data.hotspots);
      }

      const zonesRes = await axios.get(`${API_URL}/navigation/enforcement-zones`);
      if (zonesRes.data?.success) {
        setEnforcementZones(zonesRes.data.zones);
      }
    } catch (err) {
      console.error("Failed to fetch initial Route Planner data:", err.message);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  // Debounced Nominatim autocomplete for Source
  useEffect(() => {
    if (!startPoint || startPoint.length < 3) {
      setSourceSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(startPoint)}&format=json&limit=5&countrycodes=in`);
        setSourceSuggestions(res.data || []);
      } catch (err) {
        console.error("Source Nominatim fetch error:", err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [startPoint]);

  // Debounced Nominatim autocomplete for Destination
  useEffect(() => {
    if (!endPoint || endPoint.length < 3) {
      setDestSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endPoint)}&format=json&limit=5&countrycodes=in`);
        setDestSuggestions(res.data || []);
      } catch (err) {
        console.error("Dest Nominatim fetch error:", err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [endPoint]);

  // GPS Locate device handler
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      triggerToast("Geolocation is not supported by your browser.", "warning");
      return;
    }
    setIsLocating(true);
    triggerToast("Accessing device geolocation...", "success");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.data && res.data.display_name) {
            setStartPoint(res.data.display_name);
            setMapCenter([latitude, longitude]);
            setMapZoom(12);
            triggerToast("Location successfully resolved!", "success");
          } else {
            setStartPoint(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            setMapCenter([latitude, longitude]);
            setMapZoom(12);
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setStartPoint(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setMapCenter([latitude, longitude]);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        triggerToast("Failed to retrieve location. Please check browser permissions.", "error");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Swap Source/Destination
  const handleSwapLocations = () => {
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
    triggerToast("Swapped locations", "success");
  };

  // Main analyze safety execution
  const handleAnalyzeSafety = async (e) => {
    if (e) e.preventDefault();
    if (!startPoint.trim() || !endPoint.trim()) {
      triggerToast("Please enter both start and destination points.", "warning");
      return;
    }

    setIsLoading(true);
    setRouteData(null);
    setAssessment(null);
    setSelectedHotspot(null);
    setShowSourceDropdown(false);
    setShowDestDropdown(false);

    try {
      const res = await axios.post(`${API_URL}/navigation/analyze`, {
        source: startPoint,
        destination: endPoint
      }, getAuthHeaders());

      if (res.data?.success) {
        const payload = res.data;

        if (payload.route.routeSource === 'FALLBACK') {
          triggerToast("Road route unavailable. Routing provider failed.", "error");
          setRouteData({
            ...payload.route,
            coordinates: [] // DO NOT render synthetic geometry on Leaflet map
          });
        } else {
          setRouteData(payload.route);
        }
        
        setAssessment(payload.assessment);

        if (payload.route.routeSource !== 'FALLBACK') {
          triggerToast("AI Route Safety audits compiled!", "success");
        }
        saveRecentSearch(startPoint, endPoint);
        setIsSidebarCollapsed(false); // Open sidebar to display route metrics

        // Reload past reports history list
        const reportsRes = await axios.get(`${API_URL}/navigation/past-reports`, getAuthHeaders());
        if (reportsRes.data?.success) {
          setPastReports(reportsRes.data.reports.slice(0, 10));
        }
      }
    } catch (error) {
      console.error("Analysis Failure:", error);
      triggerToast(error.response?.data?.message || "Failed to analyze route safety. Check coordinates.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load a historical report by fetching actual coordinates dynamically
  const handleLoadPastReport = async (report) => {
    setIsLoading(true);
    setShowHistoryDrawer(false);
    setSelectedHotspot(null);
    triggerToast(`Restoring safety brief: ${report.source.split(',')[0]} ➜ ${report.destination.split(',')[0]}`, "success");

    setStartPoint(report.source);
    setEndPoint(report.destination);

    try {
      const res = await axios.post(`${API_URL}/navigation/analyze`, {
        source: report.source,
        destination: report.destination
      }, getAuthHeaders());

      if (res.data?.success) {
        const payload = res.data;

        if (payload.route.routeSource === 'FALLBACK') {
          triggerToast("Road route unavailable. Routing provider failed.", "error");
          setRouteData({
            ...payload.route,
            coordinates: [] // DO NOT render synthetic geometry on Leaflet map
          });
        } else {
          setRouteData(payload.route);
        }
        
        setAssessment(payload.assessment);
        setIsSidebarCollapsed(false); // Open sidebar to display route metrics
        if (payload.route.routeSource !== 'FALLBACK') {
          triggerToast("Route restored with high-fidelity road geometry!", "success");
        }
      }
    } catch (err) {
      console.error("Failed to restore route geometry:", err);
      triggerToast("Failed to fetch road geometry. Check network.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Stream and trigger browser download for route safety reports
  const handleDownloadPDF = async () => {
    if (!routeData || !routeData.savedReportId) {
      triggerToast("No active route report loaded.", "warning");
      return;
    }
    triggerToast("Generating your PDF report...", "success");
    try {
      const response = await axios.get(`${API_URL}/navigation/pdf/${routeData.savedReportId}`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `DriveLegal-Route-Report-${routeData.source.split(',')[0]}-to-${routeData.destination.split(',')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("PDF downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF export error:", err);
      triggerToast("Failed to export route safety PDF.", "error");
    }
  };

  const CORRIDOR_DISTANCE_KM = 10;

  // Filtered, Offset, and Cleaned Route Intelligence Markers
  const processedHotspots = useMemo(() => {
    if (!routeData || !hotspotsList) return [];
    
    // 1. Filter out debug, placeholder, or invalid markers, and select only those within corridor
    const filtered = hotspotsList.filter(spot => {
      if (!spot.latitude || !spot.longitude) return false;
      
      const withinCorridor = routeData.coordinates.some(coord => 
        getDistanceKm(spot.latitude, spot.longitude, coord[0], coord[1]) <= CORRIDOR_DISTANCE_KM
      );
      
      const nameL = (spot.name || '').toLowerCase();
      const descL = (spot.description || '').toLowerCase();
      
      const isDebugOrPlaceholder = 
        nameL.includes('debug') || nameL.includes('placeholder') || nameL.includes('stale') ||
        nameL.includes('test') || nameL.includes('dummy') || nameL.includes('temp') || nameL.includes('synthetic') ||
        descL.includes('debug') || descL.includes('placeholder') || descL.includes('stale') ||
        descL.includes('test') || descL.includes('dummy') || descL.includes('temp') || descL.includes('synthetic');
        
      return withinCorridor && !isDebugOrPlaceholder;
    });

    // 2. Remove duplicates
    const unique = [];
    const seen = new Set();
    for (const spot of filtered) {
      const key = `${spot.latitude.toFixed(4)},${spot.longitude.toFixed(4)}`;
      if (!seen.has(spot.name) && !seen.has(key)) {
        seen.add(spot.name);
        seen.add(key);
        unique.push(spot);
      }
    }

    // 3. Mathematical Spiral Offset for Overlap Prevention (including start/dest)
    const startCoord = routeData.coordinates[0];
    const destCoord = routeData.coordinates[routeData.coordinates.length - 1];
    const placed = [
      { lat: startCoord[0], lon: startCoord[1] },
      { lat: destCoord[0], lon: destCoord[1] }
    ];

    const offsetThreshold = 0.001;

    return unique.map(spot => {
      let finalLat = spot.latitude;
      let finalLon = spot.longitude;
      let iterations = 0;
      
      while (iterations < 10) {
        const overlap = placed.some(p => 
          Math.abs(p.lat - finalLat) < offsetThreshold && 
          Math.abs(p.lon - finalLon) < offsetThreshold
        );
        
        if (!overlap) break;
        
        const angle = (iterations * Math.PI) / 4;
        const offset = 0.0009 * (iterations + 1);
        finalLat = spot.latitude + Math.sin(angle) * offset;
        finalLon = spot.longitude + Math.cos(angle) * offset;
        iterations++;
      }
      
      placed.push({ lat: finalLat, lon: finalLon });
      return { ...spot, renderLat: finalLat, renderLon: finalLon };
    });
  }, [routeData, hotspotsList]);

  const processedZones = useMemo(() => {
    if (!routeData || !enforcementZones) return [];
    
    const filtered = enforcementZones.filter(zone => {
      if (!zone.latitude || !zone.longitude) return false;
      
      const withinCorridor = routeData.coordinates.some(coord => 
        getDistanceKm(zone.latitude, zone.longitude, coord[0], coord[1]) <= CORRIDOR_DISTANCE_KM
      );
      
      const nameL = (zone.name || '').toLowerCase();
      const descL = (zone.description || '').toLowerCase();
      
      const isDebugOrPlaceholder = 
        nameL.includes('debug') || nameL.includes('placeholder') || nameL.includes('stale') ||
        nameL.includes('test') || nameL.includes('dummy') || nameL.includes('temp') || nameL.includes('synthetic') ||
        descL.includes('debug') || descL.includes('placeholder') || descL.includes('stale') ||
        descL.includes('test') || descL.includes('dummy') || descL.includes('temp') || descL.includes('synthetic');
        
      return withinCorridor && !isDebugOrPlaceholder;
    });

    const unique = [];
    const seen = new Set();
    for (const zone of filtered) {
      const key = `${zone.latitude.toFixed(4)},${zone.longitude.toFixed(4)}`;
      if (!seen.has(zone.name) && !seen.has(key)) {
        seen.add(zone.name);
        seen.add(key);
        unique.push(zone);
      }
    }

    const startCoord = routeData.coordinates[0];
    const destCoord = routeData.coordinates[routeData.coordinates.length - 1];
    const placed = [
      { lat: startCoord[0], lon: startCoord[1] },
      { lat: destCoord[0], lon: destCoord[1] },
      ...processedHotspots.map(h => ({ lat: h.renderLat, lon: h.renderLon }))
    ];

    const offsetThreshold = 0.001;

    return unique.map(zone => {
      let finalLat = zone.latitude;
      let finalLon = zone.longitude;
      let iterations = 0;
      
      while (iterations < 10) {
        const overlap = placed.some(p => 
          Math.abs(p.lat - finalLat) < offsetThreshold && 
          Math.abs(p.lon - finalLon) < offsetThreshold
        );
        
        if (!overlap) break;
        
        const angle = (iterations * Math.PI) / 4;
        const offset = 0.0009 * (iterations + 1);
        finalLat = zone.latitude + Math.sin(angle) * offset;
        finalLon = zone.longitude + Math.cos(angle) * offset;
        iterations++;
      }
      
      placed.push({ lat: finalLat, lon: finalLon });
      return { ...zone, renderLat: finalLat, renderLon: finalLon };
    });
  }, [routeData, enforcementZones, processedHotspots]);

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#02050c] text-slate-100 font-sans select-none pt-16 flex">
      
      {/* Toast Alert popup banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-[9999] px-5 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/35 text-emerald-350 shadow-emerald-950/20' 
                : toast.type === 'warning'
                ? 'bg-amber-500/20 border-amber-500/35 text-amber-350 shadow-amber-950/20'
                : 'bg-rose-500/20 border-rose-500/35 text-rose-350 shadow-rose-950/20'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-current" />
            <span className="text-xs font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COLLAPSIBLE SIDEBAR */}
      <div 
        className={`absolute md:relative top-16 md:top-0 bottom-0 left-0 h-[calc(100vh-64px)] md:h-full flex-shrink-0 flex z-[1001] transition-all duration-300 ${
          isSidebarCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
        }`}
      >
        {/* Collapsible Wrapper to allow clean layout transition & prevent clipping */}
        <div className={`h-full bg-slate-955/95 border-r border-slate-900 transition-all duration-300 overflow-hidden ${
          isSidebarCollapsed ? 'w-0 border-r-0' : 'w-screen max-w-[390px] md:w-[390px]'
        }`}>
          {/* Sidebar contents */}
          <div className="w-[390px] max-w-full h-full overflow-y-auto p-5 flex flex-col gap-4">
          
          {/* SEARCH FORM / RE-EDIT SEARCH */}
          {!routeData && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-900/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-450">
                    <Navigation className="w-4 h-4 text-emerald-455" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-white">ROUTE COPILOT</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 transition-colors"
                  title="Saved Routes History"
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleAnalyzeSafety} className="space-y-4">
                {/* Start Location Input */}
                <div className="relative">
                  <label className="block text-[8.5px] font-black text-slate-500 mb-1 uppercase tracking-widest text-left">Start Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-450" />
                    <input
                      type="text"
                      value={startPoint}
                      onChange={(e) => {
                        setStartPoint(e.target.value);
                        setShowSourceDropdown(true);
                      }}
                      onFocus={() => setShowSourceDropdown(true)}
                      placeholder="Type starting city or area..."
                      required
                      className="w-full bg-slate-900/50 border border-slate-850 focus:border-emerald-500/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none transition-colors shadow-inner font-medium placeholder-slate-600"
                    />
                  </div>

                  {showSourceDropdown && sourceSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-slate-955 border border-slate-850 shadow-2xl z-[999] overflow-hidden max-h-48 overflow-y-auto">
                      {sourceSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setStartPoint(item.display_name);
                            setSourceSuggestions([]);
                            setShowSourceDropdown(false);
                            if (item.lat && item.lon) {
                              setMapCenter([parseFloat(item.lat), parseFloat(item.lon)]);
                              setMapZoom(12);
                            }
                          }}
                          className="px-3 py-2 text-[10px] text-slate-300 hover:bg-emerald-950/30 hover:text-emerald-400 border-b border-slate-900 cursor-pointer transition-colors leading-tight font-medium text-left"
                        >
                          {item.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swapping and GPS Locator buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSwapLocations}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-850 border border-slate-850 text-[9.5px] text-slate-400 font-bold transition-all uppercase tracking-wider"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    Swap Fields
                  </button>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-850 border border-slate-850 text-[9.5px] text-slate-400 font-bold transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Locate className="w-3.5 h-3.5 text-emerald-450" />
                    )}
                    My GPS Location
                  </button>
                </div>

                {/* Destination Location Input */}
                <div className="relative">
                  <label className="block text-[8.5px] font-black text-slate-500 mb-1 uppercase tracking-widest text-left">Destination</label>
                  <div className="relative">
                    <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                    <input
                      type="text"
                      value={endPoint}
                      onChange={(e) => {
                        setEndPoint(e.target.value);
                        setShowDestDropdown(true);
                      }}
                      onFocus={() => setShowDestDropdown(true)}
                      placeholder="Type destination city or area..."
                      required
                      className="w-full bg-slate-900/50 border border-slate-850 focus:border-emerald-500/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none transition-colors shadow-inner font-medium placeholder-slate-600"
                    />
                  </div>

                  {showDestDropdown && destSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-slate-955 border border-slate-850 shadow-2xl z-[999] overflow-hidden max-h-48 overflow-y-auto">
                      {destSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setEndPoint(item.display_name);
                            setDestSuggestions([]);
                            setShowDestDropdown(false);
                          }}
                          className="px-3 py-2 text-[10px] text-slate-300 hover:bg-emerald-950/30 hover:text-emerald-400 border-b border-slate-900 cursor-pointer transition-colors leading-tight font-medium text-left"
                        >
                          {item.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  disabled={isLoading}
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 py-3 rounded-2xl text-white text-xs font-black tracking-widest uppercase shadow-lg shadow-emerald-950/20 hover:shadow-emerald-500/10 transition-all flex justify-center items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Analyzing Corridor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Search Route
                    </>
                  )}
                </motion.button>
              </form>

              {/* Autocomplete recent searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-2 mt-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block text-left">Recent Searches</span>
                  <div className="flex flex-col gap-1.5">
                    {recentSearches.map((term, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          const parts = term.split("➜");
                          setStartPoint(parts[0].trim());
                          setEndPoint(parts[1].trim());
                          triggerToast("Restored locations", "success");
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/30 border border-slate-905 hover:border-slate-800 hover:bg-slate-900/60 transition-all cursor-pointer text-[9px] font-extrabold text-slate-400 leading-tight text-left"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="truncate">{term}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEARCH RESULTS VIEW (SECTIONS A, B, C, D) */}
          {routeData && assessment && (
            <div className="flex flex-col gap-4">
              
              {/* Route Header Info Card */}
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3">
                <div className="text-[12px] font-black text-white truncate uppercase flex-1 text-left flex items-center gap-1.5">
                  <span className="text-emerald-450">{startPoint.split(',')[0]}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="text-rose-450">{endPoint.split(',')[0]}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRouteData(null);
                    setAssessment(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-black text-emerald-450 uppercase tracking-wider shrink-0 transition-colors"
                >
                  Edit Route
                </button>
              </div>

              {/* Section A: Route Overview */}
              <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-900/85 space-y-3">
                <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-wider text-left border-b border-slate-900 pb-2 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" /> Route Overview
                </h3>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Distance</span>
                    <strong className="text-base font-black text-white">{routeData.distance} km</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Est. Duration</span>
                    <strong className="text-base font-black text-white">{formatDuration(routeData.duration)}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left border-t border-slate-900/60 pt-2">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Traffic Duration</span>
                    <strong className="text-base font-black text-emerald-450">{formatDuration(routeData.trafficAdjustedDuration)}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Route Summary</span>
                    <strong className="text-xs font-black text-white truncate block">{routeData.routeSummary || 'Data unavailable'}</strong>
                  </div>
                </div>
              </div>

              {/* Section B: Vehicle Travel Times */}
              <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-900/85 space-y-3">
                <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-wider text-left border-b border-slate-900 pb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Travel Times
                </h3>
                <span className="text-[8px] font-bold text-slate-400 block text-left italic mb-1">Estimated vehicle travel times.</span>
                <div className="grid grid-cols-2 gap-2 text-left text-xs font-bold text-slate-300">
                  <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-900 flex items-center gap-2">
                    <span>🚗</span>
                    <div>
                      <span className="text-[8px] text-slate-500 block">Car</span>
                      <span>{formatDuration(routeData.vehicleTimes?.car)}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-900 flex items-center gap-2">
                    <span>🏍</span>
                    <div>
                      <span className="text-[8px] text-slate-500 block">Motorcycle</span>
                      <span>{formatDuration(routeData.vehicleTimes?.motorcycle)}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-900 flex items-center gap-2">
                    <span>🚌</span>
                    <div>
                      <span className="text-[8px] text-slate-500 block">Bus</span>
                      <span>{formatDuration(routeData.vehicleTimes?.bus)}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-900 flex items-center gap-2">
                    <span>🚚</span>
                    <div>
                      <span className="text-[8px] text-slate-500 block">Truck</span>
                      <span>{formatDuration(routeData.vehicleTimes?.truck)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section C: Safety & Compliance (Insights) */}
              <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-900/85 space-y-3">
                <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-wider text-left border-b border-slate-900 pb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Route Compliance Insights
                </h3>
                
                <div className="flex justify-between items-center bg-slate-955/50 p-2 rounded-xl border border-slate-900">
                  <span className="text-[9px] font-black text-slate-450 uppercase">Safety Score</span>
                  <strong className="text-base font-black text-emerald-450">{assessment.scores.safetyScore}/100</strong>
                </div>

                <div className="flex justify-between items-center bg-slate-955/50 p-2 rounded-xl border border-slate-900">
                  <span className="text-[9px] font-black text-slate-450 uppercase">Route Risk Score</span>
                  <strong className="text-base font-black text-rose-455">{assessment.scores.riskScore}%</strong>
                </div>

                {/* Weather alerts */}
                {assessment.factors.weather?.warnings?.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-550/20 text-[9px] text-amber-350 text-left space-y-1">
                    <strong className="font-extrabold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Weather Alert:</strong>
                    <p className="leading-relaxed">{assessment.factors.weather.warnings[0]}</p>
                  </div>
                )}

                {/* Accident-Prone Zones */}
                <div className="space-y-1 text-left">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">⚠️ Accident-Prone Zones</span>
                  {processedHotspots.length > 0 ? (
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {processedHotspots.map((spot, i) => (
                        <div key={i} className="text-[9px] text-rose-350 bg-rose-500/5 border border-rose-500/10 px-2 py-1 rounded-lg">
                          🚨 {spot.name} ({spot.severity})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-550 italic block pl-1">No accident-prone hotspots detected.</span>
                  )}
                </div>

                {/* State Border Checkpoints / Radars */}
                <div className="space-y-1 text-left border-t border-slate-900/60 pt-2">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">📷 Checkpoints & Radars</span>
                  {processedZones.length > 0 ? (
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {processedZones.map((zone, i) => (
                        <div key={i} className="text-[9px] text-emerald-350 bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded-lg">
                          🛡️ {zone.name} ({zone.type.replace(/_/g, ' ')})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-550 italic block pl-1">No checkpoints detected.</span>
                  )}
                </div>

                {/* Required Documents status */}
                <div className="space-y-1.5 text-left border-t border-slate-900/60 pt-2">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">🪪 Compliance Documents Status</span>
                  <div className="grid grid-cols-4 gap-1">
                    {['Driving License', 'RC', 'Insurance', 'PUC'].map((type) => {
                      const doc = documents.find(d => d.documentType === type);
                      let shortType = type === 'Driving License' ? 'DL' : type;
                      const status = doc ? doc.status : 'Missing';
                      let badgeStyles = 'text-slate-500 bg-slate-955/20 border-slate-900';
                      if (status === 'Expired') badgeStyles = 'text-rose-455 bg-rose-500/10 border-rose-500/20';
                      else if (status === 'Expiring Soon') badgeStyles = 'text-amber-455 bg-amber-500/10 border-amber-500/20';
                      else if (status === 'Valid') badgeStyles = 'text-emerald-455 bg-emerald-500/10 border-emerald-500/20';
                      return (
                        <div key={type} className={`px-1 py-1 rounded-lg border text-[8px] font-black text-center ${badgeStyles}`} title={`${type}: ${status}`}>
                          {shortType}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Driving Recommendations */}
                <div className="space-y-1 text-left border-t border-slate-900/60 pt-2 text-[9.5px] text-slate-300 leading-normal">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-1">💡 Driving Recommendations</span>
                  {assessment.factors.fatigue?.recommendation && (
                    <p className="pl-1.5 border-l border-sky-500/40 text-sky-200">{assessment.factors.fatigue.recommendation}</p>
                  )}
                  {assessment.factors.night?.warning && (
                    <p className="pl-1.5 border-l border-indigo-500/40 text-indigo-200 mt-1">{assessment.factors.night.warning}</p>
                  )}

                </div>
              </div>

              {/* Section D: Financial Insights */}
              <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-900/85 space-y-3">
                <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-wider text-left border-b border-slate-900 pb-2 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> Financial Insights
                </h3>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Fuel Estimate</span>
                    <strong className="text-sm font-black text-white">₹{routeData.fuelCost}</strong>
                    <span className="text-[7px] text-slate-550 block leading-none">15 km/L • ₹102.5/L</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Toll Cost</span>
                    <strong className="text-xs font-black text-slate-500">Data unavailable</strong>
                  </div>
                </div>
              </div>

              {/* Alternate Routes (using OSRM actual alternate routes array) */}
              {routeData.alternateRoutes && routeData.alternateRoutes.length > 0 && (
                <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-900/85 space-y-2.5">
                  <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-wider text-left border-b border-slate-900 pb-2">
                    Alternate Routes
                  </h3>
                  <div className="space-y-2">
                    {routeData.alternateRoutes.map((alt, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-955 border border-slate-900 text-left text-xs leading-normal">
                        <span className="font-extrabold text-white block uppercase tracking-wide">Route {idx + 2} {alt.summary && `(via ${alt.summary})`}</span>
                        <span className="text-[10px] text-slate-400">{alt.distance} km • {formatDuration(alt.duration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export Compliance PDF */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="w-full py-2.5 rounded-xl bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/20 text-sky-400 text-[10px] font-black tracking-wider uppercase transition-all flex justify-center items-center gap-1.5"
              >
                📥 Export Compliance PDF
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Toggle Collapse handle (placed outside the wrapper so it is never clipped) */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-16 bg-slate-955/95 border-y border-r border-slate-900 rounded-r-xl flex items-center justify-center text-slate-400 hover:text-white transition-all z-[1002] ${
            isSidebarCollapsed ? 'right-[-24px]' : 'right-[-24px]'
          }`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className="text-[8px] font-black tracking-widest select-none rotate-90 block">
            {isSidebarCollapsed ? 'EXPAND' : 'COLLAPSE'}
          </span>
        </button>
      </div>

      {/* FULLSCREEN LEAFLET MAP HERO */}
      <div className="flex-1 h-full relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={4}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url={basemapUrls[basemap]}
            attribution={
              basemap === 'satellite'
                ? '&copy; Esri World Imagery'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }
          />
          
          <ChangeMapCenter center={mapCenter} zoom={mapZoom} />
          <MapResizeTrigger isCollapsed={isSidebarCollapsed} />
          {routeData && <MapRefitter coordinates={routeData.coordinates} />}

          {/* Render road-conforming Route Polyline (Phase 9 Route Styling) */}
          {routeData && routeData.coordinates && routeData.coordinates.length > 0 && (
            <>
              {/* Layer 1: Soft glow */}
              <Polyline
                positions={routeData.coordinates}
                pathOptions={{
                  color: assessment?.color === 'rose' ? '#f43f5e' :
                         assessment?.color === 'orange' ? '#f97316' :
                         assessment?.color === 'amber' ? '#eab308' :
                         assessment?.color === 'sky' ? '#0ea5e9' : '#10b981',
                  weight: 20,
                  opacity: 0.25,
                  className: 'transition-all duration-300'
                }}
              />
              {/* Layer 2: Primary route path */}
              <Polyline
                positions={routeData.coordinates}
                pathOptions={{
                  color: assessment?.color === 'rose' ? '#f43f5e' :
                         assessment?.color === 'orange' ? '#f97316' :
                         assessment?.color === 'amber' ? '#eab308' :
                         assessment?.color === 'sky' ? '#0284c7' : '#10b981',
                  weight: 8,
                  opacity: 0.95,
                  className: 'transition-all duration-300'
                }}
              />
              {/* Layer 3: Animated travel line */}
              <Polyline
                positions={routeData.coordinates}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2.2,
                  opacity: 0.85,
                  dashArray: '10, 15',
                  className: 'pointer-events-none animate-dash-travel'
                }}
              />

              {/* Start and Destination markers */}
              <Marker position={routeData.coordinates[0]} icon={new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
              })}>
                <Popup>
                  <div className="p-1 text-slate-200 bg-slate-955 font-bold text-xs">🚀 Start: {routeData.source.split(',')[0]}</div>
                </Popup>
              </Marker>
              <Marker position={routeData.coordinates[routeData.coordinates.length - 1]} icon={new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
              })}>
                <Popup>
                  <div className="p-1 text-slate-200 bg-slate-955 font-bold text-xs">🏁 Destination: {routeData.destination.split(',')[0]}</div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Cleaned Route Intelligence Markers */}
          {routeData && processedHotspots.map((spot) => {
            const renderCoords = [spot.renderLat, spot.renderLon];
            return (
              <div key={spot._id}>
                <Circle
                  center={renderCoords}
                  radius={1200}
                  pathOptions={{
                    fillColor: spot.severity === 'Critical' ? '#f43f5e' : spot.severity === 'High' ? '#f97316' : '#eab308',
                    color: spot.severity === 'Critical' ? '#f43f5e' : spot.severity === 'High' ? '#f97316' : '#eab308',
                    weight: 1.2,
                    opacity: 0.3,
                    fillOpacity: 0.08
                  }}
                />
                <Marker 
                  position={renderCoords} 
                  icon={hotspotIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedHotspot(spot);
                      triggerToast(`Corridor hazard: ${spot.name}`, "warning");
                    }
                  }}
                />
              </div>
            );
          })}

          {routeData && processedZones.map((zone) => {
            let iconMarker = speedCameraIcon;
            if (zone.type === 'anpr_radar' || zone.type === 'anpr_camera') iconMarker = anprCameraIcon;
            if (zone.type === 'police_checkpoint' || zone.type === 'speed_trap') iconMarker = policeCheckpointIcon;
            
            const renderCoords = [zone.renderLat, zone.renderLon];
            return (
              <div key={zone._id}>
                <Circle
                  center={renderCoords}
                  radius={1200}
                  pathOptions={{
                    fillColor: '#10b981',
                    color: '#10b981',
                    weight: 1.2,
                    opacity: 0.4,
                    fillOpacity: 0.04,
                    dashArray: '5, 8'
                  }}
                />
                <Marker
                  position={renderCoords}
                  icon={iconMarker}
                >
                  <Popup>
                    <div className="p-2.5 min-w-[200px] text-slate-200 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl leading-relaxed">
                      <div className="flex justify-between items-center mb-1.5">
                        <strong className="text-xs font-black text-white">{zone.name}</strong>
                        <span className="text-[7.5px] font-black tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">RADAR</span>
                      </div>
                      <span className="text-[8.5px] text-slate-500 font-bold block mb-1">{zone.state} • Scan Active</span>
                      <strong className="text-[9px] text-emerald-450 block mb-1 uppercase">📷 {zone.type.replace(/_/g, ' ')}</strong>
                      <p className="text-[9px] text-slate-400 border-t border-slate-900 pt-1.5 leading-normal">{zone.description}</p>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>

        {/* REDESIGNED FLOATING CONTROLS STACK (Z-INDEX PRECISE & RESPONSIVE COLLAPSIBLE) */}
        {/* DESKTOP & TABLET LAYOUT */}
        <div className="hidden sm:flex fixed right-6 z-[4000] flex-col items-end bottom-[100px] md:bottom-[110px] gap-3 md:gap-4">
          {/* Additional Controls (Map Settings) — z-index 3500 */}
          <button
            onClick={() => setShowSettingsDrawer(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-955/90 border border-slate-900 shadow-2xl text-slate-350 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider z-[3500]"
            title="Map Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Map Settings</span>
          </button>

          {/* Map Controls (Zoom & Locate) — z-index 4000 */}
          <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-slate-955/90 border border-slate-900 shadow-2xl z-[4000]">
            <button
              onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
              className="p-2 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-all flex items-center justify-center"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setMapZoom(prev => Math.max(prev - 1, 4))}
              className="p-2 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-all flex items-center justify-center"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="p-2 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-all border-t border-slate-900 flex items-center justify-center disabled:opacity-50"
              title="Locate Me"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Locate className="w-4 h-4 text-emerald-450" />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE LAYOUT: Collapses into expandable FAB (Chatbot remains visible) */}
        <div className="flex sm:hidden fixed bottom-[110px] right-6 z-[4000] flex-col items-end gap-3">
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="flex flex-col gap-3 items-end mb-1"
              >
                {/* Additional Controls (Map Settings) — z-index 3500 */}
                <button
                  onClick={() => {
                    setShowSettingsDrawer(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-full bg-slate-955 border border-slate-800 shadow-2xl text-slate-350 hover:text-white flex items-center justify-center z-[3500]"
                  title="Map Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Map Controls (Locate Me) — z-index 4000 */}
                <button
                  onClick={() => {
                    handleUseMyLocation();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLocating}
                  className="p-3 rounded-full bg-slate-955 border border-slate-800 shadow-2xl text-emerald-450 hover:text-emerald-300 flex items-center justify-center disabled:opacity-50 z-[4000]"
                  title="Locate Me"
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Locate className="w-4 h-4" />
                  )}
                </button>

                {/* Map Controls (Zoom Out) — z-index 4000 */}
                <button
                  onClick={() => setMapZoom(prev => Math.max(prev - 1, 4))}
                  className="p-3 rounded-full bg-slate-955 border border-slate-800 shadow-2xl text-slate-400 hover:text-white flex items-center justify-center z-[4000]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                {/* Map Controls (Zoom In) — z-index 4000 */}
                <button
                  onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
                  className="p-3 rounded-full bg-slate-955 border border-slate-800 shadow-2xl text-slate-400 hover:text-white flex items-center justify-center z-[4000]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expandable FAB trigger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg text-white flex items-center justify-center z-[4000]"
            title="Map Actions"
          >
            <motion.div
              animate={{ rotate: isMobileMenuOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </motion.div>
          </button>
        </div>

        {/* HOTSPOT ALERT CONSOLE MODAL (floating above bottom left of the map area when selected) */}
        <AnimatePresence>
          {selectedHotspot && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute bottom-6 left-6 z-[1000] w-[340px] max-w-[90vw] glass bg-rose-955/95 border border-rose-500/30 p-4 rounded-3xl shadow-2xl flex flex-col gap-3 relative"
            >
              <button
                onClick={() => setSelectedHotspot(null)}
                className="absolute top-3.5 right-3.5 text-rose-350 hover:text-white p-1 rounded-lg bg-rose-900/30 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-2 text-rose-455">
                <AlertOctagon className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest uppercase">CORRIDOR HAZARD ALERT</span>
              </div>

              <div className="border-t border-rose-500/20 pt-1.5 text-left">
                <h4 className="text-xs font-black text-white leading-tight">{selectedHotspot.name}</h4>
                <span className="text-[8px] font-bold text-rose-400 mt-0.5 block">{selectedHotspot.state} • Danger Zone</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-950/75 border border-rose-500/10">
                  <span className="text-[7px] font-black text-slate-500 block uppercase">Crashes Recorded</span>
                  <strong className="text-sm font-black text-rose-455">{selectedHotspot.accidentCount}</strong>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/75 border border-rose-500/10">
                  <span className="text-[7px] font-black text-slate-500 block uppercase">Risk Rating</span>
                  <strong className="text-sm font-black text-rose-455">Critical</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-rose-500/10 bg-slate-950/50 text-[9px] text-rose-200 leading-relaxed text-left">
                <strong className="font-extrabold text-white block mb-0.5">⚠️ Historical Analysis:</strong>
                {selectedHotspot.description}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PERSISTENT SLIDE-OUT ROUTE HISTORY DRAWER */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <>
            <div
              className="absolute inset-0 z-[1999] bg-slate-950/40 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowHistoryDrawer(false)}
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 h-full w-[320px] z-[2000] bg-slate-955 border-r border-slate-900 p-6 shadow-2xl flex flex-col gap-4 backdrop-blur-xl pt-16"
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-455" />
                  <span className="text-xs font-black tracking-widest text-white uppercase">Saved Route Records</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {pastReports.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-[10px] italic">No saved audits yet.</div>
                ) : (
                  pastReports.map((report) => (
                    <div
                      key={report._id}
                      onClick={() => handleLoadPastReport(report)}
                      className="p-3 rounded-2xl bg-slate-900/40 border border-slate-900 hover:border-emerald-500/30 hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col gap-2 group"
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          report.safetyScore > 80 ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                          report.safetyScore > 60 ? 'bg-sky-500/10 text-sky-455 border border-sky-500/20' :
                          report.safetyScore > 40 ? 'bg-orange-500/10 text-orange-455 border border-orange-550/20' :
                          'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                        }`}>
                          Score: {report.safetyScore}
                        </span>
                        <span className="text-[8px] text-slate-550 font-bold">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10.5px] font-extrabold text-slate-200 truncate group-hover:text-emerald-400 transition-colors uppercase tracking-wide text-left">
                        {report.source.split(',')[0]} ➜ {report.destination.split(',')[0]}
                      </div>
                      <div className="text-[8px] text-slate-500 font-bold text-left">{report.distance} km • {report.duration} mins</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PERSISTENT SLIDE-OUT SETTINGS DRAWER */}
      <AnimatePresence>
        {showSettingsDrawer && (
          <>
            <div
              className="absolute inset-0 z-[1999] bg-slate-950/40 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowSettingsDrawer(false)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-[320px] z-[2000] bg-slate-955 border-l border-slate-900 p-6 shadow-2xl flex flex-col gap-5 backdrop-blur-xl pt-16"
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <span className="text-xs font-black tracking-widest text-white uppercase">⚙️ Map Settings</span>
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(false)}
                  className="p-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Basemap Options */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block text-left">Select Basemap</span>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBasemap('streets');
                      triggerToast("Switched to Streets navigation", "success");
                    }}
                    className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase text-left transition-all flex items-center gap-2 border ${
                      basemap === 'streets'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    Streets
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBasemap('dark');
                      triggerToast("Switched to Dark Navigation", "success");
                    }}
                    className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase text-left transition-all flex items-center gap-2 border ${
                      basemap === 'dark'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Dark Navigation
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBasemap('satellite');
                      triggerToast("Switched to Satellite View", "success");
                    }}
                    className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase text-left transition-all flex items-center gap-2 border ${
                      basemap === 'satellite'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Satellite
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoutePlanner;
