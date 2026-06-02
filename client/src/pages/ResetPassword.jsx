import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../config/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (pwd) => {
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  };

  const strength = getPasswordStrength(newPassword);
  const isPasswordValid = Object.values(strength).every(Boolean);
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password recovery token is missing. Please initiate a new forgot password request.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet strength requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword
      });
      if (res.data?.success) {
        setSuccess('Password updated successfully! Redirecting you to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired or is invalid.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-slate-400">Establish your new secure password credentials.</p>
          </div>

          {success ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 p-6 rounded-2xl text-center space-y-4 mb-6"
            >
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-450" />
              </div>
              <p className="text-sm font-semibold">{success}</p>
              <p className="text-xs text-slate-500">
                You will be automatically redirected to sign in.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/50 text-rose-450 p-3 rounded-lg text-sm mb-6 text-center">
                  {error}
                </div>
              )}

              {!token && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-lg text-xs text-center mb-4">
                  ⚠️ Reset token query parameter was not found in the URL.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-slate-700 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Checklist */}
                <div className="space-y-1.5 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400" aria-live="polite">
                  <p className="font-bold text-slate-400 mb-1 uppercase tracking-wider text-[8px]">Password Requirements:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                    {(() => {
                      const rules = [
                        { key: 'minLength', label: 'Minimum 8 characters', satisfied: strength.minLength },
                        { key: 'hasUpper', label: 'At least 1 uppercase letter (A-Z)', satisfied: strength.hasUpper },
                        { key: 'hasLower', label: 'At least 1 lowercase letter (a-z)', satisfied: strength.hasLower },
                        { key: 'hasNumber', label: 'At least 1 number (0-9)', satisfied: strength.hasNumber },
                        { key: 'hasSpecial', label: 'At least 1 special character (!@#$%^&*)', satisfied: strength.hasSpecial },
                      ];
                      return rules.map((rule) => {
                        let colorClass = 'text-slate-500';
                        let Icon = XCircle;
                        let ariaLabel = `${rule.label}: incomplete`;

                        if (newPassword !== '') {
                          if (rule.satisfied) {
                            colorClass = 'text-emerald-400';
                            Icon = CheckCircle;
                            ariaLabel = `${rule.label}: satisfied`;
                          } else {
                            colorClass = 'text-rose-450';
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
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                    placeholder="••••••••"
                  />
                </div>

                {/* Confirm Password Helper Card */}
                <div className="space-y-1 mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400" aria-live="polite">
                  <div className="flex items-center gap-1.5">
                    {confirmPassword === '' ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                        <span className="text-slate-500">Confirm your password</span>
                      </>
                    ) : passwordsMatch ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-400 font-semibold">✓ Passwords Match</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                        <span className="text-rose-450 font-semibold">✗ Passwords Do Not Match</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading || !token || !isPasswordValid || !passwordsMatch}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Resetting Password...' : 'Save New Password'} <ArrowRight className="w-4 h-4" />
              </motion.button>

              <p className="mt-6 text-center text-sm text-slate-400">
                Cancel and go back to{' '}
                <Link to="/login" className="font-medium text-sky-400 hover:text-sky-300">
                  Sign in
                </Link>
              </p>
            </form>
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
          <h2 className="text-4xl font-bold mb-4">Secure & Intelligent</h2>
          <p className="text-lg text-sky-200/80 max-w-md mx-auto">
            Establishing a strong, unique password is vital to safeguarding your compliance data and mapping telemetry histories.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
