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
      const hadToken = localStorage.getItem('hl_token');
      localStorage.removeItem('hl_token');
      localStorage.removeItem('hl_user');
      // Only redirect to login when the user was actually authenticated
      // (token existed). Avoids redirecting unauthenticated users who call
      // public endpoints that are misconfigured or temporarily unavailable.
      if (hadToken) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────
export const authAPI = {
  register:   (data)  => api.post('/auth/register', data),
  login:      (data)  => api.post('/auth/login', data),
  getMe:      ()      => api.get('/users/me'),
  updateMe:   (data)  => api.put('/users/me', data),
  checkPhone: (phone) => api.get('/users/check-phone', { params: { phone } }),
};

// ─── Properties ──────────────────────────────────────────────
export const propertyAPI = {
  search:     (params) => api.get('/properties/search', { params }),
  featured:   ()       => api.get('/properties/featured'),
  getOne:     (id)     => api.get(`/properties/${id}`),
  getMyList:  ()       => api.get('/properties/my-listings'),
  getPending:  ()       => api.get('/properties/pending',  { params: { _t: Date.now() } }),
  getRejected: ()       => api.get('/properties/rejected', { params: { _t: Date.now() } }),
  approve:     (id)     => api.post(`/properties/${id}/approve`),
  reject:      (id, reason) => api.post(`/properties/${id}/reject`, reason ? { reason } : {}),
  create:     (data)   => api.post('/properties', data),
  update:     (id, d)  => api.put(`/properties/${id}`, d),
  remove:     (id)     => api.delete(`/properties/${id}`),
  registerFiles: (id, fileUrls) => api.post(`/properties/${id}/files`, fileUrls),
  publish:       (id)          => api.post(`/properties/${id}/publish`),
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

// ─── Subscriptions ───────────────────────────────────────────
export const subscriptionAPI = {
  listPlans:      ()             => api.get('/subscriptions/plans'),
  subscribe:      (data)         => api.post('/subscriptions', data),
  getMine:        ()             => api.get('/subscriptions/my'),
  getMyLoans:     ()             => api.get('/subscriptions/loans/my'),
  repayLoan:      (loanId)       => api.post(`/subscriptions/loans/${loanId}/repay`),
  getLoanProgram: ()             => api.get('/subscriptions/loan-program/my'),
  activeCheck:    ()             => api.get('/subscriptions/active-check'),
  verify:         (reference)    => api.get(`/subscriptions/verify/${reference}`),
  verifyRepayment: (reference)   => api.get(`/subscriptions/loans/verify-repayment/${reference}`),
};

// ─── Reservations ────────────────────────────────────────────
export const reservationAPI = {
  reserve:          (propertyId) => api.post(`/properties/${propertyId}/reserve`),
  getMine:          ()           => api.get('/reservations/my'),
  getForProperty:   (propertyId) => api.get(`/properties/${propertyId}/reservation`),
  getByReference:   (reference)  => api.get(`/reservations/by-reference/${reference}`),
};

// ─── Reputation ──────────────────────────────────────────────
export const reputationAPI = {
  getAgentReputation: (agentId)        => api.get(`/agents/${agentId}/reputation`),
  submitFeedback:     (agentId, data)  => api.post(`/agents/${agentId}/feedback`, data),
};

// ─── Commissions ─────────────────────────────────────────────
export const commissionAPI = {
  getMine: () => api.get('/transactions/commissions/my'),
};

// ─── States / LGAs ───────────────────────────────────────────
export const locationAPI = {
  getStates: ()          => api.get('/states'),
  getLgas:   (stateId)   => api.get(`/states/${stateId}/lgas`),
};

export default api;
