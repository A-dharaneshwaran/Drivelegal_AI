import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Fines from './pages/Fines';
import DriverLearningCenter from './pages/DriverLearningCenter';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentVault from './pages/DocumentVault';
import ReportArchive from './pages/ReportArchive';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import RoutePlanner from './pages/RoutePlanner';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import axios from 'axios';

// Add response interceptor to handle auto logout on expired JWT (401/403 errors)
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-state-changed'));
      // Redirect to login with ?expired=true parameter
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans overflow-x-hidden">
        <Navbar />
        <Routes>
          {/* Public routes — accessible without login */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected routes — redirect to /login if no JWT */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/route-planner" element={<ProtectedRoute><RoutePlanner /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/fines" element={<ProtectedRoute><Fines /></ProtectedRoute>} />
          <Route path="/learning-center" element={<ProtectedRoute><DriverLearningCenter /></ProtectedRoute>} />
          <Route path="/vault" element={<ProtectedRoute><DocumentVault /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportArchive /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
        {/* Chatbot: dispatches ai-chat-success event for Dashboard telemetry refresh */}
        <Chatbot onChatSuccess={() => window.dispatchEvent(new CustomEvent('ai-chat-success'))} />
      </div>
    </Router>
  );
}

export default App;

