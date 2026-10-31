import axios from 'axios';

const apiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';

const api = axios.create({
  baseURL: `${apiOrigin}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token from localStorage as fallback
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stock_manager_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format errors and handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';

    // If 401 and not already on /login, clear local auth
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('stock_manager_token');
      localStorage.removeItem('stock_manager_user');
      // Let AuthContext handle redirect
    }

    return Promise.reject(new Error(message));
  }
);

export default api;

