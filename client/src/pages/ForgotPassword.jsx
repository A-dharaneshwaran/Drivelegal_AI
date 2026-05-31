import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      if (res.data?.success) {
        setSuccess(res.data.message || 'If an account exists, a reset link has been sent.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit password recovery request.');
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
            <h2 className="text-3xl font-bold text-white mb-2">Recover Password</h2>
            <p className="text-slate-400">Enter your email and we'll send you recovery details.</p>
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
              <p className="text-xs text-slate-500 leading-relaxed">
                Please check your email inbox (and spam folder) for the password reset instructions.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Back to Sign In
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/50 text-rose-450 p-3 rounded-lg text-sm mb-6 text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Sending Link...' : 'Send Recovery Link'} <ArrowRight className="w-4 h-4" />
              </motion.button>

              <p className="mt-6 text-center text-sm text-slate-400">
                Remember your password?{' '}
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
            Access secure recovery utilities. Your DriveLegal credentials and personal telemetry profile are protected using industrial encryption layers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
