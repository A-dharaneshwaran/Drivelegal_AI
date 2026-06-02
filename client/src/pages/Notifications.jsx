  import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  Filter,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  FileText,
  Clock,
  Compass,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  Inbox,
  ArrowUpDown
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';


const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'action'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'priority' | 'unread'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNotifications = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      let isReadFilter = undefined;
      let typeFilter = undefined;

      if (filterType === 'unread') {
        isReadFilter = 'false';
      } else if (filterType === 'action') {
        typeFilter = 'fine_overdue'; // Custom action alerts filter
      }

      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: headers.headers,
        params: {
          search,
          isRead: isReadFilter,
          type: typeFilter,
          sortBy,
          page,
          limit
        }
      });

      if (res.data?.success) {
        setNotifications(res.data.notifications);
        setTotalPages(res.data.pagination.totalPages || 1);
      }

      // Sync unread count too
      const countRes = await axios.get(`${API_URL}/api/notifications/unread-count`, headers);
      if (countRes.data?.success) {
        setUnreadCount(countRes.data.count);
      }

    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      triggerToast("Error fetching notifications list", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [search, filterType, sortBy, page]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await axios.put(`${API_URL}/api/notifications/read/${id}`, {}, headers);
      if (res.data?.success) {
        triggerToast("Alert marked as read");
        fetchNotifications();
        window.dispatchEvent(new CustomEvent('notification-updated'));
      }
    } catch (error) {
      console.error("Mark read failure:", error);
      triggerToast("Failed to mark alert as read", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await axios.put(`${API_URL}/api/notifications/read-all`, {}, headers);
      if (res.data?.success) {
        triggerToast("All alerts marked as read");
        fetchNotifications();
        window.dispatchEvent(new CustomEvent('notification-updated'));
      }
    } catch (error) {
      console.error("Bulk mark read failure:", error);
      triggerToast("Failed to settle unread notifications", "error");
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      const res = await axios.delete(`${API_URL}/api/notifications/${id}`, headers);
      if (res.data?.success) {
        triggerToast("Notification successfully deleted");
        fetchNotifications();
        window.dispatchEvent(new CustomEvent('notification-updated'));
      }
    } catch (error) {
      console.error("Delete notification failure:", error);
      triggerToast("Failed to delete notification record", "error");
    }
  };

  // Helper styles for priority levels
  const getPriorityStyle = (priority) => {
    if (priority === 'critical') return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
    if (priority === 'high') return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
    if (priority === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    return 'border-sky-500/30 bg-sky-500/10 text-sky-400';
  };

  const getAlertIcon = (type, priority) => {
    if (type === 'fine_overdue' || priority === 'critical') {
      return <AlertCircle className="w-5 h-5 text-rose-400 animate-pulse" />;
    }
    if (type === 'payment_confirmed') {
      return <CheckCheck className="w-5 h-5 text-emerald-400" />;
    }
    if (type === 'fine_due') {
      return <Clock className="w-5 h-5 text-amber-400" />;
    }
    return <Bell className="w-5 h-5 text-sky-400" />;
  };

  return (
    <div className="pt-24 min-h-screen bg-[#070b14] text-slate-100 font-sans px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* Toast popup alerts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 right-6 z-50 px-5 py-3 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}
          >
            <Check className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Upper Title Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/30 text-sky-400 relative">
              <Bell className="w-7 h-7" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs font-black border border-[#070b14] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Notification Center</h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Manage and track your DriveLegal fine compliance due times and receipts history.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400 text-xs font-bold transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                Settle Unread Alerts
              </button>
            )}
          </div>
        </div>

        {/* Filters and Controls Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-950/40 border border-slate-800 p-4 rounded-3xl backdrop-blur-md">
          {/* Tabs switch */}
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-850 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Alerts', icon: Inbox },
              { id: 'unread', label: 'Unread', icon: Bell },
              { id: 'action', label: 'Action Required', icon: AlertTriangle }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setFilterType(tab.id); setPage(1); }}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    filterType === tab.id
                      ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 border border-sky-500/30 text-sky-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar and sort */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search alert violations..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-slate-900/40 border border-slate-800 focus:border-sky-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="bg-slate-900/40 border border-slate-800 focus:border-sky-500/50 rounded-xl pl-9 pr-6 py-2 text-xs text-slate-300 focus:outline-none appearance-none"
              >
                <option value="newest">Sort: Newest</option>
                <option value="priority">Sort: Priority</option>
                <option value="unread">Sort: Unread</option>
              </select>
            </div>
          </div>
        </div>

        {/* NOTIFICATION LOGS CARDS GRID */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-950/20 rounded-3xl border border-slate-900">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <Inbox className="w-8 h-8 text-sky-500" />
            </motion.div>
            <p className="text-xs text-slate-500 font-bold mt-3">Fetching alert logs...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-slate-950/20 rounded-3xl border border-slate-900/80 px-6">
            <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-400">No notifications available.</h3>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((notif) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  key={notif._id}
                  className={`glass border p-5 rounded-3xl flex items-start justify-between shadow-lg relative overflow-hidden transition-all group hover:border-slate-700/80 ${
                    notif.isRead 
                      ? 'border-slate-800/80 bg-slate-950/30 opacity-75' 
                      : 'border-slate-700 bg-slate-950/60 shadow-[0_4px_20px_rgba(56,189,248,0.03)]'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Glowing status bubble */}
                    <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${getPriorityStyle(notif.priority)}`}>
                      {getAlertIcon(notif.type, notif.priority)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className={`text-sm font-black ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                          {notif.title}
                        </h4>
                        
                        {/* Unread indicators */}
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shrink-0" />
                        )}
                        
                        {/* Priority pill */}
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getPriorityStyle(notif.priority)}`}>
                          {notif.priority}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                        {notif.message}
                      </p>

                      <span className="text-[10px] text-slate-600 font-bold block pt-1.5">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons panel */}
                  <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif._id)}
                        title="Mark as read"
                        className="p-2 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-sky-400 rounded-xl transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notif._id)}
                      title="Delete"
                      className="p-2 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-slate-950/40 border border-slate-800 px-5 py-3 rounded-2xl">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-40 rounded-lg text-xs font-bold transition-all"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-40 rounded-lg text-xs font-bold transition-all"
                >
                  Next
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default Notifications;
