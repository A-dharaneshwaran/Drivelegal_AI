import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Upload,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  Loader2,
  Calendar,
  Sparkles,
  FileText,
  Activity,
  Plus,
  Car,
  Info,
  XCircle,
  TrendingDown,
  Zap,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';


// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE DOCUMENT DATE VALIDATION ENGINE
// Mirrors server-side rules exactly so UI feedback is instant and consistent.
// ─────────────────────────────────────────────────────────────────────────────
const VALIDATION_RULES = {
  DL: {
    minValidityMonths: 12,
    maxValidityMonths: 240,
    typicalMinYears: 5,
    typicalMaxYears: 20,
    label: 'Driving License',
    hint: 'Typical validity: 5–20 years'
  },
  RC: {
    minValidityMonths: 12,
    maxValidityMonths: 240,
    typicalMinYears: 10,
    typicalMaxYears: 20,
    label: 'Registration Certificate',
    hint: 'Expected validity: ~15 years'
  },
  Insurance: {
    minValidityMonths: 1,
    maxValidityMonths: 60,
    typicalMinYears: 1,
    typicalMaxYears: 3,
    label: 'Insurance Policy',
    hint: 'Typical validity: 1–3 years'
  },
  PUC: {
    minValidityMonths: 1,
    maxValidityMonths: 18,
    typicalMinMonths: 3,
    typicalMaxMonths: 12,
    label: 'PUC Certificate',
    hint: 'Typical validity: 3–12 months'
  }
};

/**
 * Client-side date pair validation. Returns { errors, warnings, validityMonths, previewStatus }
 * errors → hard blocks (save disabled)
 * warnings → soft advisory (save allowed with indicator)
 * previewStatus → 'Valid' | 'Expiring Soon' | 'Expired' | 'Unusual Validity' | null
 */
const validateDocumentDates = (documentType, issueDate, expiryDate) => {
  const errors = [];
  const warnings = [];
  const rules = VALIDATION_RULES[documentType];
  if (!rules || !expiryDate) return { errors, warnings, validityMonths: null, previewStatus: null };

  const now = new Date();
  const parsedExpiry = new Date(expiryDate);
  if (isNaN(parsedExpiry.getTime())) {
    errors.push('Expiry date is not a valid date.');
    return { errors, warnings, validityMonths: null, previewStatus: null };
  }

  let parsedIssue = null;
  if (issueDate) {
    parsedIssue = new Date(issueDate);
    if (isNaN(parsedIssue.getTime())) {
      errors.push('Issue date is not a valid date.');
      return { errors, warnings, validityMonths: null, previewStatus: null };
    }
    if (parsedExpiry <= parsedIssue) {
      errors.push(`Expiry date must be after issue date for ${rules.label}.`);
    }
    const futureTolerance = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (parsedIssue > futureTolerance) {
      errors.push(`Issue date cannot be in the future for ${rules.label}.`);
    }
  }

  if (errors.length > 0) {
    return { errors, warnings, validityMonths: null, previewStatus: null };
  }

  // Compute validity in months
  let validityMonths = null;
  if (parsedIssue && parsedExpiry) {
    validityMonths = Math.round((parsedExpiry - parsedIssue) / (1000 * 60 * 60 * 24 * 30.44));
  }

  // Range warnings
  if (validityMonths !== null && parsedIssue) {
    const { minValidityMonths, maxValidityMonths } = rules;

    if (validityMonths < minValidityMonths) {
      warnings.push(`Validity of ${validityMonths} month(s) is unusually short. ${rules.hint}.`);
    }
    if (validityMonths > maxValidityMonths) {
      warnings.push(`Validity of ${Math.round(validityMonths / 12)} years is unusually long. ${rules.hint}.`);
    }

    if (documentType === 'DL') {
      const yr = validityMonths / 12;
      if (yr < rules.typicalMinYears && validityMonths >= minValidityMonths) {
        warnings.push(`DL validity of ${Math.round(yr * 10) / 10} years is below the typical 5–20 year range.`);
      } else if (yr > rules.typicalMaxYears) {
        warnings.push(`DL validity of ${Math.round(yr)} years exceeds the typical 20-year maximum.`);
      }
    }
    if (documentType === 'RC') {
      const yr = validityMonths / 12;
      if (yr < rules.typicalMinYears && validityMonths >= minValidityMonths) {
        warnings.push(`RC validity of ${Math.round(yr)} year(s) is below the expected ~15-year range.`);
      }
    }
    if (documentType === 'Insurance') {
      const yr = validityMonths / 12;
      if (yr > 5) {
        warnings.push(`Insurance validity of ${Math.round(yr)} years exceeds 5 years. Typical policies are 1–3 years.`);
      }
    }
    if (documentType === 'PUC') {
      if (validityMonths > 12) {
        warnings.push(`PUC validity of ${validityMonths} months exceeds 12 months. PUC is typically valid 3–12 months.`);
      }
    }
  }

  // Preview status
  let previewStatus = 'Valid';
  const diffDays = Math.ceil((parsedExpiry - now) / (1000 * 60 * 60 * 24));
  if (parsedExpiry < now) previewStatus = 'Expired';
  else if (diffDays <= 30) previewStatus = 'Expiring Soon';
  else if (warnings.length > 0) previewStatus = 'Unusual Validity';

  return { errors, warnings, validityMonths, previewStatus };
};

