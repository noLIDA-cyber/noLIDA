const API_BASE = (window.NOLIDA_API_BASE
  ? `${window.NOLIDA_API_BASE.replace(/\/$/, '')}/api/${window.NOLIDA_API_VERSION || 'v1'}`
  : `/api/${window.NOLIDA_API_VERSION || 'v1'}`);
const FRONTEND_URL = window.NOLIDA_FRONTEND_URL || 'http://localhost:3001';

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const controller = new AbortController();
    const timeout = options.timeout || 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 && !options.skipRefresh) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const retryConfig = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        };
        const retryResponse = await fetch(url, {
          ...retryConfig,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return await parseResponse(retryResponse, url);
      }
    }

    return await parseResponse(response, url);
  } catch (error) {
    console.error('API Error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
};

const parseResponse = async (response, url) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (response.status === 404) {
      throw new Error(`API endpoint not found: ${url}. Check that public/config.js has the right NOLIDA_API_BASE value.`);
    }
    const text = await response.text().catch(() => '');
    throw new Error(`Expected JSON from API, got ${contentType || 'non-JSON'} (status ${response.status}). Body starts with: ${text.slice(0, 60)}`);
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
};

const tryRefreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.success && data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

const apiGet = (endpoint) => api(endpoint);
const apiPost = (endpoint, body) => api(endpoint, { method: 'POST', body });
const apiPut = (endpoint, body) => api(endpoint, { method: 'PUT', body });
const apiPatch = (endpoint, body) => api(endpoint, { method: 'PATCH', body });
const apiDelete = (endpoint) => api(endpoint, { method: 'DELETE' });

const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const setCurrentUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

const getRedirectUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('redirect') || '/dashboard';
};

export {
  api,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  setTokens,
  clearTokens,
  getCurrentUser,
  setCurrentUser,
  isAuthenticated,
  getRedirectUrl,
  API_BASE,
  FRONTEND_URL,
};