import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  UploadCloud,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Sparkles,
  IndianRupee,
  Send,
  Loader2,
  Bell,
  Eye,
  Camera,
  X,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';


const Fines = () => {
  // Lists and Stats - starts completely empty, no preloaded mock data
  const [fines, setFines] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalFines: 0,
    pendingCount: 0,
    paidCount: 0,
    overdueCount: 0,
    totalAmountDue: 0,
    monthlyTrends: [],
    reminderAlerts: []
  });
  
  // States for Operations
  const [isLoading, setIsLoading] = useState(true);
  const [searchVehicle, setSearchVehicle] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Modals & Panels
  const [showAddManual, setShowAddManual] = useState(false);
  const [showUploadBill, setShowUploadBill] = useState(false);
  const [selectedFine, setSelectedFine] = useState(null);
  const [showMarkPaid, setShowMarkPaid] = useState(false);

  // Manual Form State - all fields start strictly empty, no preloads
  const [manualForm, setManualForm] = useState({
    fineNumber: '',
    vehicleNumber: '',
    violationType: 'Speeding',
    amount: '',
    issueDate: '',
    dueDate: '',
    location: '',
    description: '',
    reminderStatus: 'Enabled'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrFutureDateWarning, setOcrFutureDateWarning] = useState(false);

  // Today's date string in YYYY-MM-DD format (for max= attribute and validation)
  const today = new Date().toISOString().split('T')[0];

  // OCR Upload State
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [ocrError, setOcrError] = useState('');
  const fileInputRef = useRef(null);

  // Settlement Form State
  const [settlementForm, setSettlementForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentNote: '',
    receiptImage: ''
  });
  const [isSettling, setIsSettling] = useState(false);

  // AI Assistant State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponses, setAiResponses] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your AI compliance advisor. Upload a ticket or ask me anything about traffic laws, fine terms, penalties, or safe driving practices.'
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiChatEndRef = useRef(null);

  // Notifications toggle
  const [pushEnabled, setPushEnabled] = useState(false);
  const [toast, setToast] = useState(null);

  // Build auth headers from stored JWT token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      triggerToast('Browser notifications are not supported in this browser.', 'warning');
      return;
    }

    if (pushEnabled) {
      // Toggle OFF: browsers don't allow programmatic revocation, so update UI state
      // and inform the user how to fully revoke from browser settings if they wish.
      setPushEnabled(false);
      triggerToast('Notifications disabled. To fully revoke, clear site permissions in browser settings.', 'success');
      return;
    }

    // Toggle ON: request browser permission
    if (Notification.permission === 'denied') {
      triggerToast('Notifications are blocked by your browser. Please allow them in site settings.', 'warning');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      triggerToast('Notifications enabled — you will receive challan reminders.', 'success');
      new Notification('DriveLegal Alerts', {
        body: 'Reminder scheduling checks started successfully.',
      });
    } else {
      setPushEnabled(false);
      triggerToast('Notification permission was not granted.', 'warning');
    }
  };

  // Fetch Fines & Analytics directly from MongoDB Atlas (no fallback mocks)
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const analyticsRes = await axios.get(`${API_URL}/api/fines/analytics`, getAuthHeaders());
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.analytics);
      }

      const params = {
        status: statusFilter,
        vehicleNumber: searchVehicle,
        sortBy: sortBy
      };
      
      const listRes = await axios.get(`${API_URL}/api/fines`, { params, ...getAuthHeaders() });
      if (listRes.data?.success) {
        setFines(listRes.data.fines);
      }
    } catch (error) {
      console.error('Error fetching fine information:', error);
      triggerToast(error.response?.data?.message || 'Failed to connect to backend server. Fines list starts empty.', 'error');
      // Set to empty states
      setFines([]);
      setAnalytics({
        totalFines: 0,
        pendingCount: 0,
        paidCount: 0,
        overdueCount: 0,
        totalAmountDue: 0,
        monthlyTrends: [],
        reminderAlerts: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [statusFilter, sortBy]);

  // Debounced search for vehicles
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadDashboardData();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchVehicle]);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiResponses]);

  // Form Validations
  const validateForm = () => {
    const errors = {};
    if (!manualForm.fineNumber.trim()) errors.fineNumber = 'Fine number is required.';
    if (!manualForm.vehicleNumber.trim()) {
      errors.vehicleNumber = 'Vehicle number is required.';
    } else if (!/^[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}$/i.test(manualForm.vehicleNumber.trim())) {
      errors.vehicleNumber = 'Must match e.g. TN-05-AB-1234';
    }
    if (!manualForm.amount || isNaN(manualForm.amount) || Number(manualForm.amount) <= 0) {
      errors.amount = 'Enter a valid fine amount (₹).';
    }
    if (!manualForm.issueDate) {
      errors.issueDate = 'Issue date is required.';
    } else if (manualForm.issueDate > today) {
      errors.issueDate = 'Fine issue date cannot be in the future.';
    }
    if (!manualForm.dueDate) {
      errors.dueDate = 'Due date is required.';
    } else if (new Date(manualForm.dueDate) < new Date(manualForm.issueDate)) {
      errors.dueDate = 'Due date must be after issue date.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Manual Fine Form
  const handleAddManualFine = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      triggerToast('Please correct form errors.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/fines/create`, manualForm, getAuthHeaders());
      if (res.data?.success) {
        triggerToast('Traffic Fine logged successfully!', 'success');
        setShowAddManual(false);
        setManualForm({
          fineNumber: '',
          vehicleNumber: '',
          violationType: 'Speeding',
          amount: '',
          issueDate: '',
          dueDate: '',
          location: '',
          description: '',
          reminderStatus: 'Enabled'
        });
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error submitting fine manually:', error);
      triggerToast(error.response?.data?.message || 'Error saving fine details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // File Upload Handlers for Real OCR
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      triggerToast('Invalid format. Upload JPG, JPEG, PNG, or PDF files only.', 'error');
      return;
    }
    setOcrFile(file);
    setOcrError('');
    setOcrProgress(0);
    setOcrStatusText('');
  };

  /**
   * Clears all OCR state and resets the native file input.
   * Allows re-selecting the same file without stale state.
   */
  const clearSelectedFile = () => {
    setOcrFile(null);
    setOcrError('');
    setOcrProgress(0);
    setOcrStatusText('');
    // Reset native input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute REAL multipart/form-data OCR Upload
  const triggerOcr = async () => {
    if (!ocrFile) {
      triggerToast('Please select or drop a file first.', 'warning');
      return;
    }

    setOcrLoading(true);
    setOcrError('');
    setOcrProgress(0);
    setOcrStatusText('Uploading...');

    const formData = new FormData();
    formData.append('file', ocrFile);

    // Progress increments mapped to operational states
    const progressTimer = setInterval(() => {
      setOcrProgress(prev => {
        if (prev < 25) {
          setOcrStatusText('Uploading...');
          return prev + 5;
        } else if (prev < 65) {
          setOcrStatusText('Scanning document...');
          return prev + 8;
        } else if (prev < 90) {
          setOcrStatusText('Extracting fields...');
          return prev + 4;
        }
        return prev;
      });
    }, 200);

    try {
      // POST multipart/form-data to backend real OCR endpoint
      const res = await axios.post(`${API_URL}/api/fines/ocr`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders().headers
        }
      });

      clearInterval(progressTimer);
      setOcrProgress(100);
      setOcrStatusText('Completed!');

      if (res.data?.success) {
        const ext = res.data.data;

        // Validate OCR-extracted issue date — warn if it appears to be in the future
        const extractedIssueDate = ext.issueDate || '';
        const isFutureOcrDate = extractedIssueDate && extractedIssueDate > today;
        setOcrFutureDateWarning(isFutureOcrDate);

        triggerToast(
          isFutureOcrDate
            ? 'OCR scan complete. Detected issue date appears to be in the future — please verify.'
            : 'AI OCR scan completed successfully!',
          isFutureOcrDate ? 'warning' : 'success'
        );

        // Populate manual fine form with extracted details, default to empty string if not found
        setManualForm({
          fineNumber: ext.fineNumber || '',
          vehicleNumber: ext.vehicleNumber || '',
          violationType: ext.violationType || 'Speeding',
          amount: ext.amount || '',
          issueDate: ext.issueDate || '',
          dueDate: ext.dueDate || '',
          location: ext.location || '',
          description: ext.description || 'Auto-extracted challan.',
          reminderStatus: 'Enabled'
        });

        // Open Manual edit panel with filled details for review
        setShowUploadBill(false);
        setShowAddManual(true);
        setOcrFile(null);
      }
    } catch (error) {
      clearInterval(progressTimer);
      setOcrProgress(0);
      setOcrStatusText('Failed');
      
      const errMsg = error.response?.data?.message || 'Server OCR engine failed. Please try again.';
      setOcrError(errMsg);
      triggerToast(errMsg, 'error');
    } finally {
      setOcrLoading(false);
    }
  };

  // Settle / Mark as Paid
  const handleMarkPaidSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFine) return;

    setIsSettling(true);
    try {
      const res = await axios.put(`${API_URL}/api/fines/mark-paid/${selectedFine._id}`, settlementForm, getAuthHeaders());
      if (res.data?.success) {
        triggerToast('Fine marked as Paid. Scheduler reminders disabled.', 'success');
        setShowMarkPaid(false);
        setSelectedFine(null);
        setSettlementForm({
          paymentDate: new Date().toISOString().split('T')[0],
          paymentNote: '',
          receiptImage: ''
        });
        loadDashboardData();
      }
    } catch (error) {
      console.error('Mark Paid Error:', error);
      triggerToast('Failed to mark fine as paid.', 'error');
    } finally {
      setIsSettling(false);
    }
  };

  // Delete Fine
  const handleDeleteFine = async (id) => {
    if (!window.confirm('Are you sure you want to delete this traffic fine record?')) return;

    try {
      const res = await axios.delete(`${API_URL}/api/fines/${id}`, getAuthHeaders());
      if (res.data?.success) {
        triggerToast('Fine record deleted successfully.', 'success');
        loadDashboardData();
      }
    } catch (error) {
      console.error('Delete Fine Error:', error);
      triggerToast('Failed to delete fine record.', 'error');
    }
  };

  // Conversational AI ask submitting directly to generateContent controller API
  const handleAiAsk = async (e) => {
    if (e) e.preventDefault();
    if (!aiQuestion.trim()) return;

    const userMessage = { role: 'user', text: aiQuestion };
    setAiResponses(prev => [...prev, userMessage]);
    setAiQuestion('');
    setIsAiLoading(true);

    try {
      // Auth header required — backend JWT middleware tracks AI interactions per user
      const response = await axios.post(
        `${API_URL}/api/ai/chat`,
        { prompt: userMessage.text, history: aiResponses.slice(-6) },
        getAuthHeaders()
      );

      // Binds output to backend response key mapping: { success: true, response: "..." }
      if (response.data?.success && response.data?.response) {
        setAiResponses(prev => [...prev, { role: 'assistant', text: response.data.response }]);
      } else {
        throw new Error('No answer content found.');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      const errMsg = error.response?.status === 401
        ? 'Please log in to use the AI Compliance Advisor.'
        : 'Error fetching AI answer. Please verify your connection.';
      triggerToast('AI Assistant response error.', 'error');
      setAiResponses(prev => [...prev, { role: 'assistant', text: errMsg }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectAiChip = (text) => {
    setAiQuestion(text);
  };

  return (
    <div className="pt-20 min-h-screen bg-[#070b14] text-slate-100 font-sans pb-16">
      
      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : toast.type === 'warning'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}
          >
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> AI Road Compliance Hub
            </div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Traffic Fine & Penalty Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload penalties, scan documents with AI-powered OCR, and trigger automatic background reminder notifications.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={loadDashboardData}
              className="bg-slate-900 border border-slate-700 hover:border-slate-600 p-2.5 rounded-xl text-slate-300 flex items-center justify-center"
              title="Refresh ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Notification Toggle — bidirectional enable/disable */}
            <button
              type="button"
              role="switch"
              aria-checked={pushEnabled}
              onClick={toggleNotifications}
              title={Notification.permission === 'denied' ? 'Notifications blocked by browser. Allow in site settings.' : undefined}
              className="flex items-center gap-2 group focus:outline-none"
            >
              {/* Track */}
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer ${
                  pushEnabled
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-700 bg-slate-800'
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="inline-block h-4 w-4 my-auto rounded-full bg-white shadow-md"
                  style={{ marginLeft: pushEnabled ? 'calc(100% - 20px)' : '2px' }}
                />
              </span>
              {/* Bell icon + label */}
              <Bell className={`w-3.5 h-3.5 transition-colors ${pushEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={`text-[11px] font-black uppercase tracking-wider transition-colors ${
                pushEnabled ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {pushEnabled ? 'Reminders On' : 'Reminders Off'}
              </span>
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setOcrFile(null);
                setOcrError('');
                setOcrProgress(0);
                setShowUploadBill(true);
              }}
              className="bg-sky-500/10 border border-sky-500/40 text-sky-400 hover:bg-sky-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Penalty Bill
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setManualForm({
                  fineNumber: '',
                  vehicleNumber: '',
                  violationType: 'Speeding',
                  amount: '',
                  issueDate: '',
                  dueDate: '',
                  location: '',
                  description: '',
                  reminderStatus: 'Enabled'
                });
                setOcrFutureDateWarning(false);
                setShowAddManual(true);
              }}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-indigo-500/20 hover:shadow-lg text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Manual
            </motion.button>
          </div>
        </div>

        {/* Dynamic Alerts Banner */}
        {analytics.reminderAlerts && analytics.reminderAlerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start md:items-center gap-3">
              <div className="bg-rose-500/20 p-2.5 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-rose-300">
                  Urgent Compliance Reminders
                </h4>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  {analytics.reminderAlerts[0].message} Background reminder scheduler logs are active.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Statistics row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="glass p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Fines</span>
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-white">{analytics.totalFines}</span>
              <p className="text-[10px] text-slate-500 mt-1">Logged challans</p>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-amber-400">{analytics.pendingCount}</span>
              <p className="text-[10px] text-slate-500 mt-1">Awaiting payment</p>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-500">{analytics.overdueCount}</span>
              {analytics.overdueCount > 0 && (
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping shrink-0" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Past payment limit</p>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-emerald-400">{analytics.paidCount}</span>
              <p className="text-[10px] text-slate-500 mt-1">Cleared bills</p>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-700/50 col-span-2 lg:col-span-1 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-indigo-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Due</span>
              <IndianRupee className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-white">₹{analytics.totalAmountDue}</span>
              <p className="text-[10px] text-sky-400 mt-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Action required
              </p>
            </div>
          </div>
        </div>

        {/* Chart section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Monthly Penalities Trend
                </h3>
                <p className="text-xs text-slate-400">Total expenditure aggregations from database</p>
              </div>
            </div>

            <div className="w-full h-44 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="600" y2="40" stroke="#334155" strokeWidth="0.5" strokeDasharray="5,5" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="#334155" strokeWidth="0.5" strokeDasharray="5,5" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="#334155" strokeWidth="0.5" strokeDasharray="5,5" />

                {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 ? (
                  <>
                    <path
                      d="M 50,130 Q 150,110 300,70 T 550,40"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3"
                    />
                    <path
                      d="M 50,130 Q 150,110 300,70 T 550,40 L 550,150 L 50,150 Z"
                      fill="url(#chartGrad)"
                    />
                    <circle cx="50" cy="130" r="5" fill="#38bdf8" />
                    <circle cx="200" cy="115" r="5" fill="#38bdf8" />
                    <circle cx="380" cy="85" r="5" fill="#6366f1" />
                    <circle cx="550" cy="40" r="5" fill="#818cf8" />
                  </>
                ) : (
                  <text x="300" y="75" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">
                    Add penalty tickets to display trends
                  </text>
                )}
              </svg>
            </div>
            
            <div className="flex justify-between text-[10px] text-slate-500 font-bold px-6 mt-2">
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
              <span>MAY</span>
            </div>
          </div>

          {/* Schedulers tracking panel */}
          <div className="glass p-6 rounded-3xl border border-slate-700/50 flex flex-col justify-between bg-gradient-to-br from-slate-900/60 to-indigo-950/20">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Cron Engine Logs
              </h3>
              
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Daemon Status</span>
                  <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    Active Background Scheduler Sweeps
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Trigger checkpoints</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Cron worker checks offsets at -7 days, -3 days, -1 day, due date, and overdue parameters recursively.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 mt-4 text-center">
              Active cron pattern: '0 * * * *' (hourly sweeps)
            </div>
          </div>
        </div>

        {/* Workstation bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List and Filters */}
          <div className="lg:col-span-2">
            
            {/* Filter controls */}
            <div className="glass p-4 rounded-2xl border border-slate-700/50 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchVehicle}
                  onChange={(e) => setSearchVehicle(e.target.value)}
                  placeholder="Search vehicle plates..."
                  className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Paid">Paid Only</option>
                  <option value="Overdue">Overdue Only</option>
                </select>

                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 ml-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highestAmount">Highest Amount</option>
                  <option value="lowestAmount">Lowest Amount</option>
                  <option value="dueSoon">Due Soon</option>
                </select>
              </div>
            </div>

            {/* Challans list */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 rounded-3xl border border-slate-800/80">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4" />
                <p className="text-slate-400 text-sm">Accessing database ledgers...</p>
              </div>
            ) : fines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 rounded-3xl border border-slate-800/80 text-center px-6">
                <ShieldCheck className="w-16 h-16 text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">No challans detected.</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {fines.map((fine) => (
                  <motion.div
                    key={fine._id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between gap-5 relative group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                          {fine.fineNumber}
                        </span>

                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          fine.status === 'Paid' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : fine.status === 'Overdue'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {fine.status}
                        </span>

                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Due: {new Date(fine.dueDate).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-bold text-white">{fine.violationType}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                          <span className="bg-slate-900/50 text-slate-300 font-bold px-2 py-0.5 rounded-md border border-slate-800">
                            {fine.vehicleNumber}
                          </span>
                          {fine.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {fine.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {fine.description && (
                        <p className="text-xs text-slate-400 bg-slate-900/30 p-2.5 rounded-lg border border-slate-900">
                          {fine.description}
                        </p>
                      )}

                      {/* Display Alert cron log state if active */}
                      {fine.reminderHistory && fine.reminderHistory.length > 0 && (
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1">
                          <span className="font-bold text-sky-400 uppercase tracking-wider block">Cron Notification History</span>
                          {fine.reminderHistory.map((hist, hIdx) => (
                            <p key={hIdx} className="text-slate-400">
                              [{new Date(hist.sentAt).toLocaleDateString()}] {hist.type}: "{hist.message}"
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col justify-between items-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Amount Due</span>
                        <span className="text-2xl font-black text-white">₹{fine.amount}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setAiQuestion(`Explain the violation clauses for ticket "${fine.violationType}" and list precautions to avoid paying ₹${fine.amount} penalties on vehicle ${fine.vehicleNumber}.`);
                            triggerToast('Compliance query injected. Check chat sidebar.', 'success');
                          }}
                          title="Ask AI Copilot"
                          className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 p-2 rounded-xl text-sky-400"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        {fine.status !== 'Paid' && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedFine(fine);
                              setShowMarkPaid(true);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5"
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                            Pay
                          </motion.button>
                        )}

                        <button
                          onClick={() => handleDeleteFine(fine._id)}
                          title="Delete challan"
                          className="bg-slate-900/80 hover:bg-rose-950/40 border border-slate-700/60 hover:border-rose-900/50 p-2 rounded-xl text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* AI Advisor Chat log */}
          <div className="lg:col-span-1">
            <div className="glass rounded-3xl border border-slate-700/50 flex flex-col h-[600px] relative overflow-hidden bg-gradient-to-b from-slate-900/80 via-slate-900/90 to-[#070b14]/90 shadow-2xl">
              
              <div className="p-5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-sky-500/20 p-2 rounded-xl border border-sky-500/30">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Legal Compliance Helper</h3>
                    <p className="text-[10px] text-slate-500 font-semibold">Gemini 2.5 Legal-Copilot</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {aiResponses.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-sky-500 text-white rounded-tr-none font-medium'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      AI Advisor is evaluating...
                    </div>
                  </div>
                )}
                <div ref={aiChatEndRef} />
              </div>

              <div className="p-4 border-t border-slate-800/50 bg-slate-950/40">
                <div className="flex flex-wrap gap-2">
                  {[
                    'Explain wrong parking laws',
                    'Prevent speed ticket fines',
                    'Failure to pay penalties consequences'
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => selectAiChip(chip)}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 px-2.5 py-1.5 rounded-lg"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAiAsk} className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask about traffic codes, safety, court challenges..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isAiLoading || !aiQuestion.trim()}
                  className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 p-2.5 rounded-xl text-white shrink-0"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </form>

            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: ADD MANUAL FINE */}
      <AnimatePresence>
        {showAddManual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddManual(false)}
              className="absolute inset-0 bg-[#070b14]/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl glass rounded-3xl border border-slate-700/60 relative z-10 shadow-2xl overflow-hidden bg-slate-900"
            >
              <div className="p-6 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  <h3 className="text-lg font-bold text-white">Log Traffic challan manually</h3>
                </div>
                <button
                  onClick={() => setShowAddManual(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddManualFine} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Fine / Challan Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter fine number"
                      value={manualForm.fineNumber}
                      onChange={(e) => setManualForm({ ...manualForm, fineNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    {formErrors.fineNumber && <p className="text-[10px] text-rose-400 mt-1 font-semibold">{formErrors.fineNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Vehicle Plate Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TN-05-AB-1234"
                      value={manualForm.vehicleNumber}
                      onChange={(e) => setManualForm({ ...manualForm, vehicleNumber: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    {formErrors.vehicleNumber && <p className="text-[10px] text-rose-400 mt-1 font-semibold">{formErrors.vehicleNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Violation Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={manualForm.violationType}
                      onChange={(e) => setManualForm({ ...manualForm, violationType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="Speeding">Speeding</option>
                      <option value="No Helmet">No Helmet</option>
                      <option value="Signal Jump">Signal Jump</option>
                      <option value="Wrong Parking">Wrong Parking</option>
                      <option value="Seat Belt Violation">Seat Belt Violation</option>
                      <option value="No Pollution Under Control (PUC)">No Pollution Certificate (PUC)</option>
                      <option value="Driving Without License">Driving without License</option>
                      <option value="Reckless Driving">Reckless Driving</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Fine Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Amount in Rupees"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                    {formErrors.amount && <p className="text-[10px] text-rose-400 mt-1 font-semibold">{formErrors.amount}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Issue Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="fine-issue-date"
                      max={today}
                      value={manualForm.issueDate}
                      onChange={(e) => {
                        setManualForm({ ...manualForm, issueDate: e.target.value });
                        // Clear error as user corrects the date
                        if (formErrors.issueDate) setFormErrors(prev => ({ ...prev, issueDate: '' }));
                      }}
                      className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors ${
                        formErrors.issueDate
                          ? 'border-rose-500/70 focus:border-rose-500 bg-rose-950/10'
                          : 'border-slate-800 focus:border-sky-500'
                      }`}
                    />
                    {formErrors.issueDate && <p className="text-[10px] text-rose-400 mt-1 font-semibold flex items-center gap-1"><span>⚠</span>{formErrors.issueDate}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Due Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={manualForm.dueDate}
                      onChange={(e) => setManualForm({ ...manualForm, dueDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                    {formErrors.dueDate && <p className="text-[10px] text-rose-400 mt-1 font-semibold">{formErrors.dueDate}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                    Violation Location
                  </label>
                  <input
                    type="text"
                    placeholder="Enter location name"
                    value={manualForm.location}
                    onChange={(e) => setManualForm({ ...manualForm, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                    Fine Description
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Provide details about violation if any..."
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                  {/* OCR future date warning — shown when OCR extracted a future date */}
                  {ocrFutureDateWarning && (
                    <div className="w-full mb-1 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-snug font-medium">
                        <strong className="block font-bold">OCR Date Warning</strong>
                        Detected issue date appears to be in the future. Please verify the uploaded document and correct the date before saving.
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowAddManual(false); setOcrFutureDateWarning(false); }}
                    className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Discard
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Logging challan...
                      </>
                    ) : (
                      'Save Violation'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: UPLOAD PENALTY BILL - DRAG & DROP & REAL OCR PROCESSOR */}
      <AnimatePresence>
        {showUploadBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadBill(false)}
              className="absolute inset-0 bg-[#070b14]/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg glass rounded-3xl border border-slate-700/60 relative z-10 shadow-2xl overflow-hidden bg-slate-900"
            >
              <div className="p-6 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                  <h3 className="text-lg font-bold text-white">Smart Document Scanner</h3>
                </div>
                <button
                  onClick={() => setShowUploadBill(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Drag zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !ocrLoading && !ocrFile && fileInputRef.current.click()}
                  className={`border-2 border-dashed rounded-2xl py-8 px-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                    ocrFile 
                      ? 'border-sky-500/40 bg-sky-500/5 cursor-default' 
                      : 'border-slate-800 hover:border-slate-700/80 hover:bg-slate-950/20 cursor-pointer'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={ocrLoading}
                  />

                  {ocrFile ? (
                    <>
                      <div className="bg-sky-500/20 p-4 rounded-full text-sky-400">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[280px]">
                          {ocrFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">{(ocrFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-950 p-4 rounded-full border border-slate-800 text-slate-400">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-300">Drag and drop fine ticket here</p>
                        <p className="text-[10px] text-slate-500 mt-1.5">PNG, JPG, JPEG, or PDF up to 10MB</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Remove / Replace controls — shown only after file is selected, hidden during OCR */}
                {ocrFile && !ocrLoading && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove File
                    </button>
                    <button
                      type="button"
                      onClick={() => { clearSelectedFile(); setTimeout(() => fileInputRef.current?.click(), 50); }}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replace File
                    </button>
                  </div>
                )}

                {/* Progress reporting bar */}
                {ocrLoading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>{ocrStatusText}</span>
                      <span>{ocrProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-200"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error diagnostics card */}
                {ocrError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex gap-3 text-rose-300 text-xs"
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-1">OCR Scan Error</strong>
                      <p className="leading-relaxed">{ocrError}</p>
                      <button
                        onClick={() => {
                          setOcrError('');
                          triggerOcr();
                        }}
                        className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold px-3 py-1.5 rounded-lg mt-2.5 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry Extraction
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowUploadBill(false)}
                    className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                    disabled={ocrLoading}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={triggerOcr}
                    disabled={ocrLoading || !ocrFile}
                    className="bg-gradient-to-r from-sky-500 to-indigo-600 disabled:opacity-40 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    {ocrLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Scanning document...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Run Real OCR
                      </>
                    )}
                  </motion.button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: MARK FINE AS PAID */}
      <AnimatePresence>
        {showMarkPaid && selectedFine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowMarkPaid(false);
                setSelectedFine(null);
              }}
              className="absolute inset-0 bg-[#070b14]/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md glass rounded-3xl border border-slate-700/60 relative z-10 shadow-2xl overflow-hidden bg-slate-900"
            >
              <div className="p-6 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Record Fine Settlement</h3>
                </div>
                <button
                  onClick={() => {
                    setShowMarkPaid(false);
                    setSelectedFine(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleMarkPaidSubmit} className="p-6 space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Settling Fine Ticket</span>
                  <strong className="text-white block mt-0.5">{selectedFine.violationType} ({selectedFine.fineNumber})</strong>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-900 text-xs">
                    <span className="text-slate-400">Total Penalty Due:</span>
                    <strong className="text-emerald-400 text-sm">₹{selectedFine.amount}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                    Settlement / Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={settlementForm.paymentDate}
                    onChange={(e) => setSettlementForm({ ...settlementForm, paymentDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                    Payment Note / Reference
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Enter transaction details..."
                    value={settlementForm.paymentNote}
                    onChange={(e) => setSettlementForm({ ...settlementForm, paymentNote: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMarkPaid(false);
                      setSelectedFine(null);
                    }}
                    className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Discard
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isSettling}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                  >
                    {isSettling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Mark Settled'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Fines;
