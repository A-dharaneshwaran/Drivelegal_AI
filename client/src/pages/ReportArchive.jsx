import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Calendar, Award, Activity, FileText, Clock, Printer, ChevronRight,
  TrendingUp, AlertCircle, AlertTriangle, CheckCircle, Plus, Loader2,
  Car, BarChart2, Home, Star, Shield, Download, Bell, Map, Zap,
  BookOpen, RefreshCw, CreditCard, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';


import {
  getTravelReadiness,
  getComplianceStatus,
  getViolationRisk,
  getAwarenessLevel
} from '../utils/scoreRules';

// ── Score helpers ──────────────────────────────────────────────────────────
const scoreColor = (s) => {
  const rule = getComplianceStatus(s);
  return { text: rule.color, bg: rule.bg, border: rule.border, ring: rule.ring };
};
const scoreLabel = (s) => {
  return getComplianceStatus(s).label;
};
const riskLevel = (s) => {
  const rule = getViolationRisk(s);
  return { label: rule.label.toUpperCase(), color: rule.color, bg: rule.bg, border: rule.border };
};
const docStatusStyle = (status) => {
  if (status === 'Valid')         return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  if (status === 'Expiring Soon') return 'border-amber-500/30  bg-amber-500/10  text-amber-400';
  if (status === 'Expired')       return 'border-rose-500/30   bg-rose-500/10   text-rose-400';
  return 'border-slate-700 bg-slate-800/40 text-slate-500';
};