/**
 * Detect if user-edited dates differ significantly from OCR-extracted dates.
 * Returns drift warning string or null.
 */
const detectOcrDrift = (ocrDate, editedDate, fieldLabel) => {
  if (!ocrDate || !editedDate) return null;
  const ocr = new Date(ocrDate);
  const edited = new Date(editedDate);
  if (isNaN(ocr.getTime()) || isNaN(edited.getTime())) return null;
  const diffDays = Math.abs((ocr - edited) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    return `⚠ ${fieldLabel} differs from OCR scan by ${Math.round(diffDays)} days. Verify against physical document.`;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Valid:            { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle,   iconColor: 'text-emerald-400' },
  'Expiring Soon':  { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   icon: Clock,          iconColor: 'text-amber-400'   },
  Expired:          { bg: 'bg-rose-500/10',     border: 'border-rose-500/30',    text: 'text-rose-400',    icon: AlertTriangle,  iconColor: 'text-rose-400'    },
  'Unusual Validity':{ bg: 'bg-violet-500/10', border: 'border-violet-500/30',  text: 'text-violet-400',  icon: Info,           iconColor: 'text-violet-400'  },
  Missing:          { bg: 'bg-slate-800',       border: 'border-slate-700',      text: 'text-slate-500',   icon: AlertTriangle,  iconColor: 'text-slate-500'   }
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.Missing;

// ─────────────────────────────────────────────────────────────────────────────
// INLINE VALIDATION MESSAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ValidationMessages = ({ errors = [], warnings = [], driftWarning = null }) => {
  if (!errors.length && !warnings.length && !driftWarning) return null;
  return (
    <div className="space-y-1.5 mt-1.5">
      {errors.map((err, i) => (
        <div key={`err-${i}`} className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <span className="text-[10px] text-rose-300 font-semibold leading-relaxed">{err}</span>
        </div>
      ))}
      {warnings.map((warn, i) => (
        <div key={`warn-${i}`} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-[10px] text-amber-300 font-semibold leading-relaxed">{warn}</span>
        </div>
      ))}
      {driftWarning && (
        <div className="flex items-start gap-2 bg-violet-500/10 border border-violet-500/25 rounded-xl px-3 py-2">
          <Info className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
          <span className="text-[10px] text-violet-300 font-semibold leading-relaxed">{driftWarning}</span>
        </div>
      )}
    </div>
  );
};

// Status badge preview during form entry
const StatusPreviewBadge = ({ status }) => {
  if (!status) return null;
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT VAULT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DocumentVault = () => {
  const [documents, setDocuments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  // Upload States
  const [uploadType, setUploadType] = useState('DL');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Manual Form States
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState('DL');
  const [manualNumber, setManualNumber] = useState('');
  const [manualIssue, setManualIssue] = useState('');
  const [manualExpiry, setManualExpiry] = useState('');
  const [manualVehicleId, setManualVehicleId] = useState('');

  // Edit States
  const [editingDoc, setEditingDoc] = useState(null);
  const [editNumber, setEditNumber] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editVehicleId, setEditVehicleId] = useState('');

  const [toast, setToast] = useState(null);

  // OCR Pre-flight review states
  const [preflightData, setPreflightData] = useState(null);
  const [reviewFields, setReviewFields] = useState({
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    vehicleNumber: '',
    holderName: '',
    ownerName: '',
    insurerName: ''
  });
  // Original OCR-extracted dates (for drift detection)
  const [ocrExtractedDates, setOcrExtractedDates] = useState({ issueDate: '', expiryDate: '' });

  // ── Computed validation results (memoized) ──────────────────────────────────
  const manualValidation = useMemo(
    () => validateDocumentDates(manualType, manualIssue, manualExpiry),
    [manualType, manualIssue, manualExpiry]
  );

  const reviewValidation = useMemo(
    () => validateDocumentDates(
      preflightData?.documentType || 'DL',
      reviewFields.issueDate,
      reviewFields.expiryDate
    ),
    [preflightData?.documentType, reviewFields.issueDate, reviewFields.expiryDate]
  );

  const editValidation = useMemo(
    () => validateDocumentDates(
      editingDoc?.documentType || 'DL',
      editIssue,
      editExpiry
    ),
    [editingDoc?.documentType, editIssue, editExpiry]
  );

  // OCR drift detection
  const issueDrift = useMemo(
    () => detectOcrDrift(ocrExtractedDates.issueDate, reviewFields.issueDate, 'Issue Date'),
    [ocrExtractedDates.issueDate, reviewFields.issueDate]
  );
  const expiryDrift = useMemo(
    () => detectOcrDrift(ocrExtractedDates.expiryDate, reviewFields.expiryDate, 'Expiry Date'),
    [ocrExtractedDates.expiryDate, reviewFields.expiryDate]
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // Ref to the hidden file input so we can reset its value and re-trigger
  const fileInputRef = useRef(null);

  /**
   * Clears the selected file and ALL derived OCR state completely.
   * Called by both Remove File and Replace File actions.
   */
  const clearSelectedFile = () => {
    setFile(null);
    setUploadProgress('');
    setPreflightData(null);
    setOcrExtractedDates({ issueDate: '', expiryDate: '' });
    setReviewFields({
      documentNumber: '',
      issueDate: '',
      expiryDate: '',
      vehicleNumber: '',
      holderName: '',
      ownerName: '',
      insurerName: ''
    });
    // Reset native input value so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadVaultData = async () => {
    try {
      const docsRes = await axios.get(`${API_URL}/api/documents`, getAuthHeaders());
      if (docsRes.data?.success) setDocuments(docsRes.data.documents);
      const vehsRes = await axios.get(`${API_URL}/api/vehicles`, getAuthHeaders());
      if (vehsRes.data?.success) setVehicles(vehsRes.data.vehicles);
    } catch (err) {
      console.error('Failed to load vault data:', err.message);
    }
  };

  useEffect(() => { loadVaultData(); }, []);

  // Process Document Upload (OCR preflight)
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) { triggerToast('Please select a JPG, PNG, or PDF file first.', 'warning'); return; }

    setIsUploading(true);
    setUploadProgress('Scanning and extracting document text...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', uploadType);
    if (selectedVehicleId) formData.append('vehicleId', selectedVehicleId);

    const progressTimer = setTimeout(() => {
      setUploadProgress('OCR completed! Performing hybrid parsing & Gemini refinement...');
    }, 2800);

    try {
      const res = await axios.post(`${API_URL}/api/documents/ocr-preflight`, formData, {
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      clearTimeout(progressTimer);
      if (res.data?.success) {
        triggerToast('OCR pre-flight completed! Please verify details below.', 'success');
        setPreflightData(res.data);
        const ext = res.data.extracted || {};
        const extractedIssue = ext.issueDate ? ext.issueDate.split('T')[0] : '';
        const extractedExpiry = ext.expiryDate ? ext.expiryDate.split('T')[0] : '';
        setOcrExtractedDates({ issueDate: extractedIssue, expiryDate: extractedExpiry });
        setReviewFields({
          documentNumber: ext.documentNumber || '',
          issueDate: extractedIssue,
          expiryDate: extractedExpiry,
          vehicleNumber: ext.vehicleNumber || '',
          holderName: ext.holderName || '',
          ownerName: ext.ownerName || '',
          insurerName: ext.insurerName || ''
        });
      }
    } catch (err) {
      clearTimeout(progressTimer);
      triggerToast(err.response?.data?.message || 'OCR document scanning preflight failed.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Save confirmed OCR document
  const handleOcrConfirm = async (e) => {
    e.preventDefault();
    // Frontend hard-block
    if (reviewValidation.errors.length > 0) {
      triggerToast(reviewValidation.errors[0], 'error');
      return;
    }
    if (!reviewFields.documentNumber.trim() || !reviewFields.expiryDate) {
      triggerToast('Document number and expiry date are required.', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Saving confirmed document & updating compliance score...');

    try {
      const res = await axios.post(`${API_URL}/api/documents/ocr-confirm`, {
        documentType: preflightData.documentType,
        vehicleId: preflightData.vehicleId,
        documentNumber: reviewFields.documentNumber,
        issueDate: reviewFields.issueDate,
        expiryDate: reviewFields.expiryDate,
        vehicleNumber: reviewFields.vehicleNumber,
        holderName: reviewFields.holderName,
        ownerName: reviewFields.ownerName,
        insurerName: reviewFields.insurerName,
        confidences: preflightData.confidences,
        filePreview: preflightData.filePreview
      }, getAuthHeaders());

      if (res.data?.success) {
        if (res.data.validationWarnings?.length > 0) {
          triggerToast(`${preflightData.documentType} saved with validity warning. Please review.`, 'warning');
        } else {
          triggerToast(`${preflightData.documentType} confirmed and saved to vault!`, 'success');
        }
        setFile(null);
        setPreflightData(null);
        setOcrExtractedDates({ issueDate: '', expiryDate: '' });
        loadVaultData();
      }
    } catch (err) {
      const serverErr = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to confirm and save document.';
      triggerToast(serverErr, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Submit Manual Creation
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    // Frontend hard-block
    if (manualValidation.errors.length > 0) {
      triggerToast(manualValidation.errors[0], 'error');
      return;
    }
    if (!manualNumber.trim() || !manualExpiry) {
      triggerToast('Missing required document parameters.', 'warning');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/documents/manual`, {
        documentType: manualType,
        documentNumber: manualNumber,
        issueDate: manualIssue,
        expiryDate: manualExpiry,
        vehicleId: manualType !== 'DL' ? manualVehicleId : undefined
      }, getAuthHeaders());

      if (res.data?.success) {
        if (res.data.validationWarnings?.length > 0) {
          triggerToast(`${manualType} saved with unusual validity — please verify dates.`, 'warning');
        } else {
          triggerToast(`${manualType} saved successfully!`, 'success');
        }
        setShowManualForm(false);
        setManualNumber(''); setManualIssue(''); setManualExpiry(''); setManualVehicleId('');
        loadVaultData();
      }
    } catch (err) {
      const serverErr = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Manual creation failed.';
      triggerToast(serverErr, 'error');
    }
  };

  // Delete document
  const handleDeleteDoc = async (id, docType) => {
    if (!window.confirm(`Delete this ${docType}? This will impact your Compliance Score.`)) return;
    try {
      const res = await axios.delete(`${API_URL}/api/documents/${id}`, getAuthHeaders());
      if (res.data?.success) { triggerToast(`${docType} deleted.`, 'success'); loadVaultData(); }
    } catch (err) { triggerToast('Failed to delete document.', 'error'); }
  };

  // Update document
  const handleUpdateDoc = async (e) => {
    e.preventDefault();
    // Frontend hard-block
    if (editValidation.errors.length > 0) {
      triggerToast(editValidation.errors[0], 'error');
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/api/documents/update/${editingDoc._id}`, {
        documentNumber: editNumber,
        issueDate: editIssue || undefined,
        expiryDate: editExpiry,
        vehicleId: editingDoc.documentType !== 'DL' ? editVehicleId : undefined
      }, getAuthHeaders());

      if (res.data?.success) {
        if (res.data.validationWarnings?.length > 0) {
          triggerToast('Document updated with unusual validity warning.', 'warning');
        } else {
          triggerToast('Document updated successfully.', 'success');
        }
        setEditingDoc(null);
        loadVaultData();
      }
    } catch (err) {
      const serverErr = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to update document.';
      triggerToast(serverErr, 'error');
    }
  };

  const getDocumentByType = (type) => documents.find(d => d.documentType === type);

  const docTypesList = [
    { type: 'DL', label: 'Driving License', desc: 'Active operator driving permit certificate' },
    { type: 'RC', label: 'Registration (RC)', desc: 'Motor vehicle state registration book' },
    { type: 'Insurance', label: 'Vehicle Insurance', desc: 'Valid comprehensive third-party liability policy' },
    { type: 'PUC', label: 'Emission (PUC)', desc: 'Pollution Under Control carbon safety ticket' }
  ];

  return (
    <div className="pt-20 min-h-screen bg-[#070b14] text-slate-100 font-sans pb-16 relative overflow-hidden">
      
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md max-w-sm ${
              toast.type === 'success'  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
              toast.type === 'warning' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
              'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> :
             toast.type === 'warning' ? <AlertTriangle className="w-5 h-5 shrink-0" /> :
             <XCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Smart Document Vault
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Store and monitor required traffic certificates. AI-powered date validation ensures compliance accuracy.
            </p>
          </div>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="w-fit bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-indigo-500/20 hover:shadow-lg px-4 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0"
          >
            {showManualForm ? <Clock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showManualForm ? 'Show Upload Portal' : 'Add Metadata Manually'}
          </button>
        </div>

        {/* Document Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {docTypesList.map(item => {
            const doc = getDocumentByType(item.type);
            const status = doc ? doc.status : 'Missing';
            const cfg = getStatusConfig(status);
            const Icon = cfg.icon;
            return (
              <div
                key={item.type}
                className={`p-5 rounded-3xl border flex items-center justify-between shadow-lg relative overflow-hidden group transition-all ${
                  doc ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-950/20 opacity-80 border-slate-900 border-dashed'
                }`}
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">{item.type} REQUIRED</span>
                  <strong className="text-sm font-black text-white block">{item.label}</strong>
                  <span className="text-[9px] text-slate-500 leading-none font-semibold block">{item.desc}</span>
                  {doc && doc.expiryDate && (
                    <span className="text-[9px] text-slate-600 block">
                      Exp: {new Date(doc.expiryDate).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl border shrink-0 ${cfg.bg} ${cfg.border}`}>
                  <Icon className={`w-5 h-5 ${cfg.iconColor} ${status === 'Expired' ? 'animate-pulse' : ''}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload Portal / Manual Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {showManualForm ? (
                // ── MANUAL ENTRY PANEL ──────────────────────────────────────────
                <motion.div
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  key="manual"
                  className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-2xl"
                >
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-sky-400" />
                    Manual Document Entry
                  </h3>

                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Document Type</label>
                      <select
                        value={manualType}
                        onChange={(e) => { setManualType(e.target.value); setManualIssue(''); setManualExpiry(''); }}
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      >
                        <option value="DL">Driving License (DL)</option>
                        <option value="RC">Registration Book (RC)</option>
                        <option value="Insurance">Vehicle Insurance Policy</option>
                        <option value="PUC">Pollution Under Control (PUC)</option>
                      </select>
                      <p className="text-[10px] text-slate-600 mt-1 font-medium">{VALIDATION_RULES[manualType]?.hint}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Document / Certificate No.</label>
                      <input
                        type="text"
                        value={manualNumber}
                        onChange={(e) => setManualNumber(e.target.value)}
                        placeholder="e.g. DL-TN-07-2026-0001"
                        required
                        className="w-full bg-slate-900/50 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Issue Date</label>
                        <input
                          type="date"
                          value={manualIssue}
                          onChange={(e) => setManualIssue(e.target.value)}
                          className={`w-full bg-slate-900/50 border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors ${
                            manualValidation.errors.length > 0 ? 'border-rose-500/60' : 'border-slate-800 focus:border-sky-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Expiry Date</label>
                        <input
                          type="date"
                          value={manualExpiry}
                          onChange={(e) => setManualExpiry(e.target.value)}
                          required
                          className={`w-full bg-slate-900/50 border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors ${
                            manualValidation.errors.length > 0 ? 'border-rose-500/60' : 'border-slate-800 focus:border-sky-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Real-time validation feedback */}
                    <ValidationMessages
                      errors={manualValidation.errors}
                      warnings={manualValidation.warnings}
                    />

                    {/* Status preview badge */}
                    {manualExpiry && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-semibold">Preview:</span>
                        <StatusPreviewBadge status={manualValidation.previewStatus} />
                        {manualValidation.validityMonths !== null && (
                          <span className="text-[10px] text-slate-500">
                            ({manualValidation.validityMonths} months validity)
                          </span>
                        )}
                      </div>
                    )}

                    {manualType !== 'DL' && vehicles.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Link to Vehicle</label>
                        <select
                          value={manualVehicleId}
                          onChange={(e) => setManualVehicleId(e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none text-slate-300"
                        >
                          <option value="">-- Select Registered Plate --</option>
                          {vehicles.map(v => (
                            <option key={v._id} value={v._id}>{v.plateNumber} ({v.make} {v.model})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={manualValidation.errors.length > 0}
                      title={manualValidation.errors.length > 0 ? manualValidation.errors[0] : undefined}
                      className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 py-3 rounded-xl text-white text-xs font-black tracking-wider uppercase hover:shadow-indigo-500/20 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {manualValidation.errors.length > 0 ? (
                        <><XCircle className="w-4 h-4" /> Fix Date Errors to Save</>
                      ) : manualValidation.warnings.length > 0 ? (
                        <><AlertTriangle className="w-4 h-4" /> Save with Warning</>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /> Save Document Metadata</>
                      )}
                    </button>
                  </form>
                </motion.div>

              ) : preflightData ? (
                // ── OCR REVIEW PANEL ───────────────────────────────────────────
                <motion.div
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  key="review"
                  className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-2xl relative"
                >
                  <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                      Verify Document Details
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {preflightData.documentType} review
                      </span>
                      {preflightData.detectedType && preflightData.detectedType !== 'Unknown' && (
                        <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                          preflightData.typeMismatch
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                          AI: {preflightData.detectedType}
                        </span>
                      )}
                    </div>
                  </div>

                  {preflightData.filePreview && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-900 bg-slate-950/50 max-h-[140px] flex items-center justify-center p-2">
                      <img
                        src={preflightData.filePreview}
                        alt="Document scan preview"
                        className="object-contain w-full h-full max-h-[120px] rounded-lg"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/40 to-transparent pointer-events-none" />
                    </div>
                  )}

                  {/* OCR Confidence */}
                  <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400">Document Readability</span>
                      <span className={`font-black ${
                        (preflightData.confidences?.overallOcr || 0) >= 85 ? 'text-emerald-400' :
                        (preflightData.confidences?.overallOcr || 0) >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>{preflightData.confidences?.overallOcr || 0}% Score</span>
                    </div>
                    <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (preflightData.confidences?.overallOcr || 0) >= 85 ? 'bg-emerald-500' :
                          (preflightData.confidences?.overallOcr || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${preflightData.confidences?.overallOcr || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Warnings */}
                  {(preflightData.confidences?.overallOcr || 0) < 50 && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <strong className="text-[10px] font-black uppercase tracking-wider block">Low Confidence Read</strong>
                        <p className="text-[10px] text-rose-400/80 leading-relaxed font-medium mt-0.5">Please review and correct the highlighted fields manually.</p>
                      </div>
                    </div>
                  )}
                  {preflightData.typeMismatch && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <strong className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">Document Type Mismatch</strong>
                        <p className="text-[10px] text-amber-400/80 leading-relaxed font-medium mt-0.5">
                          You selected <span className="font-black text-amber-300">{preflightData.documentType}</span> but OCR detected a <span className="font-black text-amber-300">{preflightData.detectedType}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                  {preflightData.isDuplicate && (
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3.5 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
                      <div>
                        <strong className="text-[10px] font-black uppercase tracking-wider text-sky-300 block">Existing Document Found</strong>
                        <p className="text-[10px] text-sky-400/80 leading-relaxed font-medium mt-0.5">Confirming will replace the existing {preflightData.documentType}.</p>
                      </div>
                    </div>
                  )}

                  {/* Date validation on review form */}
                  <ValidationMessages
                    errors={reviewValidation.errors}
                    warnings={reviewValidation.warnings}
                    driftWarning={issueDrift || expiryDrift}
                  />

                  {/* Status preview on review form */}
                  {reviewFields.expiryDate && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-semibold">Preview:</span>
                      <StatusPreviewBadge status={reviewValidation.previewStatus} />
                      {reviewValidation.validityMonths !== null && (
                        <span className="text-[10px] text-slate-500">({reviewValidation.validityMonths}mo validity)</span>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleOcrConfirm} className="space-y-4">
                    {(() => {
                      const renderField = (label, fieldKey, type = 'text', confidenceVal) => {
                        const conf = confidenceVal || 0;
                        const confColor = conf >= 85 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' :
                                          conf >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25' :
                                          'text-rose-400 bg-rose-500/10 border-rose-500/25';
                        const isDateField = type === 'date';
                        const hasDateError = reviewValidation.errors.length > 0 && isDateField;
                        return (
                          <div className="space-y-1" key={fieldKey}>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-extrabold text-slate-500 uppercase tracking-wider">{label}</span>
                              {confidenceVal !== undefined && (
                                <span className={`font-bold px-1.5 py-0.5 rounded border text-[9px] ${confColor}`}>{conf}% match</span>
                              )}
                            </div>
                            <input
                              type={type}
                              value={reviewFields[fieldKey] || ''}
                              onChange={(e) => setReviewFields({ ...reviewFields, [fieldKey]: e.target.value })}
                              className={`w-full bg-slate-900/50 border rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-700 focus:outline-none transition-colors ${
                                hasDateError ? 'border-rose-500/60' : 'border-slate-800 focus:border-sky-500'
                              }`}
                              placeholder={`Enter ${label.toLowerCase()}`}
                              required={fieldKey === 'documentNumber' || fieldKey === 'expiryDate'}
                            />
                          </div>
                        );
                      };

                      if (preflightData.documentType === 'DL') return (
                        <>
                          {renderField('License Number', 'documentNumber', 'text', preflightData.confidences?.documentNumber)}
                          {renderField('Holder Name', 'holderName', 'text', preflightData.confidences?.holderName)}
                          <div className="grid grid-cols-2 gap-3">
                            {renderField('Issue Date', 'issueDate', 'date', preflightData.confidences?.issueDate)}
                            {renderField('Expiry Date', 'expiryDate', 'date', preflightData.confidences?.expiryDate)}
                          </div>
                        </>
                      );
                      if (preflightData.documentType === 'RC') return (
                        <>
                          {renderField('Registration Number', 'documentNumber', 'text', preflightData.confidences?.documentNumber)}
                          {renderField('Owner Name', 'ownerName', 'text', preflightData.confidences?.ownerName)}
                          <div className="grid grid-cols-2 gap-3">
                            {renderField('Registration Date', 'issueDate', 'date', preflightData.confidences?.issueDate)}
                            {renderField('Expiry Date', 'expiryDate', 'date', preflightData.confidences?.expiryDate)}
                          </div>
                        </>
                      );
                      if (preflightData.documentType === 'Insurance') return (
                        <>
                          {renderField('Policy Number', 'documentNumber', 'text', preflightData.confidences?.documentNumber)}
                          {renderField('Insurer Name', 'insurerName', 'text', preflightData.confidences?.insurerName)}
                          {renderField('Vehicle Number', 'vehicleNumber', 'text', preflightData.confidences?.vehicleNumber)}
                          {renderField('Expiry Date', 'expiryDate', 'date', preflightData.confidences?.expiryDate)}
                        </>
                      );
                      if (preflightData.documentType === 'PUC') return (
                        <>
                          {renderField('Certificate Number', 'documentNumber', 'text', preflightData.confidences?.documentNumber)}
                          {renderField('Vehicle Number', 'vehicleNumber', 'text', preflightData.confidences?.vehicleNumber)}
                          {renderField('Expiry Date', 'expiryDate', 'date', preflightData.confidences?.expiryDate)}
                        </>
                      );
                      return null;
                    })()}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setPreflightData(null); setFile(null); setOcrExtractedDates({ issueDate: '', expiryDate: '' }); }}
                        className="w-full border border-slate-800 hover:bg-slate-900 py-3 rounded-xl text-slate-400 text-xs font-black tracking-wider uppercase transition-all"
                      >
                        Retry OCR
                      </button>
                      <button
                        type="submit"
                        disabled={isUploading || reviewValidation.errors.length > 0}
                        title={reviewValidation.errors.length > 0 ? reviewValidation.errors[0] : undefined}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/20 hover:shadow-lg py-3 rounded-xl text-white text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : reviewValidation.errors.length > 0 ? (
                          <><XCircle className="w-4 h-4" /> Fix Errors</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" /> Confirm & Save</>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>

              ) : (
                // ── OCR UPLOAD DROPZONE ─────────────────────────────────────────
                <motion.div
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  key="ocr"
                  className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-2xl relative"
                >
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                    OCR Intelligent Scanner
                  </h3>

                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Document Type</label>
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      >
                        <option value="DL">Driving License (DL)</option>
                        <option value="RC">Registration Book (RC)</option>
                        <option value="Insurance">Vehicle Insurance Policy</option>
                        <option value="PUC">Pollution Under Control (PUC)</option>
                      </select>
                    </div>

                    {uploadType !== 'DL' && vehicles.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Link to Vehicle</label>
                        <select
                          value={selectedVehicleId}
                          onChange={(e) => setSelectedVehicleId(e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none text-slate-300"
                        >
                          <option value="">-- Select Registered Plate --</option>
                          {vehicles.map(v => (
                            <option key={v._id} value={v._id}>{v.plateNumber} ({v.make} {v.model})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Upload Certificate Image/PDF</label>
                      <div
                        className="mt-1 border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center gap-2.5 bg-slate-950/40"
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          id="doc-file-input"
                          ref={fileInputRef}
                          onChange={(e) => setFile(e.target.files[0])}
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          disabled={isUploading}
                        />
                        <Upload className="w-8 h-8 text-sky-400 animate-bounce" />
                        <span className="text-[11px] font-bold text-slate-300 block">
                          {file ? file.name : 'Choose File or Drop Certificate here'}
                        </span>
                        <span className="text-[9px] text-slate-600 block">Supports JPG, PNG, PDF up to 10MB</span>
                      </div>

                      {/* Remove / Replace controls — only shown after a file is chosen */}
                      {file && !isUploading && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={clearSelectedFile}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
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
                          <span className="text-[9px] text-slate-600 ml-auto">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      )}
                    </div>

                    <button
                      disabled={isUploading || !file}
                      type="submit"
                      className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 disabled:opacity-40 py-3 rounded-xl text-white text-xs font-black tracking-wider uppercase hover:shadow-indigo-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Running OCR parser...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Scan & Upload Document</>
                      )}
                    </button>
                  </form>

                  <AnimatePresence>
                    {isUploading && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#070b14]/90 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-4 z-20"
                      >
                        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                        <div>
                          <strong className="text-xs text-white block">Smart OCR Scanner Active</strong>
                          <span className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed block font-semibold">{uploadProgress}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Document List + Edit Form */}
          <div className="lg:col-span-2 space-y-4">

            {/* Edit Form */}
            <AnimatePresence>
              {editingDoc && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-950/90 border border-sky-500/30 p-5 rounded-3xl space-y-4 shadow-2xl"
                >
                  <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                    <div>
                      <strong className="text-xs font-bold text-white uppercase">Edit {editingDoc.documentType} Details</strong>
                      <p className="text-[10px] text-slate-500 mt-0.5">{VALIDATION_RULES[editingDoc.documentType]?.hint}</p>
                    </div>
                    <button onClick={() => setEditingDoc(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateDoc} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Doc Number</label>
                        <input
                          type="text"
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Issue Date</label>
                        <input
                          type="date"
                          value={editIssue}
                          onChange={(e) => setEditIssue(e.target.value)}
                          className={`w-full bg-slate-900/50 border rounded-xl px-3 py-2 text-xs text-white focus:outline-none ${
                            editValidation.errors.length > 0 ? 'border-rose-500/60' : 'border-slate-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Expiry Date</label>
                        <input
                          type="date"
                          value={editExpiry}
                          onChange={(e) => setEditExpiry(e.target.value)}
                          className={`w-full bg-slate-900/50 border rounded-xl px-3 py-2 text-xs text-white focus:outline-none ${
                            editValidation.errors.length > 0 ? 'border-rose-500/60' : 'border-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Edit validation feedback */}
                    <ValidationMessages
                      errors={editValidation.errors}
                      warnings={editValidation.warnings}
                    />

                    {/* Preview badge in edit mode */}
                    {editExpiry && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-semibold">New Status Preview:</span>
                        <StatusPreviewBadge status={editValidation.previewStatus} />
                      </div>
                    )}

                    {editingDoc.documentType !== 'DL' && (
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Link Vehicle</label>
                        <select
                          value={editVehicleId}
                          onChange={(e) => setEditVehicleId(e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                        >
                          <option value="">-- None --</option>
                          {vehicles.map(v => (
                            <option key={v._id} value={v._id}>{v.plateNumber}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={editValidation.errors.length > 0}
                        title={editValidation.errors.length > 0 ? editValidation.errors[0] : undefined}
                        className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] tracking-wider uppercase px-4 py-2 rounded-xl flex items-center gap-1.5"
                      >
                        {editValidation.errors.length > 0 ? (
                          <><XCircle className="w-3.5 h-3.5" /> Fix Errors</>
                        ) : editValidation.warnings.length > 0 ? (
                          <><AlertTriangle className="w-3.5 h-3.5" /> Save with Warning</>
                        ) : (
                          'Save Updates'
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Documents Ledger */}
            <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                <FileText className="w-4 h-4 text-sky-400" />
                Active Vault Documents Ledger ({documents.length})
              </h3>

              {documents.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/10 rounded-2xl border border-slate-900">
                  <Shield className="w-10 h-10 text-slate-800 mx-auto mb-2" />
                  <strong className="text-xs text-slate-400 block font-bold">No documents uploaded yet.</strong>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                  {documents.map((doc) => {
                    const cfg = getStatusConfig(doc.status);
                    const Icon = cfg.icon;
                    const daysLeft = doc.expiryDate
                      ? Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <div
                        key={doc._id}
                        className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl hover:border-slate-800 hover:bg-slate-900/60 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl border shrink-0 ${cfg.bg} ${cfg.border}`}>
                              <FileText className={`w-4 h-4 ${cfg.iconColor}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-xs font-black text-white leading-tight">{doc.documentType} Document</strong>
                                {/* Status badge */}
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                  {doc.status}
                                </span>
                                {doc.status === 'Unusual Validity' && (
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-violet-500/10 border-violet-500/30 text-violet-400 flex items-center gap-1">
                                    <Info className="w-2.5 h-2.5" /> Verify Dates
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                                No. {doc.documentNumber} • Expiry: {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                              </span>
                              {doc.issueDate && (
                                <span className="text-[9px] text-slate-600 block">
                                  Issued: {new Date(doc.issueDate).toLocaleDateString('en-IN')}
                                </span>
                              )}
                              {/* Days remaining indicator */}
                              {daysLeft !== null && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  {daysLeft < 0 ? (
                                    <span className="text-[9px] font-black text-rose-400 flex items-center gap-1">
                                      <TrendingDown className="w-3 h-3" /> Expired {Math.abs(daysLeft)} days ago
                                    </span>
                                  ) : daysLeft <= 30 ? (
                                    <span className="text-[9px] font-black text-amber-400 flex items-center gap-1 animate-pulse">
                                      <Clock className="w-3 h-3" /> Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-slate-600 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> {daysLeft} days remaining
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Validity warnings from server */}
                              {doc.validityWarnings?.length > 0 && (
                                <div className="mt-1.5 space-y-1">
                                  {doc.validityWarnings.map((w, wi) => (
                                    <div key={wi} className="flex items-start gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-1.5">
                                      <Info className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                                      <span className="text-[9px] text-violet-300 leading-relaxed">{w}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {doc.vehicleId && (
                                <div className="flex items-center gap-1 text-[8px] bg-slate-950 px-2 py-0.5 border border-slate-900 rounded-md text-slate-400 w-fit mt-1.5 font-black uppercase">
                                  <Car className="w-3 h-3 text-sky-400" />
                                  <span>Plate: {doc.vehicleId.plateNumber} ({doc.vehicleId.make})</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingDoc(doc);
                                setEditNumber(doc.documentNumber);
                                setEditIssue(doc.issueDate ? doc.issueDate.split('T')[0] : '');
                                setEditExpiry(doc.expiryDate ? doc.expiryDate.split('T')[0] : '');
                                setEditVehicleId(doc.vehicleId ? doc.vehicleId._id : '');
                              }}
                              className="p-2 hover:bg-slate-800 border border-slate-900 hover:border-slate-800 rounded-xl text-sky-400 transition-colors"
                              title="Edit metadata"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(doc._id, doc.documentType)}
                              className="p-2 hover:bg-slate-800 border border-slate-900 hover:border-slate-800 rounded-xl text-rose-400 transition-colors"
                              title="Delete certificate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Validation Rules Info Panel */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Document Date Validation Engine</h3>
            <span className="text-[9px] bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(VALIDATION_RULES).map(([type, rule]) => (
              <div key={type} className="bg-slate-900/50 rounded-2xl p-3.5 border border-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">{type}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">{rule.label}</p>
                <p className="text-[10px] text-slate-500 mt-1">{rule.hint}</p>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[9px] text-rose-400/80">Hard check: Expiry must be after Issue</span>
                  <span className="text-[9px] text-amber-400/80">Warning if outside typical range</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentVault;
