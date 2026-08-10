import axios from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Placeholder refresh token API call
const mockRefreshTokenApi = async (): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dummyToken = 'refreshed-jwt-token-' + Date.now();
      resolve(dummyToken);
    }, 500);
  });
};

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

    // 401 handling + Automatic refresh token placeholder
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = await mockRefreshTokenApi();
        localStorage.setItem('ormp_auth_token', token);
        isRefreshing = false;
        processQueue(null, token);

        originalRequest.headers['Authorization'] = 'Bearer ' + token;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        // Clear local storage auth keys and trigger custom logout event
        localStorage.removeItem('ormp_auth_token');
        localStorage.removeItem('ormp_user');
        window.dispatchEvent(new Event('ormp_logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(parsedError);
  }
);

export default api;
