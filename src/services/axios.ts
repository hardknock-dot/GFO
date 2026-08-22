import axios from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});



api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ormp_auth_token');
    const companyId = localStorage.getItem('ormp_active_company') || 'lam-research';

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Company-ID'] = companyId;

    if (import.meta.env.VITE_ENABLE_LOGGING === 'true') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.VITE_ENABLE_LOGGING === 'true') {
      console.log(`[API Response] Success ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Parse the error globally
    const parsedError: ApiError = {
      message: 'An unexpected error occurred.',
      status: error.response?.status,
      code: error.code,
    };

    if (error.code === 'ECONNABORTED') {
      parsedError.message = 'Request timed out. Please check your network connection.';
    } else if (error.response) {
      const data = error.response.data;
      parsedError.message = data?.message || data?.detail || `Server error (${error.response.status})`;
      parsedError.details = data;
    } else if (error.request) {
      parsedError.message = 'No response received from the server. Please check if backend is running.';
    } else {
      parsedError.message = error.message || 'Network request failed.';
    }

    if (import.meta.env.VITE_ENABLE_LOGGING === 'true') {
      console.error('[API Error]:', parsedError.message, error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Do not handle logout loop for login endpoint itself
      if (!originalRequest.url?.includes('/auth/login')) {
        localStorage.removeItem('ormp_auth_token');
        localStorage.removeItem('ormp_user');
        localStorage.removeItem('ormp_active_company');
        window.dispatchEvent(new Event('ormp_logout'));
      }

      return Promise.reject(parsedError);
    }

    return Promise.reject(parsedError);
  }
);

export default api;
