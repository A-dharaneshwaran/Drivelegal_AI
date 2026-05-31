import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(''); // '' | success | error
  const [resendError, setResendError] = useState('');

  const verifyToken = async (verifyToken) => {
    setIsLoading(true);
    setStatus('loading');
    try {
      const res = await axios.get(`${API_URL}/auth/verify-email`, {
        params: { token: verifyToken }
      });
      if (res.data?.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Verification request failed:', err);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResendStatus('');
    setResendError('');
    try {
      const res = await axios.post(`${API_URL}/auth/resend-verification`, { email });
      if (res.data?.success) {
        setResendStatus('success');
      }
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to request resend verification.');
      setResendStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Left Form/Message Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-slate-900 z-0" />
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 glass p-8 rounded-3xl border border-slate-700/50 text-center"
        >
          {status === 'loading' && (
            <div className="space-y-6 py-8">
              <RefreshCw className="w-12 h-12 text-sky-400 animate-spin mx-auto" />
              <h2 className="text-2xl font-bold text-white">Verifying Email Address</h2>
              <p className="text-slate-400 text-sm">Please wait while we validate your activation token...</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Email Verified!</h2>
              <p className="text-slate-350 text-sm leading-relaxed">
                Thank you! Your email address has been successfully verified. Your DriveLegal AI account is now active and ready.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25"
                  >
                    Proceed to Sign In <ArrowRight className="w-4 h-4 inline-block ml-1" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}

          {(status === 'error' || status === 'idle') && (
            <div className="space-y-5">
              {status === 'error' ? (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4 mb-4"
                >
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
                    <XCircle className="w-8 h-8 text-rose-450" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    The verification link is invalid or expired. Links expire 24 hours after registration.
                  </p>
                </motion.div>
              ) : (
                <div className="mb-4">
                  <h2 className="text-3xl font-bold text-white mb-2">Verify Email</h2>
                  <p className="text-slate-400 text-xs">
                    Please verify your email address to activate your DriveLegal account.
                  </p>
                </div>
              )}

              {resendStatus === 'success' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 p-4 rounded-xl text-xs font-semibold leading-relaxed">
                  Verification email sent! Please check your inbox (and spam folder) for the verification link.
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-4 text-left">
                  {resendError && (
                    <div className="bg-rose-500/10 border border-rose-500/50 text-rose-450 p-3 rounded-lg text-xs text-center">
                      {resendError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-350 mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-750 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Sending Link...' : 'Resend Verification Link'}
                  </motion.button>
                </form>
              )}

              <p className="pt-4 text-sm text-slate-400">
                Remembered your account?{' '}
                <Link to="/login" className="font-semibold text-sky-400 hover:text-sky-300">
                  Sign in
                </Link>
              </p>
            </div>
          )}
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
          <h2 className="text-4xl font-bold mb-4">DriveLegal AI</h2>
          <p className="text-lg text-sky-200/80 max-w-md mx-auto">
            Experience the next standard in road compliance. Verify your email to activate secure, automated legal advisory systems.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
