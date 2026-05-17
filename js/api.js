const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// In production, change the fallback URL to your actual deployed backend URL (e.g. https://axiom-backend.onrender.com/api)
const API_BASE = isLocal ? 'http://localhost:8080/api' : 'https://axiom-backend-g58i.onrender.com/api';

const api = {

  async request(endpoint, options = {}) {

    const token = localStorage.getItem('admin_token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE}${endpoint}`,
      {
        ...options,
        headers
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  },

  async requestMultipart(endpoint, formData, method = 'POST') {

    const token = localStorage.getItem('admin_token');

    const headers = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE}${endpoint}`,
      {
        method,
        headers,
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  },

  // PUBLIC
  getMedia: (page = 0, size = 12) =>
    api.request(`/public/media?page=${page}&size=${size}`),

  getMediaById: (id) =>
    api.request(`/public/media/${id}`),

  getFeatured: () =>
    api.request('/public/media/featured'),

  getTrending: () =>
    api.request('/public/media/trending'),

  incrementView: (id) =>
    api.request(`/public/media/${id}/view`, { method: 'POST' }),

  toggleLike: (id) =>
    api.request(`/public/media/${id}/like`, { method: 'POST' }),

  hasLiked: (id) =>
    api.request(`/public/media/${id}/liked`),

  getComments: (id) =>
    api.request(`/public/media/${id}/comments`),

  addComment: (id, data) =>
    api.request(`/public/media/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getCategories: () =>
    api.request('/public/categories'),

  getTestimonials: () =>
    api.request('/public/testimonials'),

  // AUTH
  login: (creds) =>
    api.request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(creds)
    }),

  verify: () =>
    api.request('/admin/auth/verify'),

  // ADMIN MEDIA
  adminGetMedia: (page = 0) =>
    api.request(`/admin/media?page=${page}`),

  adminCreateMedia: (formData) =>
    api.requestMultipart('/admin/media', formData, 'POST'),

  adminUpdateMedia: (id, formData) =>
    api.requestMultipart(`/admin/media/${id}`, formData, 'PUT'),

  adminDeleteMedia: (id) =>
    api.request(`/admin/media/${id}`, {
      method: 'DELETE'
    }),

  // DASHBOARD
  getDashboardStats: () =>
    api.request('/admin/dashboard/stats'),

  // CATEGORIES
  adminGetCategories: () =>
    api.request('/admin/categories'),

  adminCreateCategory: (data) =>
    api.request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  adminDeleteCategory: (id) =>
    api.request(`/admin/categories/${id}`, {
      method: 'DELETE'
    }),

  // TESTIMONIALS
  adminGetTestimonials: () =>
    api.request('/admin/testimonials'),

  adminCreateTestimonial: (data) =>
    api.request('/admin/testimonials', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  adminUpdateTestimonial: (id, data) =>
    api.request(`/admin/testimonials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  adminDeleteTestimonial: (id) =>
    api.request(`/admin/testimonials/${id}`, {
      method: 'DELETE'
    })
};

export default api;