import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import AuthMessage from '../components/AuthMessage';
import { API_URL } from '../config/api';


const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Verification states
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  // Priority: ?redirect= query param > React Router state.from > /dashboard
  // This ensures /login?redirect=/route-planner works for unauthenticated CTAs
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const from = redirectParam || location.state?.from?.pathname || '/dashboard';

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess('');
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/resend-verification`, {
        email: unverifiedEmail
      });
      if (res.data?.success) {
        setResendSuccess(res.data.message || 'Verification link sent successfully. Please check your email.');
        setEmailUnverified(false); // Clear to prevent multi click
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({ email: '', password: '' });
    setError('');
    setResendSuccess('');
    setEmailUnverified(false);

    let hasErrors = false;
    const errors = { email: '', password: '' };

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
      hasErrors = true;
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required.';
      hasErrors = true;
    }

    if (hasErrors) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, formData);
      localStorage.setItem('token', res.data.token);
      
      // Dispatch authentication state changed event for Navbar reactivity
      window.dispatchEvent(new Event('auth-state-changed'));
      
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.emailVerified === false) {
        setEmailUnverified(true);
        setUnverifiedEmail(err.response?.data?.email || formData.email);
        setError('Please verify your email before signing in.');
      } else {
        setError(err.response?.data?.message || 'Invalid credentials');
      }
      setIsLoading(false);
    }
  };

  const isExpiredNotice = location.state?.expired || new URLSearchParams(location.search).get('expired') === 'true';

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Left Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-slate-900 z-0" />
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 glass p-8 rounded-3xl border border-slate-700/50"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400">Log in to access your safety dashboard.</p>
          </div>

          {/* Show notice when user was redirected from a protected page or session expired */}
          {(location.state?.from || isExpiredNotice) && <AuthMessage />}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-450 p-4 rounded-xl text-sm mb-6 text-center">
              <div>{error}</div>
              {emailUnverified && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-rose-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                  >
                    {resendLoading ? 'Resending Link...' : 'Resend Verification Email'}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 p-4 rounded-xl text-sm mb-6 text-center">
              {resendSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow ${
                    validationErrors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-xs text-rose-450">{validationErrors.email}</p>
              )}

              {/* Email Helper Card */}
              <div className="space-y-1 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400" aria-live="polite">
                <p className="font-bold text-slate-400 mb-1 uppercase tracking-wider text-[8px]">Email Requirements:</p>
                <div className="flex items-center gap-1.5">
                  {formData.email === '' ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      <span className="text-slate-500">Valid email format</span>
                    </>
                  ) : /^\S+@\S+\.\S+$/.test(formData.email) ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400 font-semibold">✓ Valid email address</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                      <span className="text-rose-400 font-semibold">✗ Invalid email format</span>
                    </>
                  )}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 text-[9px]">
                  <span className="text-slate-500 font-bold block mb-0.5 uppercase tracking-wider text-[7px]">Examples:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                    <li>user@example.com</li>
                    <li>driver@gmail.com</li>
                    <li>name@company.org</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow ${
                    validationErrors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none focus:text-slate-350"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-xs text-rose-450">{validationErrors.password}</p>
              )}
              <div className="mt-1.5 text-right">
                <Link to="/forgot-password" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input type="checkbox" className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 rounded bg-slate-900" />
                <label className="ml-2 block text-sm text-slate-400">Remember me</label>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>
          
          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-sky-400 hover:text-sky-300">
              Create one now
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Image/Animation Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-800 flex-col items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/80 to-indigo-900/90" />
        
        <div className="relative z-10 text-center text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/20"
          >
            <ShieldCheck className="w-12 h-12 text-sky-300" />
          </motion.div>
          <h2 className="text-4xl font-bold mb-4">Secure & Intelligent</h2>
          <p className="text-lg text-sky-200/80 max-w-md mx-auto">
            Your personal AI driving assistant ensures every journey is optimized for safety and compliance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
