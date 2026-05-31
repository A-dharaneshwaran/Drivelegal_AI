import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * AuthMessage — A centralized component displaying a consistent, premium
 * secure access notice when unauthenticated users attempt to access protected features.
 * Automatically adapts if the session has expired.
 */
const AuthMessage = ({ expired: expiredProp }) => {
  const location = useLocation();
  const isExpired = expiredProp || location.state?.expired || new URLSearchParams(location.search).get('expired') === 'true';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-sky-500/10 border border-sky-500/20 text-sky-200 p-5 rounded-2xl text-sm mb-6 text-center max-w-md mx-auto backdrop-blur-sm shadow-lg shadow-sky-500/5"
    >
      <div className="text-base font-bold text-white mb-2 flex items-center justify-center gap-2">
        <span>🔒</span> {isExpired ? 'Session Expired' : 'Secure Access'}
      </div>
      <p className="text-slate-300 leading-relaxed font-medium">
        {isExpired 
          ? 'Your session has expired. Please sign in again to access your dashboard, compliance scores, reports, and personalized driving insights.'
          : 'Please sign in to access your dashboard, compliance scores, reports, and personalized driving insights.'}
      </p>
    </motion.div>
  );
};

export default AuthMessage;
