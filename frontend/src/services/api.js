import axios from 'axios';
import queryClient from './queryClient';

const apiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';

const api = axios.create({
  baseURL: `${apiOrigin}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const invalidateForMutation = (url = '') => {
  const path = url.split('?')[0];
  const resourcePrefixes = [
    {
      match: /^\/(products|categories)(\/|$)/,
      keys: ['products', 'categories', 'reports/dashboard', 'reports/stock-history'],
    },
    {
      match: /^\/karigars(\/|$)/,
      keys: ['karigars', 'attendance', 'reports/dashboard', 'reports/karigar-materials'],
    },
    {
      match: /^\/work-entries(\/|$)/,
      keys: [
        'work-entries',
        'products',
        'reports/dashboard',
        'reports/stock-history',
        'reports/karigar-materials',
        'reports/customer-work',
      ],
    },
    {
      match: /^\/returns(\/|$)/,
      keys: [
        'returns',
        'work-entries',
        'products',
        'reports/dashboard',
        'reports/stock-history',
        'reports/karigar-materials',
        'reports/customer-work',
      ],
    },
    {
      match: /^\/attendance(\/|$)/,
      keys: ['attendance', 'reports/dashboard'],
    },
    {
      match: /^\/settings(\/|$)/,
      keys: ['settings'],
    },
  ];

  const matched = resourcePrefixes.find(({ match }) => match.test(path));
  matched?.keys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: ['api', key] });
  });
};

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
  (response) => {
    const method = response.config.method?.toLowerCase();
    if (method && method !== 'get' && method !== 'head' && method !== 'options') {
      invalidateForMutation(response.config.url);
    }
    return response;
  },
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

