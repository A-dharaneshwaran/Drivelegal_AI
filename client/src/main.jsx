import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import axios from 'axios';

// Global Axios Interceptor for debugging network issues on mobile/APK
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('GLOBAL AXIOS ERROR:', error);
    console.error('Response:', error.response);
    console.error('Request:', error.request);

    let message = error.message;

    if (error.response?.data?.message) {
      message = error.response.data.message;
    }

    alert(`[API ERROR]\n${message}`);

    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
