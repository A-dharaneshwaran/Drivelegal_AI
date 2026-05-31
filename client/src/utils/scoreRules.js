export const getTravelReadiness = (score) => {
  if (score >= 90) {
    return {
      label: 'READY TO TRAVEL',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      ring: '#10b981',
      badgeStyle: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400',
      statusDot: 'bg-emerald-400'
    };
  }
  if (score >= 70) {
    return {
      label: 'CAUTION',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      ring: '#f59e0b',
      badgeStyle: 'bg-amber-500/10 border border-amber-500/30 text-amber-400',
      statusDot: 'bg-amber-400'
    };
  }
  if (score >= 50) {
    return {
      label: 'REVIEW DOCUMENTS',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      ring: '#f97316',
      badgeStyle: 'bg-orange-500/10 border border-orange-500/30 text-orange-450',
      statusDot: 'bg-orange-400'
    };
  }
  return {
    label: 'DO NOT TRAVEL',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    ring: '#f43f5e',
    badgeStyle: 'bg-rose-500/10 border border-rose-500/30 text-rose-400',
    statusDot: 'bg-rose-400'
  };
};

export const getComplianceStatus = (score) => {
  if (score >= 90) {
    return {
      label: 'Excellent',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      ring: '#10b981',
      badgeStyle: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
      statusDot: 'bg-emerald-400'
    };
  }
  if (score >= 70) {
    return {
      label: 'Good',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      ring: '#38bdf8',
      badgeStyle: 'bg-sky-500/10 border border-sky-500/20 text-sky-400',
      statusDot: 'bg-sky-400'
    };
  }
  if (score >= 50) {
    return {
      label: 'Average',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      ring: '#f59e0b',
      badgeStyle: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
      statusDot: 'bg-amber-400'
    };
  }
  return {
    label: 'At Risk',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    ring: '#f43f5e',
    badgeStyle: 'bg-rose-500/10 border border-rose-500/20 text-rose-400',
    statusDot: 'bg-rose-400'
  };
};

export const getViolationRisk = (score) => {
  if (score < 30) {
    return {
      label: 'Very Low',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      ring: '#10b981',
      badgeStyle: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
      statusDot: 'bg-emerald-400',
      badge: 'bg-emerald-500/10 border border-emerald-500/20',
      dot: 'bg-emerald-400'
    };
  }
  if (score < 60) {
    return {
      label: 'Moderate',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      ring: '#f59e0b',
      badgeStyle: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
      statusDot: 'bg-amber-400',
      badge: 'bg-amber-500/10 border border-amber-500/20',
      dot: 'bg-amber-400'
    };
  }
  return {
    label: 'Extreme Danger',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    ring: '#f43f5e',
    badgeStyle: 'bg-rose-500/10 border border-rose-500/20 text-rose-400',
    statusDot: 'bg-rose-400',
    badge: 'bg-rose-500/10 border border-rose-500/20',
    dot: 'bg-rose-400'
  };
};

export const getAwarenessLevel = (score) => {
  if (score >= 80) {
    return {
      label: 'Elite Awareness',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      ring: '#10b981',
      badgeStyle: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
      statusDot: 'bg-emerald-400'
    };
  }
  if (score >= 50) {
    return {
      label: 'Proactive',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      ring: '#38bdf8',
      badgeStyle: 'bg-sky-500/10 border border-sky-500/20 text-sky-400',
      statusDot: 'bg-sky-400'
    };
  }
  if (score >= 20) {
    return {
      label: 'Basic Safety',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      ring: '#f59e0b',
      badgeStyle: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
      statusDot: 'bg-amber-400'
    };
  }
  return {
    label: 'Unaware',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    ring: '#f43f5e',
    badgeStyle: 'bg-rose-500/10 border border-rose-500/20 text-rose-400',
    statusDot: 'bg-rose-400'
  };
};
