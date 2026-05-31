import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  Navigation2,
  TrendingUp,
  Map as MapIcon,
  Activity,
  Calendar,
  Clock,
  Sparkles,
  Cloud,
  FileText,
  Thermometer,
  Wind,
  Compass,
  ArrowRight,
  Loader2,
  Trash2,
  Award,
  RefreshCw,
  X,
  AlertCircle,
  Settings as SettingsIcon,
  Check
} from 'lucide-react';
import axios from 'axios';
import {
  getTravelReadiness,
  getComplianceStatus,
  getViolationRisk,
  getAwarenessLevel
} from '../utils/scoreRules';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Dashboard = () => {
  const editModalRef = useRef(null);
  // Ledger Arrays
  const [pastReports, setPastReports] = useState([]);
  
  // App States
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFinesCount, setPendingFinesCount] = useState(0);
  const [pendingFinesAmount, setPendingFinesAmount] = useState(0);
  const [upcomingFines, setUpcomingFines] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [settings, setSettings] = useState({
    emailReminders: true,
    dashboardAlerts: true,
    reminderPreferences: ['7_days', '3_days', '1_day', 'due_date', 'overdue']
  });

  const [documents, setDocuments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [telemetry, setTelemetry] = useState({
    complianceScore: 100,
    travelReadinessScore: 100,
    violationRiskScore: 10,
    awarenessScore: 0,
    documentStatus: {}
  });
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newFuel, setNewFuel] = useState('Petrol');
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [yearError, setYearError] = useState('');
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);

  // Edit Vehicle States
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [editPlate, setEditPlate] = useState('');
  const [editMake, setEditMake] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editFuel, setEditFuel] = useState('Petrol');
  const [editYear, setEditYear] = useState('');
  const [editVehicleName, setEditVehicleName] = useState('');
  const [editVehicleType, setEditVehicleType] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editInsuranceStatus, setEditInsuranceStatus] = useState('');
  const [editAdditionalNotes, setEditAdditionalNotes] = useState('');
  const [editYearError, setEditYearError] = useState('');

  const token = localStorage.getItem('token');

  const fetchTelemetryData = async () => {
    if (!token) return;
    try {
      // 1. Fines & Analytics
      const finesRes = await axios.get(`${API_URL}/fines`, getAuthHeaders());
      if (finesRes.data?.success) {
        const list = finesRes.data.fines;
        const pending = list.filter(f => f.status === 'Pending' || f.status === 'Overdue');
        setPendingFinesCount(pending.length);
        setPendingFinesAmount(pending.reduce((acc, f) => acc + f.amount, 0));
        
        // Fines due in next 7 days
        const now = new Date();
        const upcoming = pending.filter(f => {
          const diffDays = Math.ceil((new Date(f.dueDate) - now) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        });
        setUpcomingFines(upcoming);
      }

      // 2. Recent Unread Notifications
      const notifRes = await axios.get(`${API_URL}/notifications`, {
        headers: getAuthHeaders().headers,
        params: { isRead: 'false', limit: 3 }
      });
      if (notifRes.data?.success) {
        setRecentNotifications(notifRes.data.notifications);
      }

      // 3. Sync unread count
      const countRes = await axios.get(`${API_URL}/notifications/unread-count`, getAuthHeaders());
      if (countRes.data?.success) {
        setUnreadCount(countRes.data.count);
      }

      // 4. User Settings Preferences
      const profileRes = await axios.get(`${API_URL}/auth/profile`, getAuthHeaders());
      if (profileRes.data?.success && profileRes.data.user.notificationSettings) {
        setSettings(profileRes.data.user.notificationSettings);
      }

      // 5. Smart Document Vault status
      const docsRes = await axios.get(`${API_URL}/documents`, getAuthHeaders());
      if (docsRes.data?.success) {
        setDocuments(docsRes.data.documents);
      }

      // 6. Registered vehicles
      const vehsRes = await axios.get(`${API_URL}/vehicles`, getAuthHeaders());
      if (vehsRes.data?.success) {
        setVehicles(vehsRes.data.vehicles);
      }

      // 7. Telemetry compliance scores
      const telRes = await axios.get(`${API_URL}/auth/telemetry`, getAuthHeaders());
      if (telRes.data?.success) {
        setTelemetry(telRes.data.telemetry);
      }

    } catch (err) {
      console.error("Failed to fetch dashboard telemetry:", err.message);
    }
  };

  useEffect(() => {
    fetchTelemetryData();
  }, []);

  // Listen for successful AI chat interactions dispatched by the Chatbot component.
  // Re-fetches telemetry so the Awareness Score dial updates in real time.
  useEffect(() => {
    const handleAiChatSuccess = () => {
      fetchTelemetryData();
    };
    window.addEventListener('ai-chat-success', handleAiChatSuccess);
    return () => window.removeEventListener('ai-chat-success', handleAiChatSuccess);
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth Header Helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.put(`${API_URL}/auth/notification-settings`, settings, getAuthHeaders());
      if (res.data?.success) {
        triggerToast("Preferences saved successfully!", "success");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      triggerToast(err.response?.data?.message || "Failed to update notification settings.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (pref) => {
    const current = [...settings.reminderPreferences];
    const index = current.indexOf(pref);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(pref);
    }
    setSettings({ ...settings, reminderPreferences: current });
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!newPlate.trim() || !newMake.trim() || !newModel.trim()) {
      triggerToast("Please fill in all vehicle registration details.", "warning");
      return;
    }
    const currentYearPlusOne = new Date().getFullYear() + 1;
    const yearVal = Number(newYear);
    if (!newYear || isNaN(yearVal) || yearVal < 1914 || yearVal > currentYearPlusOne) {
      setYearError(`If this vehicle was registered in India, the registration year must be between 1914 and ${currentYearPlusOne}.`);
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/vehicles`, {
        plateNumber: newPlate,
        make: newMake,
        model: newModel,
        fuelType: newFuel,
        year: Number(newYear)
      }, getAuthHeaders());
      if (res.data?.success) {
        triggerToast("Vehicle profile registered successfully!", "success");
        setNewPlate('');
        setNewMake('');
        setNewModel('');
        setYearError('');
        setShowAddVehicleModal(false);
        fetchTelemetryData();
      }
    } catch (err) {
      console.error("Vehicle creation failed:", err);
      triggerToast(err.response?.data?.message || "Failed to register vehicle.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVehicle = (veh) => {
    setVehicleToEdit(veh);
    setEditPlate(veh.plateNumber || '');
    setEditMake(veh.make || '');
    setEditModel(veh.model || '');
    setEditFuel(veh.fuelType || 'Petrol');
    setEditYear(veh.year || '');
    setEditVehicleName(veh.vehicleName || `${veh.make} ${veh.model}` || '');
    setEditVehicleType(veh.vehicleType || '');
    setEditColor(veh.color || '');
    setEditInsuranceStatus(veh.insuranceStatus || '');
    setEditAdditionalNotes(veh.additionalNotes || '');
    setEditYearError('');
    setShowEditVehicleModal(true);
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (!editPlate.trim() || !editMake.trim() || !editModel.trim() || !editVehicleName.trim()) {
      triggerToast("Please fill in all required vehicle details.", "warning");
      return;
    }
    const currentYearPlusOne = new Date().getFullYear() + 1;
    const yearVal = Number(editYear);
    if (!editYear || isNaN(yearVal) || yearVal < 1914 || yearVal > currentYearPlusOne) {
      setEditYearError(`If this vehicle was registered in India, the registration year must be between 1914 and ${currentYearPlusOne}.`);
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.put(`${API_URL}/vehicles/${vehicleToEdit._id}`, {
        registrationNumber: editPlate,
        make: editMake,
        model: editModel,
        fuelType: editFuel,
        year: yearVal,
        vehicleName: editVehicleName,
        vehicleType: editVehicleType,
        color: editColor,
        insuranceStatus: editInsuranceStatus,
        additionalNotes: editAdditionalNotes
      }, getAuthHeaders());
      if (res.data?.success) {
        triggerToast("✓ Vehicle updated successfully", "success");
        setShowEditVehicleModal(false);
        setVehicleToEdit(null);
        setEditYearError('');
        fetchTelemetryData();
      }
    } catch (err) {
      console.error("Vehicle update failed:", err);
      triggerToast(err.response?.data?.message || "Failed to update vehicle.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setVehicleToDelete(null);
        setShowAddVehicleModal(false);
        setShowEditVehicleModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!showEditVehicleModal) return;
    
    const modalElement = editModalRef.current;
    if (!modalElement) return;

    // Find all focusable elements
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = modalElement.querySelectorAll(focusableSelector);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element on open
    firstElement.focus();

    const handleTabTrap = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    modalElement.addEventListener('keydown', handleTabTrap);
    return () => {
      modalElement.removeEventListener('keydown', handleTabTrap);
    };
  }, [showEditVehicleModal]);

  const handleDeleteVehicle = (vehicleId) => {
    setVehicleToDelete(vehicleId);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete || isDeletingVehicle) return;
    setIsDeletingVehicle(true);
    try {
      const res = await axios.delete(`${API_URL}/vehicles/${vehicleToDelete}`, getAuthHeaders());
      if (res.data?.success) {
        triggerToast("Vehicle deleted successfully.", "success");
        setVehicleToDelete(null);
        fetchTelemetryData();
      }
    } catch (err) {
      console.error("Vehicle deletion failed:", err);
      triggerToast("Unable to delete vehicle. Please try again.", "error");
    } finally {
      setIsDeletingVehicle(false);
    }
  };

  // Fetch hotspots & past reports on component mount
  const loadDatabaseData = async () => {
    try {
      const reportsRes = await axios.get(`${API_URL}/navigation/past-reports`, getAuthHeaders());
      if (reportsRes.data?.success) {
        setPastReports(reportsRes.data.reports);
      }
    } catch (error) {
      console.error("[INIT ERROR] Failed to fetch database data:", error);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const complianceStatus = getComplianceStatus(telemetry.complianceScore ?? 100);
  const awarenessLevel = getAwarenessLevel(telemetry.awarenessScore ?? 0);
  const travelReadiness = getTravelReadiness(telemetry.travelReadinessScore ?? 100);
  const violationRisk = getViolationRisk(telemetry.violationRiskScore ?? 10);

  const isContradictory = (() => {
    const comp = telemetry.complianceScore ?? 100;
    const ready = telemetry.travelReadinessScore ?? 100;
    const risk = telemetry.violationRiskScore ?? 10;
    
    // 1. Travel Readiness >= 90 cannot display: DO NOT TRAVEL
    const readinessRule = getTravelReadiness(ready);
    if (ready >= 90 && readinessRule.label === 'DO NOT TRAVEL') {
      console.warn("[DATA INTEGRITY WARNING] Travel Readiness Score is high but label is DO NOT TRAVEL", ready);
      return true;
    }
    
    // 2. Violation Risk <= 30 cannot display: HIGH RISK, EXTREME DANGER
    const riskRule = getViolationRisk(risk);
    if (risk <= 30 && (riskRule.label === 'Extreme Danger' || riskRule.label === 'High Risk')) {
      console.warn("[DATA INTEGRITY WARNING] Violation Risk is low but label is dangerous", risk, riskRule.label);
      return true;
    }
    
    // 3. No pending challans, No expired/missing documents cannot display: AT RISK, HIGH RISK, EXTREME DANGER
    const docStatus = telemetry.documentStatus || {};
    const hasExpiredDocs = Object.values(docStatus).some(status => status === 'Expired');
    const hasMissingDocs = Object.values(docStatus).some(status => status === 'Missing');
    const hasChallans = pendingFinesCount > 0;
    
    if (!hasChallans && !hasExpiredDocs && !hasMissingDocs) {
      if (riskRule.label === 'Extreme Danger' || riskRule.label === 'High Risk') {
        console.warn("[DATA INTEGRITY WARNING] No issues but risk label is dangerous", riskRule.label);
        return true;
      }
      const compStatus = getComplianceStatus(comp);
      if (compStatus.label === 'At Risk') {
        console.warn("[DATA INTEGRITY WARNING] No issues but compliance label is At Risk");
        return true;
      }
    }
    
    return false;
  })();

  return (
    <div className="pt-16 min-h-screen flex flex-col bg-[#050811] text-slate-100 font-sans relative overflow-x-hidden">
      
      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-[9999] px-5 py-3 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : toast.type === 'warning'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DASHBOARD HEADER */}
      <div className="w-full bg-[#090f1d]/85 border-b border-slate-800/80 p-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-[100] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Shield className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-lg md:text-xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              DriveLegal <span className="text-sky-400">AI</span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
            Know the Rules. Avoid the Fine. Drive Smarter.
          </p>
        </div>
      </div>

      {/* DASHBOARD VIEWPORT AREA */}
      <div className="flex-1 w-full overflow-hidden">
        <div className="w-full h-[calc(100vh-140px)] overflow-y-auto p-4 md:p-8 space-y-8 bg-radial-gradient">
            {/* HERO BANNER SECTION */}
            <div className="bg-gradient-to-r from-sky-950/20 via-indigo-950/10 to-transparent border border-sky-500/10 rounded-3xl p-6 md:p-8 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-sky-500/5 to-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-[200px] h-[200px] bg-slate-900/40 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[9px] font-black text-sky-400 uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 animate-spin" /> AI Active
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                    Welcome to DriveLegal <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Compliance Suite</span>
                  </h2>
                  <p className="text-sm text-slate-400 font-semibold max-w-xl">
                    Our real-time prediction model analyzes your vehicle document status, pending fines, and knowledge indicators to optimize your overall compliance telemetry. Avoid traffic penalties predictively!
                  </p>
                </div>

                <div className="flex gap-3">
                  <Link
                    to="/vault"
                    className="px-5 py-3 rounded-2xl bg-sky-500 text-white font-extrabold text-xs shadow-lg hover:shadow-sky-500/25 transition-all text-center"
                  >
                    📂 Document Vault
                  </Link>
                </div>
              </div>
            </div>

            {isContradictory ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 text-center space-y-3 shadow-2xl col-span-full">
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto animate-pulse" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Data synchronization required</h3>
                <p className="text-xs text-slate-450">We detected conflicting dashboard metrics. Please update your document vault and settle pending challans to restore alignment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* DIAL 1: COMPLIANCE SCORE */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Compliance Score</span>
                      <strong className="text-3xl font-black text-white tracking-tight">
                        {telemetry.complianceScore ?? 100}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-semibold block">/ 100 pts</span>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" className="stroke-slate-900" strokeWidth="4.5" fill="transparent" />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          style={{ stroke: complianceStatus.ring }}
                          strokeWidth="4.5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - (telemetry.complianceScore ?? 100)/100)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Shield className={`w-5 h-5 ${complianceStatus.color}`} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Compliance Score Deductions (Phase 5) */}
                  {telemetry.complianceContributors && telemetry.complianceContributors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-900/60 space-y-1">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Deduction Reasons:</span>
                      {telemetry.complianceContributors.map((contrib, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                          <span className="truncate">{contrib}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 border-t border-slate-900/60 pt-3 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-semibold">Status:</span>
                    <span className={`font-black uppercase px-2 py-0.5 rounded-full ${complianceStatus.badgeStyle}`}>
                      {complianceStatus.label}
                    </span>
                  </div>
                </div>

                {/* DIAL 2: AWARENESS SCORE */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-500/5 to-transparent rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Awareness Score</span>
                      <strong className="text-3xl font-black text-white tracking-tight">
                        {telemetry.awarenessScore ?? 0}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-semibold block">/ 100 pts</span>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" className="stroke-slate-900" strokeWidth="4.5" fill="transparent" />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          style={{ stroke: awarenessLevel.ring }}
                          strokeWidth="4.5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - (telemetry.awarenessScore ?? 0)/100)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Award className={`w-5 h-5 ${awarenessLevel.color} animate-pulse`} />
                      </div>
                    </div>
                  </div>
                  {/* Awareness score breakdown: modules, chats, route analyses, and reports */}
                  <div className="mt-3 border-t border-slate-900/60 pt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold">Learning Modules (+10, max 40):</span>
                      <span className="font-black text-emerald-400">{telemetry.learningModulesCount ?? 0} viewed</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold">AI Chats (+5, max 20):</span>
                      <span className="font-black text-sky-400">{telemetry.aiChatsCount ?? 0} sessions</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold">Route Analyses (+10, max 20):</span>
                      <span className="font-black text-indigo-400">{telemetry.routesCount ?? 0} completed</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold">Reports (+10, max 20):</span>
                      <span className="font-black text-amber-400">{telemetry.reportsCount ?? 0} generated</span>
                    </div>
                  </div>
                </div>

                {/* DIAL 3: TRAVEL READINESS */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Travel Readiness</span>
                      <strong className="text-3xl font-black text-white tracking-tight">
                        {telemetry.travelReadinessScore ?? 100}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-semibold block">/ 100% Ready</span>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" className="stroke-slate-900" strokeWidth="4.5" fill="transparent" />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          style={{ stroke: travelReadiness.ring }}
                          strokeWidth="4.5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - (telemetry.travelReadinessScore ?? 100)/100)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Compass className={`w-5 h-5 ${travelReadiness.color}`} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-900/60 pt-3 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-semibold">Readiness Level:</span>
                    <span className={`font-black uppercase px-2 py-0.5 rounded-full ${travelReadiness.badgeStyle}`}>
                      {travelReadiness.label}
                    </span>
                  </div>
                </div>

                {/* DIAL 4: VIOLATION RISK SCORE */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/5 to-transparent rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Violation Risk Index</span>
                      <strong className="text-3xl font-black text-white tracking-tight">
                        {telemetry.violationRiskScore ?? 10}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-semibold block">/ 100% Risk</span>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="26" className="stroke-slate-900" strokeWidth="4.5" fill="transparent" />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          style={{ stroke: violationRisk.ring }}
                          strokeWidth="4.5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - (telemetry.violationRiskScore ?? 10)/100)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <AlertTriangle className={`w-5 h-5 ${violationRisk.color} animate-bounce`} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-900/60 pt-3 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-semibold">Challan Exposure:</span>
                    <span className={`font-black uppercase px-2 py-0.5 rounded-full ${violationRisk.badgeStyle}`}>
                      {violationRisk.label}
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* TWO-COLUMN GRID: Left (Vehicles & Documents Vault Indicators), Right (Renewals Timeline & Active Fines) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN: VEHICLES & COMPLIANCE VAULT STATUS INDICATORS (8-spanned columns) */}
              <div className="lg:col-span-8 space-y-8">

                 {/* DEDICATED ROUTE RISK PLANNER SUMMARY CARD */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-xl">
                        <MapIcon className="w-5 h-5 text-emerald-450 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          Route Planner Summary
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Check predictive hazards and legal compliance before starting your drive.
                        </p>
                      </div>
                    </div>
                    
                    <Link
                      to="/route-planner"
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white font-extrabold text-[10px] shadow-lg hover:shadow-emerald-500/15 transition-all flex items-center gap-1.5 shrink-0"
                    >
                      Open Route Planner ➜
                    </Link>
                  </div>

                  {pastReports && pastReports?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* STAT 1: LAST ANALYZED ROUTE */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900/60 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Last Analyzed Route</span>
                          <strong className="text-xs font-bold text-white block mt-1.5 truncate">
                            {pastReports?.[0]?.source?.split?.(',')?.[0] || 'N/A'} ➜ {pastReports?.[0]?.destination?.split?.(',')?.[0] || 'N/A'}
                          </strong>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-2">
                          Analyzed: {pastReports?.[0]?.createdAt ? new Date(pastReports[0].createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>

                      {/* STAT 2: CORRIDOR SAFETY SCORE */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900/60 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Safety Score</span>
                          <strong className="text-lg font-black text-white block mt-0.5">
                            {pastReports?.[0]?.safetyScore !== undefined ? `${pastReports[0].safetyScore} / 100` : 'N/A'}
                          </strong>
                        </div>
                        {pastReports?.[0]?.safetyScore !== undefined && (
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            pastReports[0].safetyScore > 80 ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                            pastReports[0].safetyScore > 60 ? 'bg-sky-500/10 text-sky-450 border border-sky-500/20' :
                            'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                          }`}>
                            {pastReports[0].safetyScore > 80 ? 'Safe' : pastReports[0].safetyScore > 60 ? 'Fair' : 'Risky'}
                          </span>
                        )}
                      </div>

                      {/* STAT 3: STATS OVERVIEW */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900/60 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Total Audited Routes</span>
                          <strong className="text-lg font-black text-sky-400 mt-0.5 block">{pastReports?.length || 0} Routes</strong>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-2">Active GIS Overlays</span>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-950/20 rounded-2xl border border-slate-900">
                      <Compass className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <h4 className="text-[10px] font-bold text-slate-450">No routes analyzed yet.</h4>
                    </div>
                  )}
                </div>
                
                {/* DOCK VALID VAULT STATUS BOX */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          Compliance Document Checklist
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Monitors essential documents dynamically parsed through AI OCR scanning engines.
                        </p>
                      </div>
                    </div>
                    
                    <Link
                      to="/vault"
                      className="text-[10px] font-black text-sky-400 hover:text-sky-300 underline tracking-wider"
                    >
                      Sync Vault ➜
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { id: 'DL', title: 'Driving License', desc: 'Driver authentication' },
                      { id: 'RC', title: 'Registration (RC)', desc: 'Vehicle ownership records' },
                      { id: 'Insurance', title: 'Car Insurance', desc: 'Active liability policies' },
                      { id: 'PUC', title: 'PUC Certificate', desc: 'Emissions validity limits' }
                    ].map(card => {
                      const status = telemetry.documentStatus?.[card.id] || 'Missing';
                      const isExpired = status === 'Expired';
                      const isExpiring = status === 'Expiring Soon';
                      const isValid = status === 'Valid';
                      
                      return (
                        <div
                          key={card.id}
                          className={`border rounded-2xl p-4 flex flex-col justify-between h-32 transition-all relative overflow-hidden group select-none ${
                            isValid ? 'bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/25' :
                            isExpiring ? 'bg-amber-500/5 border-amber-500/15 hover:border-amber-500/25' :
                            isExpired ? 'bg-rose-500/5 border-rose-500/15 hover:border-rose-500/25' :
                            'bg-slate-900/30 border-slate-900/80 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <strong className="text-xs font-bold text-white block truncate">{card.title}</strong>
                              <span className="text-[8px] text-slate-500 font-semibold block mt-0.5">{card.desc}</span>
                            </div>
                            
                            {/* Vault checkbox dial icon */}
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                              isValid ? 'bg-emerald-500 border-emerald-500 text-white' :
                              isExpiring ? 'bg-amber-500 border-amber-500 text-slate-900' :
                              isExpired ? 'bg-rose-500 border-rose-500 text-white' :
                              'border-slate-700 bg-slate-950/60 text-slate-600'
                            }`}>
                              {isValid && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                              {isExpiring && <Clock className="w-3.5 h-3.5 stroke-[2.5]" />}
                              {isExpired && <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />}
                              {status === 'Missing' && <span className="text-[10px] font-black">!</span>}
                            </div>
                          </div>

                          <div className="mt-4 border-t border-slate-900/30 pt-2.5 flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Status</span>
                            <span className={`text-[9px] font-black uppercase ${
                              isValid ? 'text-emerald-400' :
                              isExpiring ? 'text-amber-400' :
                              isExpired ? 'text-rose-400 animate-pulse' :
                              'text-slate-500'
                            }`}>
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* VEHICLE PROFILE LISTING BOX */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                        <Compass className="w-5 h-5 text-indigo-400 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          Vehicle Profile Registry ({vehicles.length})
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Register and track multiple vehicles to scan their regulatory documents automatically.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowAddVehicleModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl text-white font-extrabold text-[10px] shadow-lg hover:shadow-indigo-500/15 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3" /> Add Vehicle
                    </button>
                  </div>

                  {vehicles.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/20 border border-slate-900 px-6 rounded-2xl">
                      <Compass className="w-10 h-10 text-slate-700 mx-auto mb-2.5" />
                      <h4 className="text-xs font-bold text-slate-400">No data available yet.</h4>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vehicles.map(veh => (
                        <div
                          key={veh._id}
                          className="bg-[#0c1224]/50 hover:bg-[#0c1224]/90 border border-slate-900 hover:border-slate-800/80 rounded-2xl p-4 md:p-5 transition-all flex items-center justify-between gap-4 group relative overflow-hidden"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0">
                              <Compass className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-350 tracking-wider">
                                  {veh.plateNumber}
                                </span>
                                {veh.vehicleType && (
                                  <span className="text-[8px] font-black px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full uppercase tracking-wider">
                                    {veh.vehicleType}
                                  </span>
                                )}
                              </div>
                              <strong className="text-xs font-black text-white block mt-2 truncate">
                                {veh.vehicleName || `${veh.make} ${veh.model}`}
                              </strong>
                              <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-tight">
                                {veh.make} {veh.model} • {veh.fuelType}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold block mt-1">
                                Reg: {veh.year} • Age: {new Date().getFullYear() - veh.year} {new Date().getFullYear() - veh.year === 1 ? 'year' : 'years'}
                              </span>
                              <span className="text-[8px] text-slate-600 font-bold block mt-1.5 uppercase tracking-wider">
                                Updated: {new Date(veh.updatedAt || veh.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })} • {new Date(veh.updatedAt || veh.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                            <button
                              onClick={() => handleEditVehicle(veh)}
                              className="px-2.5 py-1.5 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 border border-slate-900 hover:border-sky-500/20 rounded-xl transition-all text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                              title="✏️ Edit Vehicle"
                            >
                              <span>✏️</span> <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(veh._id)}
                              className="px-2.5 py-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-900 hover:border-rose-500/20 rounded-xl transition-all text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                              title="🗑️ Delete Vehicle"
                            >
                              <span>🗑️</span> <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: RENEWALS TIMELINE & ALERTS (4-spanned columns) */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* UPCOMING DEADLINES RENEWAL BOX */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-5 shadow-2xl space-y-5">
                  <div className="border-b border-slate-900 pb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Upcoming Compliance Renewals</span>
                    <p className="text-[9px] text-slate-500 leading-normal font-semibold mt-0.5">Alerts generated in real-time by node-cron scheduler sweeps.</p>
                  </div>

                  {documents.filter(d => d.status === 'Expired' || d.status === 'Expiring Soon').length === 0 && upcomingFines.length === 0 ? (
                    <div className="text-center py-8 bg-slate-950/20 rounded-2xl border border-slate-900">
                      <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2.5 animate-bounce" />
                      <h4 className="text-[10px] font-bold text-slate-400">No data available yet.</h4>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {/* 1. Fine Expiries */}
                      {upcomingFines.map(fine => (
                        <div key={fine._id} className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-2xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <strong className="text-[10px] text-white block font-bold leading-tight">{fine.vehicleNumber}</strong>
                              <span className="text-[8px] text-rose-400 font-bold block mt-0.5">Challan payment due ₹{fine.amount}</span>
                            </div>
                          </div>
                          <Link to="/fines" className="text-[8px] font-bold text-sky-400 underline shrink-0">Pay ➜</Link>
                        </div>
                      ))}

                      {/* 2. Document Expiries */}
                      {documents.filter(d => d.status === 'Expired' || d.status === 'Expiring Soon').map(doc => {
                        const isExpired = doc.status === 'Expired';
                        return (
                          <div
                            key={doc._id}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                              isExpired ? 'bg-rose-500/5 border-rose-500/15' : 'bg-amber-500/5 border-amber-500/15'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-xl ${isExpired ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <strong className="text-[10px] text-white block font-bold leading-tight">{doc.documentType}</strong>
                                <span className={`text-[8px] font-bold block mt-0.5 ${isExpired ? 'text-rose-400' : 'text-amber-400'}`}>
                                  {isExpired ? 'Expired' : 'Expiring Soon'} (Exp: {new Date(doc.expiryDate).toLocaleDateString()})
                                </span>
                              </div>
                            </div>
                            <Link to="/vault" className="text-[8px] font-bold text-sky-400 underline shrink-0">Renew ➜</Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* NOTIFICATIONS STREAM BOX */}
                <div className="bg-[#0b101f]/65 border border-slate-800/80 rounded-3xl p-5 shadow-2xl space-y-4">
                  <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Compliance Alerts Feed</span>
                    {unreadCount > 0 && (
                      <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse shrink-0">
                        {unreadCount} New
                      </span>
                    )}
                  </div>

                  {recentNotifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-[10px] font-semibold">
                      No notifications available.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentNotifications.map(notif => (
                        <div key={notif._id} className="bg-slate-900/40 border border-slate-900 p-3 rounded-2xl flex items-start gap-2.5 justify-between">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold text-white block truncate">{notif.title}</span>
                            <p className="text-[8px] text-slate-500 font-semibold leading-relaxed mt-0.5 line-clamp-2">{notif.message}</p>
                          </div>
                          
                          <button
                            onClick={async () => {
                              try {
                                await axios.put(`${API_URL}/notifications/read/${notif._id}`, {}, getAuthHeaders());
                                fetchTelemetryData();
                              } catch (err) {
                                console.error("Mark read failure:", err.message);
                              }
                            }}
                            className="p-1 hover:bg-slate-800 text-sky-400 rounded-lg transition-colors border border-transparent"
                            title="Dismiss Alert"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      <Link
                        to="/notifications"
                        className="block text-center text-[9px] font-black text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider mt-2 border-t border-slate-900/60 pt-2"
                      >
                        Launch Alert Panel ➜
                      </Link>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

      </div>

      {/* CUSTOM VEHICLE DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {vehicleToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
            onClick={() => setVehicleToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#090f1d] border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setVehicleToDelete(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Delete Vehicle</h3>
                </div>
                <p className="text-[10px] text-slate-500">This action cannot be undone.</p>
              </div>

              <div className="text-slate-300 text-xs leading-relaxed">
                Are you sure you want to remove this vehicle from your account? Linked documents will be unlinked.
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setVehicleToDelete(null)}
                  disabled={isDeletingVehicle}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVehicle}
                  disabled={isDeletingVehicle}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingVehicle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Deleting Vehicle...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Vehicle
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD VEHICLE MODAL */}
      <AnimatePresence>
        {showAddVehicleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
            onClick={() => !isLoading && setShowAddVehicleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#090f1d] border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => { setShowAddVehicleModal(false); setYearError(''); }}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
                aria-label="Close add vehicle modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sky-400">
                  <Compass className="w-5 h-5 animate-spin" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Register New Vehicle Profile</h3>
                </div>
                <p className="text-[10px] text-slate-500">Inputs will be normalized (e.g. plate TN-07-CS-9901 pre-saved).</p>
              </div>

              <form onSubmit={handleCreateVehicle} className="space-y-4" noValidate>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Plate Number (Registration No.)</label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    placeholder="e.g. TN07CS9901"
                    required
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Manufacturer Make</label>
                    <input
                      type="text"
                      value={newMake}
                      onChange={(e) => setNewMake(e.target.value)}
                      placeholder="e.g. Tata, Hyundai"
                      required
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Model Name</label>
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Nexon, Creta"
                      required
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Fuel Type</label>
                    <select
                      value={newFuel}
                      onChange={(e) => setNewFuel(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric (EV)</option>
                      <option value="CNG">CNG</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Registration Year</label>
                    <input
                      type="number"
                      value={newYear}
                      onChange={(e) => {
                        setNewYear(e.target.value);
                        setYearError('');
                      }}
                      min="1914"
                      max={new Date().getFullYear() + 1}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                    {yearError && (
                      <p className="mt-1 text-[10px] text-rose-400 font-semibold">{yearError}</p>
                    )}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  type="submit"
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 py-3 rounded-xl text-white text-xs font-black tracking-wider uppercase shadow-lg hover:shadow-indigo-500/25 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Registering vehicle...
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5" />
                      Save Vehicle Profile
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {showEditVehicleModal && vehicleToEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => !isLoading && setShowEditVehicleModal(false)}
          >
            <motion.div
              ref={editModalRef}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full sm:h-auto sm:max-w-xl bg-[#090f1d] sm:border border-slate-800 sm:rounded-3xl p-6 md:p-8 space-y-4 sm:space-y-6 shadow-2xl relative overflow-y-auto sm:overflow-visible"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-vehicle-title"
            >
              <button
                onClick={() => { !isLoading && setShowEditVehicleModal(false); setEditYearError(''); }}
                disabled={isLoading}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2 text-sky-400">
                  <Compass className="w-5 h-5" />
                  <h3 id="edit-vehicle-title" className="text-sm font-black text-white uppercase tracking-wider">✏️ Modify Vehicle Profile</h3>
                </div>
                <p className="text-[10px] text-slate-500">Edit vehicle particulars. Normalization rules and duplicate filters will be strictly applied.</p>
              </div>

              <form onSubmit={handleUpdateVehicle} className="space-y-4 text-left" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-veh-name" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Vehicle Name *</label>
                    <input
                      id="edit-veh-name"
                      type="text"
                      value={editVehicleName}
                      disabled={isLoading}
                      onChange={(e) => setEditVehicleName(e.target.value)}
                      placeholder="e.g. Nexon Star, Creta Prime"
                      required
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-veh-plate" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Registration Number *</label>
                    <input
                      id="edit-veh-plate"
                      type="text"
                      value={editPlate}
                      disabled={isLoading}
                      onChange={(e) => setEditPlate(e.target.value)}
                      placeholder="e.g. TN07CS9901"
                      required
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-veh-make" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Make (Manufacturer) *</label>
                    <input
                      id="edit-veh-make"
                      type="text"
                      value={editMake}
                      disabled={isLoading}
                      onChange={(e) => setEditMake(e.target.value)}
                      placeholder="e.g. Tata, Hyundai"
                      required
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-veh-model" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Model Name *</label>
                    <input
                      id="edit-veh-model"
                      type="text"
                      value={editModel}
                      disabled={isLoading}
                      onChange={(e) => setEditModel(e.target.value)}
                      placeholder="e.g. Nexon, Creta"
                      required
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-veh-fuel" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Fuel Type *</label>
                    <select
                      id="edit-veh-fuel"
                      value={editFuel}
                      disabled={isLoading}
                      onChange={(e) => setEditFuel(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none disabled:opacity-50"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric (EV)</option>
                      <option value="CNG">CNG</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-veh-year" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Registration Year *</label>
                    <input
                      id="edit-veh-year"
                      type="number"
                      value={editYear}
                      disabled={isLoading}
                      onChange={(e) => {
                        setEditYear(e.target.value);
                        setEditYearError('');
                      }}
                      min="1914"
                      max={new Date().getFullYear() + 1}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none disabled:opacity-50"
                    />
                    {editYearError && (
                      <p className="mt-1 text-[10px] text-rose-450 font-semibold">{editYearError}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-veh-type" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Vehicle Type</label>
                    <input
                      id="edit-veh-type"
                      type="text"
                      value={editVehicleType}
                      disabled={isLoading}
                      onChange={(e) => setEditVehicleType(e.target.value)}
                      placeholder="e.g. Hatchback, SUV, Sedan"
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-veh-color" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Color</label>
                    <input
                      id="edit-veh-color"
                      type="text"
                      value={editColor}
                      disabled={isLoading}
                      onChange={(e) => setEditColor(e.target.value)}
                      placeholder="e.g. Red, Black, White"
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="edit-veh-insurance" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Insurance Status</label>
                    <select
                      id="edit-veh-insurance"
                      value={editInsuranceStatus}
                      disabled={isLoading}
                      onChange={(e) => setEditInsuranceStatus(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none disabled:opacity-50"
                    >
                      <option value="">-- Choose Status (Optional) --</option>
                      <option value="Valid">Valid</option>
                      <option value="Expiring Soon">Expiring Soon</option>
                      <option value="Expired">Expired</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="edit-veh-notes" className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Additional Notes</label>
                    <textarea
                      id="edit-veh-notes"
                      value={editAdditionalNotes}
                      disabled={isLoading}
                      onChange={(e) => setEditAdditionalNotes(e.target.value)}
                      placeholder="Enter any additional remarks..."
                      rows="2"
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {(() => {
                  const initialPlateClean = (vehicleToEdit?.plateNumber || '').toUpperCase().replace(/[-\s]/g, '');
                  const currentPlateClean = editPlate.toUpperCase().replace(/[-\s]/g, '');
                  const hasNoChanges = vehicleToEdit &&
                    initialPlateClean === currentPlateClean &&
                    editMake.trim() === (vehicleToEdit.make || '').trim() &&
                    editModel.trim() === (vehicleToEdit.model || '').trim() &&
                    editFuel === (vehicleToEdit.fuelType || 'Petrol') &&
                    Number(editYear) === (vehicleToEdit.year || 0) &&
                    editVehicleName.trim() === (vehicleToEdit.vehicleName || `${vehicleToEdit.make} ${vehicleToEdit.model}` || '').trim() &&
                    editVehicleType.trim() === (vehicleToEdit.vehicleType || '').trim() &&
                    editColor.trim() === (vehicleToEdit.color || '').trim() &&
                    editInsuranceStatus === (vehicleToEdit.insuranceStatus || '') &&
                    editAdditionalNotes.trim() === (vehicleToEdit.additionalNotes || '').trim();

                  return (
                    <div className="space-y-4">
                      {hasNoChanges && (
                        <div className="p-2.5 rounded-xl border border-amber-500/10 bg-amber-500/5 text-center">
                          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">⚠️ No changes detected.</p>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => { setShowEditVehicleModal(false); setVehicleToEdit(null); setEditYearError(''); }}
                          className="w-full sm:w-1/3 py-3 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <motion.button
                          whileHover={!hasNoChanges && !isLoading ? { scale: 1.015 } : {}}
                          whileTap={!hasNoChanges && !isLoading ? { scale: 0.985 } : {}}
                          disabled={isLoading || hasNoChanges}
                          type="submit"
                          className="w-full sm:w-2/3 bg-gradient-to-r from-sky-500 to-indigo-600 disabled:opacity-30 disabled:pointer-events-none py-3 rounded-xl text-white text-xs font-black tracking-wider uppercase shadow-lg hover:shadow-indigo-500/25 transition-all flex justify-center items-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Saving changes...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Save Changes
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  );
                })()}
              </form>
            </motion.div>
          </motion.div>
        )}

    </div>
  );
};

export default Dashboard;
