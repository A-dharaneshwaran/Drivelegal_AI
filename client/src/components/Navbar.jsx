import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Map, User, FileText, Navigation, Bell, Shield,
  Calendar, Lock, AlertTriangle, Check, ChevronDown, Menu, X,
  BarChart2, BookOpen, Settings, Home, Zap
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const PRESET_AVATARS = [
  { id: 'shield', value: '🛡️' },
  { id: 'grad', value: '🧠' },
  { id: 'map', value: '🧭' },
  { id: 'alert', value: '⚠️' },
  { id: 'user', value: '🚗' }
];

// Primary nav links — always visible on desktop
const PRIMARY_NAV = [
  { to: '/', label: 'Home', icon: null },
  { to: '/route-planner', label: 'Route Planner', icon: null, accent: true },
  { to: '/dashboard', label: 'Dashboard', icon: null },
  { to: '/vault', label: 'Vault', icon: null },
  { to: '/reports', label: 'Reports', icon: null },
];

// Secondary nav — tucked into "More" dropdown
const MORE_NAV = [
  { to: '/learning-center', label: 'State Explorer', icon: Navigation, color: 'text-sky-400' },
  { to: '/fines', label: 'Fines & Challans', icon: FileText, color: 'text-amber-400' },
  { to: '/notifications', label: 'Notifications', icon: Bell, color: 'text-indigo-400' },
  { to: '/profile?tab=settings', label: 'Settings', icon: Settings, color: 'text-slate-400' },
];

