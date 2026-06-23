/**
 * API Client — Axios wrapper for Life Saver backend
 */
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — unwrap data
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.detail || err.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

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

export const simulateRescue = (extra_hours) =>
  api.get('/rescue/simulate', { params: { extra_hours } });

// --- Dashboard ---
export const getDashboard = () =>
  api.get('/dashboard/');

// --- Debug ---
export const seedDemo = () =>
  api.post('/debug/seed');

export const resetData = () =>
  api.post('/debug/reset');

export default api;
