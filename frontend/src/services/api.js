import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hl_token');
      localStorage.removeItem('hl_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
};

// ─── Properties ──────────────────────────────────────────────
export const propertyAPI = {
  search:     (params) => api.get('/properties/search', { params }),
  featured:   ()       => api.get('/properties/featured'),
  getOne:     (id)     => api.get(`/properties/${id}`),
  getMyList:  ()       => api.get('/properties/my-listings'),
  getPending: ()       => api.get('/properties/pending'),
  approve:    (id)     => api.post(`/properties/${id}/approve`),
  reject:     (id, reason) => api.post(`/properties/${id}/reject`, reason ? { reason } : {}),
  create:     (data)   => api.post('/properties', data),
  update:     (id, d)  => api.put(`/properties/${id}`, d),
  remove:     (id)     => api.delete(`/properties/${id}`),
};

// ─── Files ───────────────────────────────────────────────────
export const fileAPI = {
  uploadSingle: (propertyId, file, category = 'images') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    return api.post(`/files/upload/property/${propertyId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadBatch: (propertyId, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return api.post(`/files/upload/property/${propertyId}/batch`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (fileUrl) => api.delete('/files', { params: { fileUrl } }),
};

// ─── Transactions ─────────────────────────────────────────────
export const transactionAPI = {
  initiate: (data)      => api.post('/transactions/initiate', data),
  verify:   (reference) => api.get(`/transactions/verify/${reference}`),
  getMine:  ()          => api.get('/transactions/my'),
  getOne:   (id)        => api.get(`/transactions/${id}`),
};

// ─── States / LGAs ───────────────────────────────────────────
export const locationAPI = {
  getStates: ()          => api.get('/states'),
  getLgas:   (stateId)   => api.get(`/states/${stateId}/lgas`),
};

export default api;
