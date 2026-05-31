import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

/**
 * ProtectedRoute — redirects unauthenticated or expired users to /login.
 * Preserves the attempted URL in `state.from` so Login can redirect back after sign-in.
 */
const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    // Check token expiration locally
    const decoded = parseJwt(token);
    if (decoded) {
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-state-changed'));
        setIsExpired(true);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsChecking(false);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#02050c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, but remember where the user was trying to go
    return <Navigate to="/login" state={{ from: location, expired: isExpired }} replace />;
  }

  return children;
};

export default ProtectedRoute;
