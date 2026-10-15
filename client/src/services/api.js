import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error, fallback = 'Unable to load data from the server.') {
  if (!error?.response) {
    return 'Cannot reach the API. Confirm the backend is running and MongoDB is connected.';
  }
  if (error.response.status === 503) {
    return error.response.data?.data?.database === 'unavailable'
      ? 'The database is unavailable. Job data cannot be loaded until MongoDB reconnects.'
      : (error.response.data?.message || 'The service is temporarily unavailable.');
  }
  return error.response.data?.message || fallback;
}

export default api;