// ── Circular Score Dial ────────────────────────────────────────────────────
const ScoreDial = ({ score, label, type, size = 90, icon: Icon }) => {
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

// ── Custom Tooltip for charts ──────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Doc health pie colours ──────────────────────────────────────────────────
const PIE_COLORS = { Valid: '#10b981', 'Expiring Soon': '#f59e0b', Expired: '#f43f5e', Missing: '#475569' };

// ═══════════════════════════════════════════════════════════════════════════
const ReportArchive = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [snapshot, setSnapshot]   = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports]     = useState([]);
  const [timeline, setTimeline]   = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const getAuth = () => {
    const t = localStorage.getItem('token');
    return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [snapRes, anaRes, repRes, tlRes] = await Promise.all([
        axios.get(`${API_URL}/api/reports/dashboard`,  getAuth()),
        axios.get(`${API_URL}/api/reports/analytics`,  getAuth()),
        axios.get(`${API_URL}/api/reports`,            getAuth()),
        axios.get(`${API_URL}/api/reports/timeline`,   getAuth()),
      ]);
      if (snapRes.data?.success) setSnapshot(snapRes.data.snapshot);
      if (anaRes.data?.success)  setAnalytics(anaRes.data.analytics);
      if (repRes.data?.success) {
        const list = repRes.data.reports;
        setReports(list);
        if (list.length > 0) setSelectedReport(list[0]);
      }
      if (tlRes.data?.success) setTimeline(tlRes.data.timeline);
    } catch (err) {
      console.error('Failed to load report data:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      const res = await axios.post(`${API_URL}/api/reports/generate`, {}, getAuth());
      if (res.data?.success) {
        showToast('Report compiled successfully!', 'success');
        loadAll();
      }
    } catch {
      showToast('Failed to compile report.', 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownloadPdf = async (reportId, monthLabel) => {
    setDownloadingId(reportId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/reports/pdf/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DriveLegal-Report-${monthLabel?.replace(/\s+/g, '-') || 'Report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully!', 'success');
    } catch {
      showToast('Failed to download PDF.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const isContradictory = (() => {
    if (!snapshot?.scores) return false;
    const comp = snapshot.scores.complianceScore ?? 100;
    const ready = snapshot.scores.travelReadinessScore ?? 100;
    const risk = snapshot.scores.violationRiskScore ?? 10;
    
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
    const docStatus = snapshot.documentStatus || {};
    const hasExpiredDocs = Object.values(docStatus).some(status => status === 'Expired');
    const hasMissingDocs = Object.values(docStatus).some(status => status === 'Missing');
    const hasChallans = (snapshot.fines?.pending || 0) + (snapshot.fines?.overdue || 0) > 0;
    
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
      console.warn("[DATA INTEGRITY WARNING] Contradictory compliance metrics detected in snapshot. Data synchronization required.");
    }
  }, [isContradictory]);

  // ── Tab definitions ────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview',       label: 'Overview',         icon: Home },
    { id: 'analytics',      label: 'Analytics',        icon: BarChart2 },
    { id: 'monthly',        label: 'Monthly Reports',  icon: FileText },
    { id: 'timeline',       label: 'Timeline',         icon: Clock },
    { id: 'recommendations',label: 'Recommendations',  icon: Star },
  ];

  // ── Gradient background orbs ─────────────────────────────────────────────
  const Orbs = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
    </div>
  );

  return (
    <div className="pt-20 min-h-screen bg-[#070b14] text-slate-100 font-sans pb-16 relative overflow-hidden">
      <Orbs />

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800/60">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-sky-100 to-slate-400">
              Driver Report Center
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Full compliance analytics, trend intelligence, monthly report cards &amp; PDF certificates.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadAll}
              disabled={isLoading}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-indigo-500/20 hover:shadow-lg px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5"
            >
              {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Compile Report
            </button>
          </div>
        </div>

        {/* ── Tab Navigation ──────────────────────────────────────────── */}
        <div className="flex gap-1.5 p-1.5 bg-slate-950/60 border border-slate-800/60 rounded-2xl mb-8 w-full overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 border border-sky-500/30 text-sky-300 shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Loading State ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4" />
            <p className="text-slate-400 text-sm font-semibold">Loading driver intelligence...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════════════════════════
                TAB 1 — OVERVIEW
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">

                {/* Score Dials Row */}
                {snapshot && (
                  <>
                    <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-[9px] font-black text-sky-400 uppercase tracking-wider">Live Snapshot</p>
                          <h2 className="text-lg font-black text-white mt-0.5">Compliance Intelligence Dashboard</h2>
                          <p className="text-xs text-slate-500 mt-0.5">Welcome back, <strong className="text-slate-300">{snapshot.user?.name}</strong></p>
                        </div>
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/20">
                          <Activity className="w-6 h-6 text-sky-400" />
                        </div>
                      </div>

                      {isContradictory ? (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center space-y-2">
                          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto animate-pulse" />
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">Data synchronization required</h3>
                          <p className="text-[11px] text-slate-450">We detected conflicting dashboard metrics. Please update your document vault and settle pending challans to restore alignment.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                          <ScoreDial score={snapshot.scores.complianceScore}    label="Compliance"      type="compliance" icon={Shield}   />
                          <ScoreDial score={snapshot.scores.awarenessScore}     label="Awareness"       type="awareness"  icon={BookOpen} />
                          <ScoreDial score={snapshot.scores.travelReadinessScore} label="Travel Readiness" type="readiness"  icon={Map}    />
                          <ScoreDial score={snapshot.scores.violationRiskScore}  label="Violation Risk"   type="risk"       icon={AlertTriangle} />
                        </div>
                      )}
                    </div>

                    {/* Doc Status + Fine Summary Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* Document Health */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            Document Vault
                          </h3>
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${
                            snapshot.validDocsCount === 4
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}>
                            {snapshot.validDocsCount}/4 VALID
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {['DL', 'RC', 'Insurance', 'PUC'].map(type => {
                            const status = snapshot.documentStatus?.[type] || 'Missing';
                            const labels = { DL: 'Driving License', RC: 'Registration', Insurance: 'Insurance', PUC: 'PUC Certificate' };
                            return (
                              <div key={type} className={`p-3 rounded-2xl border flex items-center justify-between ${docStatusStyle(status)}`}>
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-wider opacity-70">{labels[type]}</p>
                                  <p className="text-[10px] font-black mt-0.5">{type}</p>
                                </div>
                                <span className="text-[8px] font-black uppercase">{status === 'Expiring Soon' ? 'EXPIRING' : status}</span>
                              </div>
                            );
                          })}
                        </div>
                        {snapshot.scores?.complianceContributors && snapshot.scores.complianceContributors.length > 0 && (
                          <div className="pt-3 border-t border-slate-800/40 space-y-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Compliance Deductions:</span>
                            {snapshot.scores.complianceContributors.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[9px] text-rose-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                <span className="truncate text-slate-350">{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Fine Overview */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-amber-400" />
                            Challan Summary
                          </h3>
                          {snapshot.fines.pending + snapshot.fines.overdue > 0 && (
                            <span className="text-[9px] font-black px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 animate-pulse">
                              {snapshot.fines.pending + snapshot.fines.overdue} PENDING
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Pending', value: snapshot.fines.pending, color: 'text-amber-400' },
                            { label: 'Overdue', value: snapshot.fines.overdue, color: 'text-rose-400' },
                            { label: 'Paid', value: snapshot.fines.paid, color: 'text-emerald-400' },
                            { label: 'Total', value: snapshot.fines.total, color: 'text-white' },
                          ].map(item => (
                            <div key={item.label} className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 flex flex-col">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{item.label}</span>
                              <strong className={`text-lg font-black mt-1 ${item.color}`}>{item.value}</strong>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1 bg-slate-900/50 border border-slate-800/60 rounded-xl p-3">
                            <p className="text-[8px] font-black text-slate-500 uppercase">Pending Amount</p>
                            <strong className="text-rose-400 font-black">₹{snapshot.fines.pendingAmount?.toLocaleString('en-IN')}</strong>
                          </div>
                          <div className="flex-1 bg-slate-900/50 border border-slate-800/60 rounded-xl p-3">
                            <p className="text-[8px] font-black text-slate-500 uppercase">Amount Paid</p>
                            <strong className="text-emerald-400 font-black">₹{snapshot.fines.paidAmount?.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vehicles + Routes + Notifications Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* Vehicles */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-5">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
                          <Car className="w-4 h-4 text-sky-400" />
                          Vehicle Registry
                        </h3>
                        {snapshot.vehicles.count === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">No data available yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {snapshot.vehicles.list.map(v => (
                              <div key={v.id} className="bg-slate-900/50 border border-slate-800/40 rounded-xl px-3 py-2 flex items-center gap-2">
                                <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-black text-white">{v.plateNumber}</p>
                                  <p className="text-[8px] text-slate-500">{v.make} {v.model}</p>
                                </div>
                              </div>
                            ))}
                            <p className="text-[9px] text-slate-500 text-center mt-2">
                              {snapshot.vehicles.count} vehicle{snapshot.vehicles.count !== 1 ? 's' : ''} registered
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Recent Routes */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-5">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
                          <Map className="w-4 h-4 text-emerald-400" />
                          Recent Routes
                          <span className="ml-auto text-[8px] font-black bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-slate-400">
                            {snapshot.routes.total} TOTAL
                          </span>
                        </h3>
                        {snapshot.routes.recent.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">No routes analyzed yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {snapshot.routes.recent.slice(0, 3).map(r => {
                              const sc = scoreColor(r.safetyScore);
                              return (
                                <div key={r.id} className="bg-slate-900/50 border border-slate-800/40 rounded-xl px-3 py-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-white truncate max-w-[130px]">
                                      {r.source} → {r.destination}
                                    </p>
                                    <span className={`text-[8px] font-black ${sc.text}`}>{r.safetyScore}/100</span>
                                  </div>
                                  <p className="text-[7px] text-slate-500 mt-0.5">
                                    {new Date(r.date).toLocaleDateString()}
                                  </p>
                                </div>
                              );
                            })}
                            {snapshot.routes.avgSafetyScore && (
                              <p className="text-[9px] text-slate-400 text-center mt-1">
                                Avg safety: <strong className={scoreColor(snapshot.routes.avgSafetyScore).text}>{snapshot.routes.avgSafetyScore}/100</strong>
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Notifications */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-5">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
                          <Bell className="w-4 h-4 text-rose-400" />
                          Notifications
                          {snapshot.notifications.unreadCount > 0 && (
                            <span className="ml-auto text-[8px] font-black bg-rose-500/20 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-lg animate-pulse">
                              {snapshot.notifications.unreadCount} UNREAD
                            </span>
                          )}
                        </h3>
                        <div className="space-y-2">
                          {snapshot.notifications.recent.slice(0, 4).map(n => (
                            <div key={n.id} className={`p-2.5 rounded-xl border ${n.isRead ? 'border-slate-800/40 bg-slate-900/30' : 'border-sky-500/20 bg-sky-500/5'}`}>
                              <p className="text-[9px] font-black text-white">{n.title}</p>
                              <p className="text-[8px] text-slate-400 mt-0.5 line-clamp-1">{n.message}</p>
                            </div>
                          ))}
                          {snapshot.notifications.recent.length === 0 && (
                            <p className="text-[10px] text-slate-500 italic">No notifications available.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                TAB 2 — ANALYTICS
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">

                {analytics ? (
                  <>
                    {/* Totals Summary Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                      {[
                        { label: 'Reports Generated', value: analytics.totals.reportsGenerated, icon: FileText, color: 'text-indigo-400' },
                        { label: 'Routes Analyzed',   value: analytics.totals.routesAnalyzed,   icon: Map,      color: 'text-emerald-400' },
                        { label: 'Total Challans',    value: analytics.totals.totalFines,         icon: AlertTriangle, color: 'text-amber-400' },
                        { label: 'Total Fine Amount', value: `₹${analytics.totals.totalFineAmount?.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-rose-400' },
                        { label: 'Amount Paid',       value: `₹${analytics.totals.paidAmount?.toLocaleString('en-IN')}`,  icon: CheckCircle, color: 'text-sky-400' },
                        { label: 'AI Assistant Chats', value: analytics.totals.totalAiChats ?? '—', icon: Zap, color: 'text-sky-300' },
                        { label: 'Learning Progress', value: analytics.totals.learningProgress ?? '—', icon: BookOpen, color: 'text-purple-400' },
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="bg-slate-950/50 border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-2">
                            <Icon className={`w-4 h-4 ${item.color}`} />
                            <strong className="text-lg font-black text-white">{item.value}</strong>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider leading-tight">{item.label}</p>
                          </div>
                        );
                      })}
                    </div>


                    {/* Score Trend Chart */}
                    <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-6">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        Score Trend Over Time
                      </h3>
                      <p className="text-[9px] text-slate-500 mb-5">Compliance, Awareness, Travel Readiness across monthly reports</p>
                      {analytics.scoreTrend.length >= 2 ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <LineChart data={analytics.scoreTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 9 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 9, color: '#94a3b8' }} />
                            <Line type="monotone" dataKey="complianceScore"  stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} name="Compliance"      />
                            <Line type="monotone" dataKey="awarenessScore"   stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Awareness"        />
                            <Line type="monotone" dataKey="travelReadiness"  stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} name="Travel Readiness" />
                            <Line type="monotone" dataKey="violationRisk"    stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} name="Violation Risk"   strokeDasharray="5 3" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                          <BarChart2 className="w-8 h-8 text-slate-700 mb-2" />
                          <p className="text-xs">Compile at least 2 monthly reports to see trends.</p>
                        </div>
                      )}
                    </div>

                    {/* Doc Health Pie + Violation Bar */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* Document Health Pie */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-6">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-indigo-400" />
                          Document Health
                        </h3>
                        <p className="text-[9px] text-slate-500 mb-4">Current vault status breakdown</p>
                        {analytics.docHealthChart.length > 0 ? (
                          <div className="flex items-center gap-6">
                            <ResponsiveContainer width={180} height={180}>
                              <PieChart>
                                <Pie data={analytics.docHealthChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={42} paddingAngle={3}>
                                  {analytics.docHealthChart.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill || PIE_COLORS[entry.name] || '#475569'} />
                                  ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                              {analytics.docHealthChart.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill || PIE_COLORS[d.name] }} />
                                  <span className="text-[9px] font-bold text-slate-300">{d.name}</span>
                                  <span className="text-[9px] text-slate-500 ml-auto">{d.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No documents uploaded yet.</p>
                        )}
                      </div>

                      {/* Violation Type Bar */}
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-6">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Violation Categories
                        </h3>
                        <p className="text-[9px] text-slate-500 mb-4">Total challans by violation type</p>
                        {analytics.violationBreakdown.length > 0 ? (
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={analytics.violationBreakdown} layout="vertical" margin={{ left: 0, right: 16 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 8 }} />
                              <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Challans" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No challans recorded yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Route Safety Trend */}
                    {analytics.routeSafetyTrend.length > 0 && (
                      <div className="bg-slate-950/50 border border-slate-800/60 rounded-3xl p-6">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Map className="w-4 h-4 text-emerald-400" />
                          Route Safety Intelligence
                        </h3>
                        <p className="text-[9px] text-slate-500 mb-4">Safety scores across analyzed routes over time</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analytics.routeSafetyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 8 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 9, color: '#94a3b8' }} />
                            <Bar dataKey="safetyScore" fill="#10b981" radius={[4, 4, 0, 0]} name="Safety Score" />
                            <Bar dataKey="riskScore"   fill="#f43f5e" radius={[4, 4, 0, 0]} name="Risk Score" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 text-slate-500">
                    <BarChart2 className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                    <p className="text-sm">Analytics data unavailable.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                TAB 3 — MONTHLY REPORTS
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'monthly' && (
              <motion.div key="monthly" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                  {/* Left — Archive List */}
                  <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-800/60 pb-2">
                      Report Archives ({reports.length})
                    </h3>
                    {reports.length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/30 border border-slate-900/60 rounded-3xl p-5">
                        <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                        <strong className="text-xs text-slate-400 block">No data available yet.</strong>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                        {reports.map(rep => {
                          const c = scoreColor(rep.complianceScore);
                          return (
                            <div
                              key={rep._id}
                              onClick={() => setSelectedReport(rep)}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                                selectedReport?._id === rep._id
                                  ? 'bg-gradient-to-r from-sky-500/10 to-indigo-500/5 border-sky-500/30'
                                  : 'bg-slate-950/40 border-slate-900/60 hover:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                                  <Calendar className="w-4 h-4 text-sky-400" />
                                </div>
                                <div>
                                  <strong className="text-xs font-black text-white block">{rep.month}</strong>
                                  <span className={`text-[9px] font-black block mt-0.5 ${c.text}`}>
                                    {rep.complianceScore}/100 · {scoreLabel(rep.complianceScore)}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Right — Detailed Report Viewer */}
                  <div className="lg:col-span-2">
                    {selectedReport ? (
                      <div id="print-area-report" className="bg-slate-950/50 border border-slate-800/60 p-6 rounded-3xl space-y-5 shadow-2xl">

                        {/* Report Header + PDF Button */}
                        <div className="flex justify-between items-start border-b border-slate-800/60 pb-4">
                          <div>
                            <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider block">DriveLegal AI Platform</span>
                            <h2 className="text-xl font-black text-white mt-1">Driver Report Card</h2>
                            <strong className="text-xs text-slate-400 font-semibold block mt-0.5">Period: {selectedReport.month}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <strong className="text-3xl font-black text-white">{selectedReport.complianceScore}</strong>
                              <span className="text-[8px] text-slate-500 font-bold block">/100 Score</span>
                            </div>
                            <button
                              onClick={() => handleDownloadPdf(selectedReport._id, selectedReport.month)}
                              disabled={downloadingId === selectedReport._id}
                              className="ml-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-indigo-500/20 hover:shadow-lg px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0"
                            >
                              {downloadingId === selectedReport._id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />
                              }
                              PDF
                            </button>
                          </div>
                        </div>

                        {/* Score Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Compliance', value: selectedReport.complianceScore, type: 'compliance', icon: Shield },
                            { label: 'Travel Readiness', value: selectedReport.travelReadinessScore, type: 'readiness', icon: Map },
                            { label: 'Violation Risk', value: selectedReport.violationRiskScore, type: 'risk', icon: AlertTriangle },
                            { label: 'Awareness', value: selectedReport.awarenessScore, type: 'awareness', icon: BookOpen },
                          ].map(s => {
                            let rule;
                            if (s.type === 'compliance') rule = getComplianceStatus(s.value);
                            else if (s.type === 'awareness') rule = getAwarenessLevel(s.value);
                            else if (s.type === 'readiness') rule = getTravelReadiness(s.value);
                            else if (s.type === 'risk') rule = getViolationRisk(s.value);

                            const Icon = s.icon;
                            return (
                              <div key={s.label} className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-1 ${rule.border} ${rule.bg}`}>
                                <Icon className={`w-3.5 h-3.5 ${rule.color}`} />
                                <strong className={`text-lg font-black ${rule.color}`}>{s.value}</strong>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-tight">{s.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Document Checklist */}
                        <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-2xl space-y-3">
                          <strong className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-800/40 pb-2">Document Vault Checklist</strong>
                          <div className="grid grid-cols-2 gap-2.5">
                            {['DL', 'RC', 'Insurance', 'PUC'].map(type => {
                              const status = selectedReport.documentStatus
                                ? (selectedReport.documentStatus.get ? selectedReport.documentStatus.get(type) : selectedReport.documentStatus[type]) || 'Missing'
                                : 'Missing';
                              return (
                                <div key={type} className={`flex justify-between items-center px-3 py-2 rounded-xl border text-xs font-semibold ${docStatusStyle(status)}`}>
                                  <span className="font-bold opacity-80">{type} Document</span>
                                  <span className="text-[8px] font-black uppercase">{status}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Historical score explanation reconstruction (Phase 5) */}
                          {(() => {
                            const contributors = [];
                            const docLabels = {
                              DL: 'Driving License (DL)',
                              RC: 'Registration Certificate (RC)',
                              Insurance: 'Car Insurance',
                              PUC: 'PUC Certificate'
                            };
                            ['DL', 'RC', 'Insurance', 'PUC'].forEach(type => {
                              const status = selectedReport.documentStatus
                                ? (selectedReport.documentStatus.get ? selectedReport.documentStatus.get(type) : selectedReport.documentStatus[type]) || 'Missing'
                                : 'Missing';
                              if (status === 'Missing') {
                                contributors.push(`${docLabels[type]} was missing`);
                              } else if (status === 'Expired') {
                                contributors.push(`${docLabels[type]} was expired`);
                              } else if (status === 'Expiring Soon') {
                                contributors.push(`${docLabels[type]} was expiring soon`);
                              } else if (status === 'Unusual Validity') {
                                contributors.push(`${docLabels[type]} had unusual validity`);
                              }
                            });
                            if (selectedReport.pendingFinesCount > 0) {
                              contributors.push(`${selectedReport.pendingFinesCount} pending challan(s) detected`);
                            }
                            if (contributors.length === 0) {
                              contributors.push("All documents valid & no pending challans");
                            }
                            return (
                              <div className="pt-2.5 border-t border-slate-800/40 space-y-1">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Compliance Deductions:</span>
                                {contributors.map((contrib, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-[9px] text-rose-400">
                                    <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                                    <span className="truncate text-slate-400">{contrib}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Counts Row — 4 stats including AI chat interactions */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-slate-900/30 border border-slate-800/60 p-3 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-[8px] font-black text-slate-500 uppercase">Pending Challans</span>
                            <strong className="text-white font-black text-sm">{selectedReport.pendingFinesCount}</strong>
                          </div>
                          <div className="bg-slate-900/30 border border-slate-800/60 p-3 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-[8px] font-black text-slate-500 uppercase">Routes Audited</span>
                            <strong className="text-white font-black text-sm">{selectedReport.routesAnalyzedCount}</strong>
                          </div>
                          <div className="bg-sky-500/5 border border-sky-500/20 p-3 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-[8px] font-black text-sky-500/70 uppercase">AI Chats</span>
                            <strong className="text-sky-400 font-black text-sm">{selectedReport.aiChatsCount ?? 0}</strong>
                          </div>
                          <div className="bg-purple-500/5 border border-purple-500/20 p-3 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-[8px] font-black text-purple-500/70 uppercase">Learning</span>
                            <strong className="text-purple-400 font-black text-sm">{selectedReport.learningProgressCount ?? 0}</strong>
                          </div>
                        </div>


                        {/* Recommendations */}
                        {selectedReport.recommendations?.length > 0 && (
                          <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-2xl space-y-2.5">
                            <strong className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-800/40 pb-2">
                              Compliance Recommendations
                            </strong>
                            {selectedReport.recommendations.map((rec, i) => (
                              <div key={i} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/30 flex items-start gap-2.5 text-[10px] text-slate-300 leading-relaxed font-semibold">
                                <span className="text-sky-400 shrink-0">❖</span>
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-center text-[8px] text-slate-700 font-black uppercase tracking-wider pt-3 border-t border-slate-800/40">
                          DriveLegal AI Compliance Authority • Digital Certificate
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-slate-950/30 border border-slate-900/60 rounded-3xl">
                        <FileText className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                        <strong className="text-xs text-slate-400">No data available yet.</strong>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                TAB 4 — TIMELINE
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'timeline' && (
              <motion.div key="timeline" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-slate-950/50 border border-slate-800/60 p-6 rounded-3xl shadow-2xl">
                <div className="border-b border-slate-800/60 pb-4 flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-400" />
                      Driver Compliance Timeline
                    </h3>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Chronological feed of documents, challans, payments, and alerts.</span>
                  </div>
                  <span className="text-[9px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-xl uppercase">
                    {timeline.length} Events
                  </span>
                </div>

                {timeline.length === 0 ? (
                  <div className="text-center py-16">
                    <Clock className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                    <strong className="text-xs text-slate-400">No data available yet.</strong>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l border-slate-800 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                    {timeline.map(evt => {
                      let dotColor = 'bg-sky-500 ring-sky-500/20';
                      if (evt.category === 'expiry')  dotColor = 'bg-rose-500 ring-rose-500/20';
                      if (evt.category === 'payment') dotColor = 'bg-emerald-500 ring-emerald-500/20';
                      if (evt.category === 'alert')   dotColor = 'bg-amber-500 ring-amber-500/20';
                      if (evt.category === 'route')   dotColor = 'bg-indigo-500 ring-indigo-500/20';
                      if (evt.category === 'fine')    dotColor = 'bg-orange-500 ring-orange-500/20';
                      return (
                        <div key={evt.id} className="relative group">
                          <div className={`absolute -left-[30px] top-2 w-2.5 h-2.5 rounded-full ring-4 ${dotColor}`} />
                          <div className="bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row justify-between gap-3 transition-all hover:bg-slate-900/70">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-xs font-bold text-white">{evt.title}</strong>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                  evt.category === 'expiry'  ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'     :
                                  evt.category === 'payment' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' :
                                  evt.category === 'route'   ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'  :
                                  evt.category === 'fine'    ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'  :
                                  'border-slate-700 text-slate-400'
                                }`}>{evt.category}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-1 font-semibold">{evt.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] text-slate-500 font-bold block">{new Date(evt.date).toLocaleDateString()}</span>
                              <span className="text-[8px] text-slate-600 font-semibold block mt-0.5">{new Date(evt.date).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                TAB 5 — RECOMMENDATIONS
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'recommendations' && (
              <motion.div key="recommendations" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">

                <div className="bg-slate-950/50 border border-slate-800/60 p-6 rounded-3xl shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[9px] font-black text-sky-400 uppercase tracking-wider">AI-Powered Intelligence</p>
                      <h2 className="text-lg font-black text-white mt-0.5">Personalised Action Centre</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Based on your live compliance data</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/10 border border-amber-500/20">
                      <Star className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>

                  {snapshot ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* Document Actions */}
                      {['DL', 'RC', 'Insurance', 'PUC'].map(type => {
                        const status = snapshot.documentStatus?.[type] || 'Missing';
                        if (status === 'Valid') return null;
                        const docInfo = {
                          DL:        { label: 'Driving License',          impact: '+30 Readiness', icon: FileText, color: 'rose' },
                          RC:        { label: 'Registration Certificate',  impact: '+20 Readiness', icon: Car,      color: 'amber' },
                          Insurance: { label: 'Insurance Policy',           impact: '+25 Readiness', icon: Shield,   color: 'orange' },
                          PUC:       { label: 'PUC Certificate',            impact: '+15 Readiness', icon: Activity, color: 'yellow' },
                        };
                        const info = docInfo[type];
                        const Icon = info.icon;
                        return (
                          <motion.div
                            key={type}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-950/50 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3"
                          >
                            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                              <Icon className="w-4 h-4 text-rose-400" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-white">{type} {status}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                                {status === 'Missing' ? `Upload your ${info.label} to the Document Vault` : `Renew your ${info.label} before it expires`} and unlock <strong className="text-sky-400">{info.impact}</strong>.
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Fine Actions */}
                      {snapshot.fines.pending + snapshot.fines.overdue > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-slate-950/50 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Settle {snapshot.fines.pending + snapshot.fines.overdue} Pending Challans</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                              ₹{snapshot.fines.pendingAmount?.toLocaleString('en-IN')} outstanding. Clearing fines improves your Compliance Score by <strong className="text-sky-400">+15 per fine</strong>.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* State Explorer Actions */}
                      {snapshot.scores.awarenessScore < 60 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-slate-950/50 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            <BookOpen className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Boost Awareness Score</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                              Visit the State Explorer, complete educational modules, and interact with the AI Compliance Advisor to raise your awareness score. Current: <strong className="text-amber-400">{snapshot.scores.awarenessScore}/100</strong>.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Route Actions */}
                      {snapshot.routes.total === 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-slate-950/50 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                            <Map className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Run Your First Route Safety Analysis</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                              Use the Route Intelligence Engine from the Dashboard to get an AI risk briefing for your commute.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Perfect compliance */}
                      {snapshot.scores.complianceScore === 100 && snapshot.fines.pending === 0 && snapshot.fines.overdue === 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="md:col-span-2 bg-gradient-to-r from-emerald-500/10 to-sky-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 shrink-0">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">🏆 Perfect Compliance Status!</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                              Outstanding driving profile! You're maintaining perfect compliance with no pending challans. Keep up the clean driving habits.
                            </p>
                          </div>
                        </motion.div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500">
                      <Loader2 className="w-8 h-8 text-slate-700 animate-spin mx-auto mb-2" />
                      <p className="text-xs">Loading recommendations...</p>
                    </div>
                  )}
                </div>

                {/* Most Recent Report Recommendations */}
                {selectedReport?.recommendations?.length > 0 && (
                  <div className="bg-slate-950/50 border border-slate-800/60 p-6 rounded-3xl shadow-xl">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Last Compiled Report Guidance — {selectedReport.month}
                    </h3>
                    <div className="space-y-3">
                      {selectedReport.recommendations.map((rec, i) => (
                        <div key={i} className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/40 flex items-start gap-3 text-[10px] text-slate-300 leading-relaxed font-semibold">
                          <span className="text-sky-400 shrink-0 font-black">{i + 1}.</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ReportArchive;
