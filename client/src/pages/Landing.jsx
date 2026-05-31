import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Navigation, Brain, Activity, ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="glass p-8 rounded-2xl hover:bg-slate-800/50 transition-colors border border-slate-700/50 group"
  >
    <div className="w-14 h-14 bg-slate-800/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      <Icon className="w-7 h-7 text-sky-400" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{desc}</p>
  </motion.div>
);

const GitHubIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedInIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Landing = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Contact form state
  const [formData, setFormData] = useState({ category: '', subject: '', message: '' });
  const [formErrors, setFormErrors] = useState({});
  const [formStatus, setFormStatus] = useState(null); // 'success' | null

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('auth-state-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.category) errors.category = 'Category is required.';
    if (!formData.subject.trim()) errors.subject = 'Subject is required.';
    if (!formData.message.trim()) errors.message = 'Message is required.';
    return errors;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    const subject = encodeURIComponent(`[${formData.category}] ${formData.subject}`);
    const body = encodeURIComponent(`Category: ${formData.category}\nSubject: ${formData.subject}\n\nMessage:\n${formData.message}`);
    window.location.href = `mailto:Drivelegalai@gmail.com?subject=${subject}&body=${body}`;
    setFormStatus('success');
    setFormData({ category: '', subject: '', message: '' });
    setTimeout(() => setFormStatus(null), 6000);
  };

  return (
    <div className="pt-20">

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/40 via-slate-900 to-slate-900 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-40 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 border border-sky-500/30">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-sm font-medium text-sky-200">AI-Powered Road Safety</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-8 tracking-tight">
              Navigate with <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">Intelligence &amp; Safety</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
              DriveLegal is your next-generation travel companion. Real-time hazard detection, AI route optimization, and instant emergency response in one seamless platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-slate-900 font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                  Start Safe Driving <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link to={isAuthenticated ? "/route-planner" : "/login?redirect=/route-planner"}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl glass text-white font-semibold flex items-center justify-center gap-2 hover:bg-slate-800/80 transition-colors">
                  🗺 View Live Map
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 border-t border-slate-800">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Built for the Modern Driver</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to ensure a safe, efficient, and legally compliant journey.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard delay={0.1} icon={Brain} title="AI Travel Assistant"
            desc="Gemini-powered chatbot that provides instant answers on traffic laws, safe routes, and travel tips." />
          <FeatureCard delay={0.2} icon={Navigation} title="Smart Routing"
            desc="Avoid hazards with real-time routing that prioritizes safety over just speed." />
          <FeatureCard delay={0.3} icon={Shield} title="Emergency SOS"
            desc="One-tap emergency response system that instantly notifies your contacts and local authorities." />
          <FeatureCard delay={0.4} icon={Activity} title="Safety Analytics"
            desc="Track your driving habits and receive AI-driven feedback to improve your road safety score." />
        </div>
      </div>

      {/* ── Contact & Support Section ─────────────────────────────────────── */}
      <section id="contact" className="border-t border-slate-800 bg-[#02050c]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">

          {/* Two-column layout — stacks on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-12 items-start">

            {/* ── LEFT COLUMN: Support Info (40%) ── */}
            <div className="lg:col-span-4 space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-3"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-[10px] font-black text-sky-300 uppercase tracking-widest">Support Portal</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Contact &amp; Support</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Need help with DriveLegal AI? We're here to assist with platform support, route planning, compliance guidance, and feature requests.
                </p>
              </motion.div>

              {/* Support Category Cards */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="space-y-3"
              >
                {[
                  {
                    icon: '🛣️',
                    title: 'Route Planner Support',
                    desc: 'Questions regarding route analysis, travel safety, and route intelligence.'
                  },
                  {
                    icon: '📄',
                    title: 'Document Vault Support',
                    desc: 'Help with OCR extraction, uploads, renewals, and document verification.'
                  },
                  {
                    icon: '⚖️',
                    title: 'Fine & Challan Support',
                    desc: 'Questions regarding challan detection, reports, and compliance tracking.'
                  },
                  {
                    icon: '👤',
                    title: 'Account Assistance',
                    desc: 'Profile issues, authentication problems, notification settings, and preferences.'
                  },
                  {
                    icon: '💡',
                    title: 'Feature Requests & Feedback',
                    desc: 'Suggest improvements, report bugs, and share ideas.'
                  }
                ].map((item) => (
                  <div
                    key={item.title}
                    className="glass p-4 rounded-xl border border-slate-800/80 hover:bg-slate-800/30 transition-all flex items-start gap-3.5"
                  >
                    <span className="text-xl flex-shrink-0 select-none mt-0.5">{item.icon}</span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white leading-tight">{item.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Compact Contact Details */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-800/60"
              >
                <a
                  href="mailto:Drivelegalai@gmail.com"
                  className="glass p-3 rounded-xl border border-slate-800/80 hover:border-sky-500/30 hover:bg-slate-800/20 transition-all flex flex-col items-center text-center group"
                >
                  <span className="text-lg mb-1 group-hover:scale-110 transition-transform">📧</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Email</span>
                  <span className="text-[11px] text-sky-400 font-bold truncate max-w-full">Drivelegalai@gmail.com</span>
                </a>
                <div className="glass p-3 rounded-xl border border-slate-800/80 flex flex-col items-center text-center">
                  <span className="text-lg mb-1">📍</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Location</span>
                  <span className="text-[11px] text-slate-300 font-bold">Chennai, Tamil Nadu, India</span>
                </div>
                <div className="glass p-3 rounded-xl border border-slate-800/80 flex flex-col items-center text-center">
                  <span className="text-lg mb-1">⏱️</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Response Time</span>
                  <span className="text-[11px] text-slate-300 font-bold">Within 24 Hours</span>
                </div>
              </motion.div>
            </div>

            {/* ── RIGHT COLUMN: Contact Form (60%) ── */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:col-span-6 rounded-3xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm p-8 shadow-2xl space-y-6"
            >
              <div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">Send a Message</h3>
                <p className="text-sm text-slate-400 mt-1">Tell us how we can help and we'll get back to you.</p>
              </div>

              {formStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2"
                >
                  <span className="font-bold">✓</span>
                  Your email client has been opened. Thank you for reaching out!
                </motion.div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>

                {/* Category Dropdown */}
                <div>
                  <label htmlFor="contact-category" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="category"
                    id="contact-category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className={`w-full bg-slate-800/60 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 transition-all ${
                      formErrors.category ? 'border-rose-500/60 focus:ring-rose-500/20' : 'border-slate-700/60 focus:ring-sky-500/30 focus:border-sky-500/50'
                    }`}
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">Select a support category</option>
                    <option value="Route Planner Support" className="bg-slate-900 text-white">Route Planner Support</option>
                    <option value="Document Vault Support" className="bg-slate-900 text-white">Document Vault Support</option>
                    <option value="Fine & Challan Support" className="bg-slate-900 text-white">Fine &amp; Challan Support</option>
                    <option value="Account Assistance" className="bg-slate-900 text-white">Account Assistance</option>
                    <option value="Feature Request" className="bg-slate-900 text-white">Feature Request</option>
                    <option value="General Inquiry" className="bg-slate-900 text-white">General Inquiry</option>
                  </select>
                  {formErrors.category && <p className="mt-1.5 text-[11px] text-rose-400 font-semibold">{formErrors.category}</p>}
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="contact-subject" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    id="contact-subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                    placeholder="Brief summary of your request"
                    className={`w-full bg-slate-800/60 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                      formErrors.subject ? 'border-rose-500/60 focus:ring-rose-500/20' : 'border-slate-700/60 focus:ring-sky-500/30 focus:border-sky-500/50'
                    }`}
                  />
                  {formErrors.subject && <p className="mt-1.5 text-[11px] text-rose-400 font-semibold">{formErrors.subject}</p>}
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Message <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    id="contact-message"
                    rows={5}
                    value={formData.message}
                    onChange={handleFormChange}
                    placeholder="Describe your question or feedback in detail…"
                    className={`w-full bg-slate-800/60 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 resize-none transition-all ${
                      formErrors.message ? 'border-rose-500/60 focus:ring-rose-500/20' : 'border-slate-700/60 focus:ring-sky-500/30 focus:border-sky-500/50'
                    }`}
                  />
                  {formErrors.message && <p className="mt-1.5 text-[11px] text-rose-400 font-semibold">{formErrors.message}</p>}
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-sm shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>Send Message</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <p className="text-center text-[10px] text-slate-600 mt-1">
                  Clicking "Send Message" will open your default email client.
                </p>
              </form>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Creator & Project Links Section ──────────────────────────────── */}
      <section className="border-t border-slate-800 bg-[#02050c]/20 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-6 sm:p-8 border border-slate-800/80 bg-slate-900/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 hover:border-sky-500/20 transition-all duration-300 group"
          >
            {/* Top decorative blue line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 to-indigo-600 opacity-60" />

            {/* Left: Creator Info */}
            <div className="text-center md:text-left space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight uppercase">Project Creator</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/35 text-[10px] font-black text-amber-400 uppercase tracking-wider select-none">
                  🏆 Hackathon Project
                </span>
                <span className="text-sm text-slate-400 font-medium">
                  Built and maintained by <strong className="text-slate-300 font-semibold">Dharaneshwaran</strong>
                </span>
              </div>
            </div>

            {/* Right: Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              {/* GitHub Button */}
              <a
                href="https://github.com/A-dharaneshwaran"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-white font-extrabold text-sm hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 group/btn"
              >
                <GitHubIcon className="w-5 h-5 text-slate-300 group-hover/btn:text-white transition-colors" />
                <span>View GitHub Profile</span>
              </a>

              {/* LinkedIn Button */}
              <a
                href="https://www.linkedin.com/in/dharaneshwarana"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600/90 to-blue-700/90 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              >
                <LinkedInIcon className="w-5 h-5 text-white" />
                <span>Connect on LinkedIn</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-12 text-center text-slate-500">
        <p className="text-sm">© 2026 DriveLegal AI. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default Landing;
