import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, Phone, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../config/api';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    username: '',
    phone: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pwd) => {
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  };

  const strength = getPasswordStrength(formData.password);
  const isPasswordValid = Object.values(strength).every(Boolean);
  const passwordsMatch = formData.password && formData.password === confirmPassword;

  // Form isValid check to enable/disable signup button
  const isFormValid = 
    formData.name.trim() &&
    formData.email.trim() &&
    isPasswordValid &&
    passwordsMatch &&
    termsAccepted;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      phone: ''
    });
    setError('');

    let hasErrors = false;
    const errors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      phone: ''
    };

    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
      hasErrors = true;
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
      hasErrors = true;
    } else {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email format.';
        hasErrors = true;
      }
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
      hasErrors = true;
    } else if (!isPasswordValid) {
      errors.password = 'Password does not meet strength requirements.';
      hasErrors = true;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
      hasErrors = true;
    } else if (!passwordsMatch) {
      errors.confirmPassword = 'Passwords do not match.';
      hasErrors = true;
    }

    if (formData.phone) {
      const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = 'Invalid phone number format.';
        hasErrors = true;
      }
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    if (hasErrors) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    console.log("Signup URL:", `${API_URL}/api/auth/signup`);
    try {
      const res = await axios.post(`${API_URL}/api/auth/signup`, {
        ...formData,
        confirmPassword
      });
      
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        // Dispatch authentication state changed event
        window.dispatchEvent(new Event('auth-state-changed'));
        navigate('/dashboard');
      } else {
        // Verification email sent, redirect to Verify Email screen with preset email state
        navigate('/verify-email', { state: { email: formData.email } });
      }
    // } catch (err) {
    //   const serverMessage = err.response?.data?.message || '';
    //   const serverField   = err.response?.data?.field   || '';
    //   const status        = err.response?.status;

    //   // 409 Conflict — uniqueness violation: route error to the correct field inline
    //   if (status === 409 || serverField) {
    //     if (serverField === 'email' || serverMessage.toLowerCase().includes('email')) {
    //       setValidationErrors(prev => ({ ...prev, email: 'This email address is already registered.' }));
    //       setError('This email address is already registered.');
    //     } else if (serverField === 'username' || serverMessage.toLowerCase().includes('username')) {
    //       setValidationErrors(prev => ({ ...prev, username: 'This username is already taken. Please choose another.' }));
    //       setError('This username is already taken. Please choose another.');
    //     } else if (serverField === 'phone' || serverMessage.toLowerCase().includes('phone number is already')) {
    //       setValidationErrors(prev => ({ ...prev, phone: 'This phone number is already linked to an existing account.' }));
    //       setError('This phone number is already linked to an existing account.');
    //     } else {
    //       setError(serverMessage || 'Registration failed. Please check your details.');
    //     }
    //   } else {
    //     // All other server errors (400 validation, 500 server errors)
    //     setError(serverMessage || 'Registration failed. Please try again.');
    //   }
    // } 
 } catch (error) {
  console.error("Signup Error:", error);
  console.error("Response:", error.response);
  console.error("Request:", error.request);

  if (error.response) {
    alert(JSON.stringify(error.response.data));
  } else {
    alert(error.message);
  }

  setError(
    error.response?.data?.message ||
    error.message ||
    "Registration failed"
  );
}finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex flex-row-reverse">
      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-slate-900 z-0" />
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 glass p-8 rounded-3xl border border-slate-700/50"
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-slate-400 text-sm">Join the smartest driving community.</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-450 p-3 rounded-lg text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1 uppercase tracking-wider">Full Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-shadow ${
                    validationErrors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {validationErrors.name && (
                <p className="mt-1 text-[10px] text-rose-450">{validationErrors.name}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1 uppercase tracking-wider">Email Address *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-shadow ${
                    validationErrors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-[10px] text-rose-450">{validationErrors.email}</p>
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

            <div className="grid grid-cols-2 gap-4">
              {/* Optional Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-355 mb-1 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs transition-shadow ${
                      validationErrors.username ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                    }`}
                    placeholder="johndoe1"
                  />
                </div>
                {validationErrors.username && (
                  <p className="mt-1 text-[10px] text-rose-450">{validationErrors.username}</p>
                )}
              </div>

              {/* Optional Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-355 mb-1 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs transition-shadow ${
                      validationErrors.phone ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                    }`}
                    placeholder="9988776655"
                  />
                </div>
                {validationErrors.phone && (
                  <p className="mt-1 text-[10px] text-rose-450">{validationErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1 uppercase tracking-wider">Password *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-shadow ${
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
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-[10px] text-rose-450">{validationErrors.password}</p>
              )}

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

                      if (formData.password !== '') {
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1 uppercase tracking-wider">Confirm Password *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-shadow ${
                    validationErrors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none focus:text-slate-350"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-[10px] text-rose-450">{validationErrors.confirmPassword}</p>
              )}

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
                      <span className="text-rose-400 font-semibold">✗ Passwords Do Not Match</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="flex items-start gap-2 pt-1 text-slate-300">
              <input
                id="terms"
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <label htmlFor="terms" className="text-xs leading-normal select-none">
                I agree to the{' '}
                <Link to="/terms" className="text-sky-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-sky-400 hover:underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading || !isFormValid}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'} <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>
          
          <p className="mt-4 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-sky-400 hover:text-sky-300">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Left Image/Animation Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-800 flex-col items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449844908441-8829872d2607?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-900/80 to-indigo-900/90" />
        
        <div className="relative z-10 text-center text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/20"
          >
            <ShieldCheck className="w-12 h-12 text-sky-300" />
          </motion.div>
          <h2 className="text-4xl font-bold mb-4">Join the Network</h2>
          <p className="text-lg text-sky-200/80 max-w-md mx-auto">
            Experience the future of road safety. Your journey to smarter, safer travel starts here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