// All links for mobile menu
const ALL_MOBILE_NAV = [
  { to: '/', label: 'Home' },
  { to: '/route-planner', label: 'Route Planner' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/vault', label: 'Vault' },
  { to: '/reports', label: 'Reports' },
  { to: '/learning-center', label: 'State Explorer' },
  { to: '/fines', label: 'Fines' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/profile', label: 'Profile' },
];

const Navbar = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const moreRef = useRef(null);

  // Auth state sync
  useEffect(() => {
    const handleAuthChange = () => setToken(localStorage.getItem('token'));
    window.addEventListener('auth-state-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setBellOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) setUnreadCount(res.data.count);
    } catch {}
  };

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) setUser(res.data.user);
    } catch {}
  };

  const fetchRecentNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 5 }
      });
      if (res.data?.success) setNotifications(res.data.notifications);
    } catch {}
  };

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`${API_URL}/api/notifications/read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('notification-updated'));
      }
    } catch {}
  };

  const markAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        window.dispatchEvent(new CustomEvent('notification-updated'));
      }
    } catch {}
  };

  // Polling & events
  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    fetchProfile();
    if (bellOpen) fetchRecentNotifications();

    const interval = setInterval(() => {
      fetchUnreadCount();
      if (bellOpen) fetchRecentNotifications();
    }, 10000);

    const handleProfileUpdate = () => fetchProfile();
    const handleNotifUpdate = () => {
      fetchUnreadCount();
      if (bellOpen) fetchRecentNotifications();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    window.addEventListener('notification-updated', handleNotifUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('notification-updated', handleNotifUpdate);
    };
  }, [token, bellOpen]);

  // Click-outside handler for all dropdowns
  useEffect(() => {
    if (!profileOpen && !bellOpen && !moreOpen) return;
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, bellOpen, moreOpen]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Get first name only, max 10 chars
  const displayName = (() => {
    if (!user?.name) return 'Driver';
    const first = user.name.trim().split(' ')[0];
    return first.length > 10 ? first.slice(0, 10) + '…' : first;
  })();

  // Avatar initials fallback
  const userAvatarEmoji = PRESET_AVATARS.find(a => a.id === user?.avatar)?.value || null;
  const initials = user?.name
    ? user.name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'DL';

  const notifIconMap = { fine: AlertTriangle, challan: AlertTriangle, expiry: FileText, document: FileText, compliance: Shield, system: Calendar };
  const notifColorMap = {
    fine: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    challan: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    expiry: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    document: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    compliance: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    system: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#050811]/90 border-b border-slate-800/60 backdrop-blur-xl"
        style={{ height: '64px' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">

          {/* ── LOGO ── */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 group"
            style={{ maxWidth: '200px' }}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-shadow">
              <Map className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-bold text-white whitespace-nowrap leading-none">
              DriveLegal <span className="text-sky-400">AI</span>
            </span>
          </Link>

          {/* ── PRIMARY NAV (desktop) ── */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center" aria-label="Primary navigation">
            {PRIMARY_NAV.map(({ to, label, accent }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`
                    relative px-3 py-1.5 text-[14px] font-medium whitespace-nowrap transition-colors duration-150 rounded-lg
                    ${active
                      ? 'text-white'
                      : accent
                        ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }
                  `}
                >
                  {label}
                  {/* Active indicator — thin bottom line */}
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* More dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(v => !v)}
                className={`
                  flex items-center gap-1 px-3 py-1.5 text-[14px] font-medium whitespace-nowrap rounded-lg transition-colors duration-150
                  ${moreOpen ? 'text-white bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}
                `}
                aria-expanded={moreOpen}
                aria-haspopup="true"
              >
                More
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.14 }}
                    className="absolute top-full left-0 mt-2 w-52 bg-[#090f1d] border border-slate-800/80 rounded-2xl shadow-2xl py-2 z-50"
                  >
                    {MORE_NAV.map(({ to, label, icon: Icon, color }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors whitespace-nowrap"
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                        {label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* ── RIGHT ZONE: Bell + User ── */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Notification Bell */}
            {token && (
              <div className="relative" ref={bellRef}>
                <button
                  id="navbar-notification-bell"
                  onClick={() => {
                    setBellOpen(v => !v);
                    setProfileOpen(false);
                    setMoreOpen(false);
                    if (!bellOpen) fetchRecentNotifications();
                  }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all focus:outline-none"
                  aria-label="Notifications"
                >
                  <motion.div
                    animate={unreadCount > 0 ? {
                      rotate: [0, -14, 14, -8, 8, -4, 4, 0],
                      transition: { repeat: Infinity, duration: 2.5, repeatDelay: 3 }
                    } : {}}
                  >
                    <Bell className="w-[17px] h-[17px]" />
                  </motion.div>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 border border-[#050811]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Bell Dropdown */}
                <AnimatePresence>
                  {bellOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.14 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-2 w-80 bg-[#090f1d] border border-slate-800/80 rounded-2xl shadow-2xl p-3 z-50"
                    >
                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
                        <span className="text-[11px] font-black uppercase text-sky-400 tracking-wider">Alerts & Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-slate-400 hover:text-sky-400 transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                        {notifications.length > 0 ? notifications.map((notif) => {
                          const Icon = notifIconMap[notif.type] || Bell;
                          const colorClass = notifColorMap[notif.type] || 'text-slate-400 bg-slate-800/50 border-slate-700/30';
                          return (
                            <div
                              key={notif._id}
                              className={`p-2.5 rounded-xl border flex gap-2.5 relative ${notif.isRead ? 'bg-slate-900/30 border-slate-800/40' : 'bg-slate-900/70 border-slate-700/50'}`}
                            >
                              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${colorClass}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0 pr-5">
                                <p className={`text-[12px] font-bold truncate ${notif.isRead ? 'text-slate-400' : 'text-slate-100'}`}>{notif.title}</p>
                                <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mt-0.5">{notif.message}</p>
                                <p className="text-[9px] text-slate-600 font-medium mt-1">{new Date(notif.createdAt).toLocaleDateString('en-IN')}</p>
                              </div>
                              {!notif.isRead && (
                                <button
                                  onClick={(e) => markAsRead(notif._id, e)}
                                  title="Mark as read"
                                  className="absolute top-2.5 right-2 text-slate-600 hover:text-sky-400 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        }) : (
                          <div className="text-center py-8 text-slate-600 text-xs">No notifications yet.</div>
                        )}
                      </div>

                      <div className="border-t border-slate-800 pt-2 mt-2 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setBellOpen(false)}
                          className="text-[11px] font-black uppercase text-sky-400 tracking-wider hover:text-sky-300 transition-colors"
                        >
                          View all notifications →
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Profile / Auth */}
            {token ? (
              <div className="relative" ref={profileRef}>
                <button
                  id="navbar-profile-button"
                  onClick={() => {
                    setProfileOpen(v => !v);
                    setBellOpen(false);
                    setMoreOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800/50 transition-all focus:outline-none group"
                  aria-label="User menu"
                  aria-expanded={profileOpen}
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 p-[1.5px] shrink-0">
                    <div className="w-full h-full bg-[#090f1d] rounded-[5px] flex items-center justify-center text-[13px] font-bold">
                      {userAvatarEmoji || (
                        <span className="text-[10px] font-black text-sky-300">{initials}</span>
                      )}
                    </div>
                  </div>
                  {/* First name — hidden on mobile */}
                  <span className="hidden sm:inline text-[13px] font-semibold text-slate-300 group-hover:text-white whitespace-nowrap transition-colors">
                    {displayName}
                  </span>
                  <ChevronDown className={`hidden sm:block w-3 h-3 text-slate-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-[#090f1d] border border-slate-800/80 rounded-2xl shadow-2xl py-2 z-50"
                    >
                      {/* User info header */}
                      <div className="px-4 py-2.5 border-b border-slate-800 mb-1">
                        <p className="text-[13px] font-bold text-white truncate">{user?.name || 'Driver'}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email || ''}</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                      >
                        <User className="w-4 h-4 text-sky-400 shrink-0" />
                        Profile Overview
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                      >
                        <BarChart2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        Dashboard
                      </Link>
                      <Link
                        to="/profile?tab=settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                        Settings
                      </Link>

                      <div className="mx-3 my-1.5 border-t border-slate-800" />

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          localStorage.removeItem('token');
                          window.dispatchEvent(new Event('auth-state-changed'));
                          window.location.href = '/';
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors text-left"
                      >
                        <Lock className="w-4 h-4 shrink-0" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden sm:inline text-[13px] font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/40 whitespace-nowrap"
                >
                  Log in
                </Link>
                <Link to="/signup">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 rounded-lg text-[13px] font-semibold text-white shadow-lg hover:shadow-indigo-500/30 transition-shadow whitespace-nowrap"
                  >
                    Get Started
                  </motion.button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              id="navbar-mobile-menu-toggle"
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all focus:outline-none ml-1"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── MOBILE MENU DRAWER ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="mobile-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#07090f] border-l border-slate-800 lg:hidden flex flex-col overflow-y-auto"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800 shrink-0">
                <span className="text-[14px] font-bold text-white">Navigation</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User info block (if logged in) */}
              {token && user && (
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 p-[1.5px] shrink-0">
                    <div className="w-full h-full bg-[#090f1d] rounded-[9px] flex items-center justify-center text-base">
                      {userAvatarEmoji || <span className="text-[11px] font-black text-sky-300">{initials}</span>}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Nav links */}
              <div className="flex-1 py-3 space-y-0.5 px-3">
                {ALL_MOBILE_NAV.map(({ to, label }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center px-4 py-3 rounded-xl text-[14px] font-medium whitespace-nowrap transition-colors
                        ${active
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }
                      `}
                    >
                      {label}
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile footer actions */}
              <div className="border-t border-slate-800 px-3 py-3 space-y-1 shrink-0">
                {token ? (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      localStorage.removeItem('token');
                      window.dispatchEvent(new Event('auth-state-changed'));
                      window.location.href = '/';
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-medium text-rose-400 hover:bg-rose-950/20 transition-colors text-left"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    Sign out
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 px-1">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="text-center py-2.5 rounded-xl text-[13px] font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="text-center py-2.5 rounded-xl text-[13px] font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
