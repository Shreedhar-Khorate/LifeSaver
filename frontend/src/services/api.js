import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor — unwrap data
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.detail || err.message || 'Something went wrong';
    console.error('API Error:', message);
    
    // Auto-logout on 401 Unauthorized
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login') && !err.config.url.includes('/auth/signup')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.reload();
    }
    
    return Promise.reject(new Error(message));
  }
);

// --- Auth & Profile ---
export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password });

export const registerUser = (name, email, password) =>
  api.post('/auth/signup', { name, email, password });

export const getProfile = () =>
  api.get('/auth/me');

export const updateProfile = (data) =>
  api.patch('/auth/profile', data);

// --- Tasks ---
export const getTasks = (status) =>
  api.get('/tasks/', { params: status ? { status } : {} });

export const createTask = (data) =>
  api.post('/tasks/', data);

export const parseTasks = (text) =>
  api.post('/tasks/parse', { text });

export const updateTask = (id, data) =>
  api.patch(`/tasks/${id}`, data);

export const deleteTask = (id) =>
  api.delete(`/tasks/${id}`);

export const decomposeTask = (id) =>
  api.post(`/tasks/${id}/decompose`);

// --- Schedule ---
export const getTodaySchedule = () =>
  api.get('/schedule/today');

export const generateSchedule = (available_hours) =>
  api.post('/schedule/generate', { available_hours });

// --- Rescue ---
export const runRescue = (hours_remaining) =>
  api.post('/rescue/', { hours_remaining });

export const simulateRescue = (extra_hours, hours_remaining) =>
  api.get('/rescue/simulate', { params: { extra_hours, hours_remaining } });

// --- Dashboard ---
export const getDashboard = () =>
  api.get('/dashboard/');

// --- Debug ---
const debugHeaders = () => ({
  'X-Debug-Key': import.meta.env.VITE_DEBUG_KEY || '',
});

export const seedDemo = () =>
  api.post('/debug/seed', {}, { headers: debugHeaders() });

export const resetData = () =>
  api.post('/debug/reset', {}, { headers: debugHeaders() });

export default api;

