import axios from 'axios';

// Smart baseURL determination:
let rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
if (rawApiUrl && !rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
  rawApiUrl = `https://${rawApiUrl}`;
}

const api = axios.create({
  baseURL: rawApiUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hireflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect to login if /api/auth/me specifically failed with 401
    // Never hijack login/register forms or third-party service errors (like Brevo 401)
    const requestUrl = err.config?.url || '';
    const isAuthVerify = requestUrl.includes('/api/auth/me');
    
    if (err.response?.status === 401 && isAuthVerify) {
      localStorage.removeItem('hireflow_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
