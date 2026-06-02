import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  User, Lock, Mail, ShieldCheck, Shield, GraduationCap, Calendar, FileText,
  Bell, Map, AlertTriangle, Clock, RefreshCw, BarChart2, Check, Key, Eye,
  EyeOff, Globe, Monitor, Smartphone, CheckCircle, AlertCircle, Edit2, Camera, XCircle
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';


import {
  getTravelReadiness,
  getComplianceStatus,
  getViolationRisk,
  getAwarenessLevel
} from '../utils/scoreRules';

// ── Circular Score Dial ────────────────────────────────────────────────────
const ScoreDial = ({ score, label, type, size = 95, icon: Icon }) => {
  let rule;
  if (type === 'compliance') rule = getComplianceStatus(score);
  else if (type === 'awareness') rule = getAwarenessLevel(score);
  else if (type === 'readiness') rule = getTravelReadiness(score);
  else if (type === 'risk') rule = getViolationRisk(score);
  else rule = getComplianceStatus(score);

  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={rule.ring} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon && <Icon className={`w-3.5 h-3.5 ${rule.color} mb-0.5`} />}
          <span className={`text-base font-black ${rule.color} leading-none`}>{score}</span>
        </div>
      </div>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center leading-tight">{label}</span>
      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${rule.badgeStyle}`}>
        {rule.label}
      </span>
    </div>
  );
};

// Preset Avatars
const PRESET_AVATARS = [
  { id: 'shield', icon: Shield, color: 'from-sky-400 to-blue-600', label: 'Safety Guardian', value: '🛡️' },
  { id: 'grad', icon: GraduationCap, color: 'from-emerald-400 to-teal-600', label: 'Scholar', value: '🧠' },
  { id: 'map', icon: Map, color: 'from-amber-400 to-orange-600', label: 'Cruiser', value: '🧭' },
  { id: 'alert', icon: AlertTriangle, color: 'from-rose-400 to-red-650', label: 'Risk Specialist', value: '⚠️' },
  { id: 'user', icon: User, color: 'from-indigo-400 to-violet-650', label: 'Standard Driver', value: '🚗' }
];

// ── Notification Toggle Switch ────────────────────────────────────────────
const ToggleSwitch = ({ enabled, onToggle, labelOn = 'Enabled', labelOff = 'Disabled', disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    disabled={disabled}
    onClick={onToggle}
    className="flex items-center gap-2 group focus:outline-none"
  >
    {/* Track */}
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${
        enabled
          ? 'border-emerald-500 bg-emerald-500'
          : 'border-slate-700 bg-slate-800'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Knob */}
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="inline-block h-4 w-4 my-auto rounded-full bg-white shadow-md"
        style={{ marginLeft: enabled ? 'calc(100% - 20px)' : '2px' }}
      />
    </span>
    {/* Label */}
    <span className={`text-[11px] font-black uppercase tracking-wider transition-colors ${
      enabled ? 'text-emerald-400' : 'text-slate-500'
    }`}>
      {enabled ? labelOn : labelOff}
    </span>
  </button>
);

const Profile = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'analytics', 'settings', 'sessions'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Settings State
  const [nameInput, setNameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const getPasswordStrength = (pwd) => {
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  };

  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [dashboardAlerts, setDashboardAlerts] = useState(true);
  const [reminderPrefs, setReminderPrefs] = useState([]);

  const token = localStorage.getItem('token');

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch main user profile
      const userRes = await axios.get(`${API_URL}/api/auth/profile`, getAuthHeaders());
      if (userRes.data?.success) {
        const u = userRes.data.user;
        setUser(u);
        setNameInput(u.name);
        setAvatarInput(u.avatar || '');
        if (u.notificationSettings) {
          setNotificationsEnabled(u.notificationSettings.enabled !== false);
          setEmailReminders(u.notificationSettings.emailReminders);
          setDashboardAlerts(u.notificationSettings.dashboardAlerts);
          setReminderPrefs(u.notificationSettings.reminderPreferences || []);
        }
      }

      // 2. Fetch statistics
      const statsRes = await axios.get(`${API_URL}/api/auth/profile/statistics`, getAuthHeaders());
      if (statsRes.data?.success) {
        setStats(statsRes.data.statistics);
      }

      // 3. Fetch activity log
      const actRes = await axios.get(`${API_URL}/api/auth/profile/activity`, getAuthHeaders());
      if (actRes.data?.success) {
        setActivities(actRes.data.activity);
      }

      // 4. Fetch analytics charts
      const anaRes = await axios.get(`${API_URL}/api/reports/analytics`, getAuthHeaders());
      if (anaRes.data?.success) {
        setAnalytics(anaRes.data.analytics);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
      showToast('error', 'Error loading profile settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle Profile Update (Name & Avatar)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await axios.put(`${API_URL}/api/auth/profile/update`, {
        name: nameInput,
        avatar: avatarInput
      }, getAuthHeaders());
      
      if (res.data?.success) {
        showToast('success', 'Profile updated successfully.');
        setUser(prev => ({ ...prev, name: nameInput, avatar: avatarInput }));
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      showToast('error', 'Current password is required.');
      return;
    }

    const strength = getPasswordStrength(newPassword);
    const isPasswordValid = Object.values(strength).every(Boolean);

    if (!isPasswordValid) {
      showToast('error', 'New password does not meet strength requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await axios.put(`${API_URL}/api/auth/profile/password`, {
        currentPassword,
        newPassword
      }, getAuthHeaders());

      if (res.data?.success) {
        showToast('success', 'Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Toggle Reminder Frequency List
  const toggleReminderPref = async (pref) => {
    let updated = [...reminderPrefs];
    if (updated.includes(pref)) {
      updated = updated.filter(p => p !== pref);
    } else {
      updated.push(pref);
    }
    setReminderPrefs(updated);
    await saveNotificationSettings(emailReminders, dashboardAlerts, updated);
  };

  // Save Notification Preferences
  const saveNotificationSettings = async (email, dashboard, prefs, enabledVal) => {
    try {
      await axios.put(`${API_URL}/api/auth/notification-settings`, {
        enabled: enabledVal !== undefined ? enabledVal : notificationsEnabled,
        emailReminders: email,
        dashboardAlerts: dashboard,
        reminderPreferences: prefs
      }, getAuthHeaders());
      showToast('success', 'Notification preferences saved.');
    } catch (err) {
      showToast('error', 'Failed to save notifications.');
    }
  };

  // Clean Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    showToast('success', 'Logging out...');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const isContradictory = (() => {
    if (!user) return false;
    const comp = user.complianceScore ?? 100;
    const ready = user.travelReadinessScore ?? 100;
    const risk = user.violationRiskScore ?? 10;
    
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
    
    // 3. No pending challans, No expired/missing/unusual documents cannot display: AT RISK, HIGH RISK, EXTREME DANGER
    const docStatus = user.documentStatus || {};
    const hasExpiredDocs = Object.values(docStatus).some(status => status === 'Expired');
    const hasMissingDocs = Object.values(docStatus).some(status => status === 'Missing');
    const hasChallans = stats?.challans > 0;
    
    if (!hasChallans && !hasExpiredDocs && !hasMissingDocs) {
      if (riskRule.label === 'Extreme Danger' || riskRule.label === 'High Risk') {
        return true;
      }
      const compStatus = getComplianceStatus(comp);
      if (compStatus.label === 'At Risk') {
        return true;
      }
    }
    
    return false;
  })();

  useEffect(() => {
    if (isContradictory) {
      console.warn("[DATA INTEGRITY WARNING] Contradictory compliance metrics detected. Data synchronization required.");
    }
  }, [isContradictory]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white pt-16">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm">Compiling profile analytics...</p>
        </div>
      </div>
    );
  }

  // Chart data — only populated from real API responses. No synthetic fallback data.
  // If analytics.scoreTrend is empty, chart renders an empty-state prompt instead.
  const scoreTrendData = analytics?.scoreTrend?.length > 0 ? analytics.scoreTrend : [];

  // Doc health pie — only uses real document stats from the server
  const docHealthChartData = analytics?.docHealthChart?.length > 0 ? analytics.docHealthChart : [
    { name: 'Valid', value: stats?.documents || 0 },
    { name: 'Missing', value: Math.max(0, 4 - (stats?.documents || 0)) }
  ];

  // Fine history bar chart — uses only actual fine records from activity log.
  // Empty array shown as a 'no fines recorded' state if user has no fines.
  const fineHistoryData = activities?.fines?.length > 0
    ? activities.fines.map(f => ({ date: new Date(f.issueDate).toLocaleDateString(), amount: f.amount }))
    : [];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

  return (
    <div className="min-h-screen bg-slate-900 text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border flex items-center gap-3 shadow-2xl max-w-sm backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Branded Header */}
        <div className="glass rounded-3xl p-6 md:p-8 border border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/5 pointer-events-none" />
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 p-0.5 flex items-center justify-center text-3xl shadow-xl">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-bold">
                  {user?.avatar ? (
                    <span>{PRESET_AVATARS.find(a => a.id === user.avatar)?.value || '🚗'}</span>
                  ) : (
                    <User className="w-10 h-10 text-slate-500" />
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-white">{user?.name}</h1>
                {user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Verified Badge
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-450 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                    <AlertCircle className="w-3 h-3 text-rose-450" /> Not Verified Badge
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">
                {user?.email} 
                {user?.username && <span className="text-slate-500"> | @{user.username}</span>} 
                {user?.phone && <span className="text-slate-500"> | {user.phone}</span>}
              </p>
              
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  Member since: {new Date(user?.createdAt).toLocaleDateString()}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Last Active: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Just now'}
                </span>
                {user?.emailVerified && user?.emailVerifiedAt && (
                  <span className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Verified: {new Date(user.emailVerifiedAt).toLocaleString()}
                  </span>
                )}
                {!user?.emailVerified && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await axios.post(`${API_URL}/api/auth/resend-verification`, { email: user?.email }, getAuthHeaders());
                        if (res.data?.success) {
                          showToast('success', res.data.message || 'Verification email resent.');
                        }
                      } catch (err) {
                        showToast('error', err.response?.data?.message || 'Failed to resend verification.');
                      }
                    }}
                    className="bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 rounded-lg px-2.5 py-1 text-[10px] text-rose-350 font-bold uppercase transition-all"
                  >
                    Resend Verification
                  </button>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="px-5 py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-450 hover:bg-rose-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
          >
            Secure Signout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-sm">
          {['overview', 'analytics', 'settings', 'sessions'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchParams({ tab });
              }}
              className={`pb-4 px-1 capitalize font-black tracking-wider transition-all border-b-2 ${
                activeTab === tab 
                  ? 'border-sky-400 text-sky-400' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="space-y-8">
          {/* TAB 1 — OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Score Dials Row */}
              <div className="glass border border-slate-700/50 rounded-3xl p-6">
                <h2 className="text-xs font-black text-sky-400 uppercase tracking-widest mb-6">DriveLegal AI Driver Profile Scores</h2>
                {isContradictory ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto animate-pulse" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Data synchronization required</h3>
                    <p className="text-[11px] text-slate-450">We detected conflicting profile metrics. Please update your document vault and settle pending challans to restore alignment.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                      <ScoreDial score={user?.complianceScore ?? 100} label="Compliance" type="compliance" icon={Shield} />
                      <ScoreDial score={user?.awarenessScore ?? 0} label="Awareness" type="awareness" icon={GraduationCap} />
                      <ScoreDial score={user?.travelReadinessScore ?? 100} label="Travel Readiness" type="readiness" icon={Map} />
                      <ScoreDial score={user?.violationRiskScore ?? 10} label="Violation Risk" type="risk" icon={AlertTriangle} />
                    </div>

                    {/* Double-column section under Dials row explaining deductions & activity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800/80 pt-6">
                      {/* Left: Compliance Score Explanations */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-emerald-400" /> Compliance Score Contributors
                        </h3>
                        <div className="space-y-1.5">
                          {user?.complianceContributors && user.complianceContributors.length > 0 ? (
                            user.complianceContributors.map((contrib, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-slate-350">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span>{contrib}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic">No score deductions registered.</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Awareness Score Explanations */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-sky-400" /> Awareness Score Breakdown
                        </h3>
                        <div className="space-y-2 text-xs text-slate-355">
                          <div className="flex items-center justify-between">
                            <span>Learning Modules Viewed (+10 pts each, max 40):</span>
                            <span className="font-bold text-emerald-400">{Math.min(40, (user?.learningModulesViewed?.length || 0) * 10)} pts ({(user?.learningModulesViewed?.length || 0)} viewed)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>AI Assistant Chats (+5 pts each, max 20):</span>
                            <span className="font-bold text-sky-400">{Math.min(20, (user?.trafficAssistantChatsCount || 0) * 5)} pts ({user?.trafficAssistantChatsCount || 0} sessions)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Route Analyses Completed (+10 pts each, max 20):</span>
                            <span className="font-bold text-indigo-400">{Math.min(20, (stats?.routes || 0) * 10)} pts ({stats?.routes || 0} routes)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Monthly Reports Generated (+10 pts each, max 20):</span>
                            <span className="font-bold text-amber-400">{Math.min(20, (stats?.reports || 0) * 10)} pts ({stats?.reports || 0} reports)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Vehicles Registered', value: stats?.vehicles ?? 0, color: 'text-sky-400' },
                  { label: 'Documents Uploaded', value: stats?.documents ?? 0, color: 'text-indigo-400' },
                  { label: 'Routes Analyzed', value: stats?.routes ?? 0, color: 'text-emerald-400' },
                  { label: 'Challans Analyzed', value: stats?.challans ?? 0, color: 'text-amber-400' },
                  { label: 'AI Chats Had', value: stats?.aiChats ?? 0, color: 'text-pink-400' },
                  { label: 'Reports Compiled', value: stats?.reports ?? 0, color: 'text-violet-400' },
                  { label: 'Alerts Received', value: stats?.notifications ?? 0, color: 'text-rose-400' }
                ].map((item, i) => (
                  <div key={i} className="glass p-5 rounded-2xl border border-slate-700/40 flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    <span className={`text-2xl font-black mt-2 ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Recent Activity Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Route Analyses */}
                <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                    <Map className="w-4 h-4 text-emerald-400" />
                    Recent Route Analyses
                  </h3>
                  {activities?.routes?.length > 0 ? (
                    <div className="space-y-3">
                      {activities.routes.map((r, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-800/30">
                          <span className="font-semibold truncate max-w-[200px]">{r.source} → {r.destination}</span>
                          <span className="text-slate-500 font-bold shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4">No routes analyzed yet.</p>
                  )}
                </div>

                {/* Recent Challans */}
                <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Recent Fines & Challans
                  </h3>
                  {activities?.fines?.length > 0 ? (
                    <div className="space-y-3">
                      {activities.fines.map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-800/30">
                          <div>
                            <p className="font-bold text-slate-300">{f.violationType}</p>
                            <p className="text-[10px] text-slate-500">Fine amount: ₹{f.amount}</p>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            f.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                          }`}>
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4">No challans detected.</p>
                  )}
                </div>

                {/* Recent Notifications */}
                <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-sky-400" />
                    Recent Alerts
                  </h3>
                  {activities?.notifications?.length > 0 ? (
                    <div className="space-y-3">
                      {activities.notifications.map((n, i) => (
                        <div key={i} className="text-xs p-2.5 rounded-xl bg-slate-800/30 space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-300">{n.title}</span>
                            <span className="text-[9px] text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4">No notifications available.</p>
                  )}
                </div>

                {/* Recent Learning Activity */}
                <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    Recent Learning Activity
                  </h3>
                  {activities?.learning?.length > 0 ? (
                    <div className="space-y-3">
                      {activities.learning.map((mod, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-2.5 rounded-xl bg-slate-800/30">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="font-semibold text-slate-300 capitalize">Module: {mod.replace(/_/g, ' ')} Completed</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4">No data available yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2 — ANALYTICS */}
          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Compliance Trend Chart */}
              <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-3">
                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <Shield className="w-4.5 h-4.5 text-sky-400" />
                  Compliance Score Trend
                </h3>
                <p className="text-[10px] text-slate-500">Historical compliance record over time</p>
                <div className="h-48 mt-4">
                  {scoreTrendData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <BarChart2 className="w-8 h-8 text-slate-700 mb-2" />
                      <p className="text-[10px] text-slate-500 font-semibold">No compliance history yet.</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">Score trend will appear after your first month of activity.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 8 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 8 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: 10 }} />
                        <Line type="monotone" dataKey="complianceScore" stroke="#38bdf8" strokeWidth={2} name="Compliance" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Awareness Trend Chart */}
              <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-3">
                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <GraduationCap className="w-4.5 h-4.5 text-emerald-400" />
                  Awareness Score Trend
                </h3>
                <p className="text-[10px] text-slate-500">Historical learning progress over time</p>
                <div className="h-48 mt-4">
                  {scoreTrendData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <BarChart2 className="w-8 h-8 text-slate-700 mb-2" />
                      <p className="text-[10px] text-slate-500 font-semibold">No awareness history yet.</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">Interact with the AI assistant to start building your awareness score.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 8 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 8 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: 10 }} />
                        <Line type="monotone" dataKey="awarenessScore" stroke="#10b981" strokeWidth={2} name="Awareness" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Document Health Chart */}
              <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-3">
                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-indigo-400" />
                  Document Health Status
                </h3>
                <p className="text-[10px] text-slate-500">Distribution of compliance document status</p>
                <div className="h-48 mt-4 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={docHealthChartData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {docHealthChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Fine History Chart */}
              <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-3">
                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                  Fine & Challan History
                </h3>
                <p className="text-[10px] text-slate-500">Fine amounts received over time</p>
                <div className="h-48 mt-4">
                  {fineHistoryData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <Check className="w-8 h-8 text-emerald-700 mb-2" />
                      <p className="text-[10px] text-emerald-500 font-semibold">No fines recorded.</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">Your challan history will appear here once fines are logged.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fineHistoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 8 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: 10 }} />
                        <Bar dataKey="amount" fill="#f59e0b" name="Fine Amount" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3 — SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Account Settings Forms */}
              <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-6 lg:col-span-2">
                <h3 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-3">Update Personal Information</h3>
                
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Driver Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="block w-full pl-11 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Preset Avatar Selection */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Select Profile Badge / Avatar</label>
                    <div className="grid grid-cols-5 gap-3">
                      {PRESET_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setAvatarInput(av.id)}
                          className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            avatarInput === av.id 
                              ? 'bg-sky-500/10 border-sky-400 text-sky-400 shadow-lg shadow-sky-500/5' 
                              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 text-slate-400'
                          }`}
                        >
                          <span className="text-2xl">{av.value}</span>
                          <span className="text-[8px] font-bold truncate max-w-full">{av.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isSavingSettings}
                    className="w-full flex justify-center items-center py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                  >
                    {isSavingSettings ? 'Saving Changes...' : 'Save Profile Changes'}
                  </motion.button>
                </form>

                {/* Password Change Form */}
                <h3 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-3 pt-6">Security & Password Modification</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Current Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4.5 h-4.5" />
                        </div>
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="block w-full pl-11 pr-10 py-2.5 border border-slate-700 rounded-xl bg-slate-900/60 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                          aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Key className="w-4.5 h-4.5" />
                        </div>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="block w-full pl-11 pr-10 py-2.5 border border-slate-700 rounded-xl bg-slate-900/60 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Strength Checklist */}
                  <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[10px] text-slate-400" aria-live="polite">
                    <p className="font-bold text-slate-400 mb-1 uppercase tracking-wider text-[8px]">New Password Requirements:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                      {(() => {
                        const newStrength = getPasswordStrength(newPassword);
                        const rules = [
                          { key: 'minLength', label: 'Minimum 8 characters', satisfied: newStrength.minLength },
                          { key: 'hasUpper', label: 'At least 1 uppercase letter (A-Z)', satisfied: newStrength.hasUpper },
                          { key: 'hasLower', label: 'At least 1 lowercase letter (a-z)', satisfied: newStrength.hasLower },
                          { key: 'hasNumber', label: 'At least 1 number (0-9)', satisfied: newStrength.hasNumber },
                          { key: 'hasSpecial', label: 'At least 1 special character (!@#$%^&*)', satisfied: newStrength.hasSpecial },
                        ];
                        return rules.map((rule) => {
                          let colorClass = 'text-slate-500';
                          let Icon = XCircle;
                          let ariaLabel = `${rule.label}: incomplete`;

                          if (newPassword !== '') {
                            if (rule.satisfied) {
                              colorClass = 'text-emerald-450';
                              Icon = CheckCircle;
                              ariaLabel = `${rule.label}: satisfied`;
                            } else {
                              colorClass = 'text-rose-455';
                              Icon = XCircle;
                              ariaLabel = `${rule.label}: unsatisfied`;
                            }
                          }

                          return (
                            <div key={rule.key} className={`flex items-center gap-1.5 ${colorClass}`} aria-label={ariaLabel}>
                              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{rule.label}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-11 pr-10 py-2.5 border border-slate-700 rounded-xl bg-slate-900/60 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>

                    {/* Confirm Password Helper Card */}
                    <div className="space-y-1 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400" aria-live="polite">
                      <div className="flex items-center gap-1.5">
                        {confirmPassword === '' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                            <span className="text-slate-500">Confirm your new password</span>
                          </>
                        ) : newPassword === confirmPassword ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-450" aria-hidden="true" />
                            <span className="text-emerald-450 font-semibold">✓ Passwords Match</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-455" aria-hidden="true" />
                            <span className="text-rose-455 font-semibold">✗ Passwords Do Not Match</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isSavingSettings || !Object.values(getPasswordStrength(newPassword)).every(Boolean) || newPassword !== confirmPassword}
                    className="w-full flex justify-center items-center py-2.5 bg-slate-800 border border-slate-750 hover:bg-slate-750 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                  >
                    {isSavingSettings ? 'Modifying Password...' : 'Change Secure Password'}
                  </motion.button>
                  
                  <div className="text-center pt-2">
                    <Link to="/forgot-password">
                      <button
                        type="button"
                        className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider"
                      >
                        Forgot your current password?
                      </button>
                    </Link>
                  </div>
                </form>
              </div>

              {/* Notification Preferences Sidebar */}
              <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-6">
                <h3 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-3 flex items-center gap-1.5">
                  <Bell className="w-4.5 h-4.5 text-indigo-400" />
                  Alert Channels
                </h3>

                <div className="space-y-5 text-sm">
                  {/* Global Notifications Switch */}
                  <div className="flex justify-between items-center gap-4 border-b border-slate-800/80 pb-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-200">Global Settings</p>
                      <p className="text-[10px] text-slate-500">Enable/disable all alert channels</p>
                    </div>
                    <ToggleSwitch
                      enabled={notificationsEnabled}
                      onToggle={() => {
                        const nextVal = !notificationsEnabled;
                        setNotificationsEnabled(nextVal);
                        saveNotificationSettings(emailReminders, dashboardAlerts, reminderPrefs, nextVal);
                      }}
                      labelOn="Notifications Enabled"
                      labelOff="Notifications Disabled"
                    />
                  </div>

                  {/* Email Reminders Toggle */}
                  <div className={`flex justify-between items-center gap-4 transition-opacity ${!notificationsEnabled ? 'opacity-40' : ''}`}>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-300">Email Reminders</p>
                      <p className="text-[10px] text-slate-500">Challan notifications &amp; reports</p>
                    </div>
                    <ToggleSwitch
                      enabled={emailReminders && notificationsEnabled}
                      disabled={!notificationsEnabled}
                      onToggle={() => {
                        setEmailReminders(!emailReminders);
                        saveNotificationSettings(!emailReminders, dashboardAlerts, reminderPrefs);
                      }}
                      labelOn="On"
                      labelOff="Off"
                    />
                  </div>

                  {/* In-App Dashboard Alerts Toggle */}
                  <div className={`flex justify-between items-center gap-4 transition-opacity ${!notificationsEnabled ? 'opacity-40' : ''}`}>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-300">In-App Alerts</p>
                      <p className="text-[10px] text-slate-500">Live dashboard notifications</p>
                    </div>
                    <ToggleSwitch
                      enabled={dashboardAlerts && notificationsEnabled}
                      disabled={!notificationsEnabled}
                      onToggle={() => {
                        setDashboardAlerts(!dashboardAlerts);
                        saveNotificationSettings(emailReminders, !dashboardAlerts, reminderPrefs);
                      }}
                      labelOn="On"
                      labelOff="Off"
                    />
                  </div>
                </div>

                <h3 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-3 pt-4 flex items-center gap-1.5">
                  <Clock className="w-4.5 h-4.5 text-sky-400" />
                  Reminder Frequency
                </h3>

                <div className="space-y-2 text-xs">
                  {[
                    { key: '7_days', label: '7 days before expiry' },
                    { key: '3_days', label: '3 days before expiry' },
                    { key: '1_day', label: '1 day before expiry' },
                    { key: 'due_date', label: 'On challan due date' },
                    { key: 'overdue', label: 'Daily once overdue' }
                  ].map((freq) => (
                    <button
                      key={freq.key}
                      disabled={!notificationsEnabled}
                      onClick={() => toggleReminderPref(freq.key)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                        !notificationsEnabled
                          ? 'bg-slate-850/20 border-slate-900 text-slate-600 cursor-not-allowed'
                          : reminderPrefs.includes(freq.key)
                          ? 'bg-sky-500/10 border-sky-400 text-sky-400 font-bold'
                          : 'bg-slate-800/20 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <span>{freq.label}</span>
                      {reminderPrefs.includes(freq.key) && notificationsEnabled && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4 — SESSIONS */}
          {activeTab === 'sessions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="glass border border-slate-700/50 rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-3">Active Sessions & Security Telemetry</h3>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-slate-850/40 border border-slate-800/60 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                      {user?.sessionInfo?.device?.toLowerCase().includes('mobi') ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">Current Session</span>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">Active</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Device: {user?.sessionInfo?.device || 'Unknown Client'}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-sky-400" />
                          IP Address: {user?.sessionInfo?.ip || '127.0.0.1'}
                        </span>
                        <span>•</span>
                        <span>Authenticated: {user?.sessionInfo?.loginTime ? new Date(user.sessionInfo.loginTime).toLocaleString() : 'Just now'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-sky-500/10 border border-sky-500/25 rounded-2xl text-xs text-sky-300 leading-relaxed">
                  📢 **Security Information:** Tokens are signed using secure HSA-256 signatures with 7 days expiration period. In case of unexpected active sessions, please update your account password immediately to invalidate other active login credentials.
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
