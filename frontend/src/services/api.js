import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  timeout: 15000,
  // Do NOT set a global Content-Type here.
  // Axios sets it automatically based on the body type:
  //   plain object  → 'application/json'
  //   FormData      → 'multipart/form-data; boundary=...'
  // A hardcoded 'application/json' default overrides the FormData detection and
  // strips the multipart boundary — causing Spring to throw MultipartException.
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 502/503/504 (service cold-starting after a deploy/restart) and 401 globally.
// On a gateway-unavailable response the interceptor waits 2 s and retries the original
// request exactly once — the user just sees the spinner run a little longer and never
// sees the "service temporarily unavailable" error. If the retry also fails the error
// propagates normally. The _retried flag on the config prevents infinite retry loops.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;

    // Only auto-retry GET requests (idempotent). POSTs/PUTs/DELETEs must NOT be
    // retried automatically — if the server processed the request but the gateway
    // timed out before sending the response back, a blind retry would duplicate the
    // operation (e.g. create two properties, two orders, etc.).
    // Non-GET 503s are handled at the gateway level by its own Retry filter.
    // Pass _noRetry: true in the request config to suppress this retry for
    // background polling requests whose errors are already silently ignored.
    if (
      (status === 502 || status === 503 || status === 504) &&
      !err.config._retried &&
      !err.config._noRetry &&
      err.config.method?.toLowerCase() === 'get'
    ) {
      err.config._retried = true;
      await new Promise((r) => setTimeout(r, 2000));
      return api.request(err.config);
      // If the retry succeeds  → response returned normally to the caller.
      // If the retry also fails → error re-enters this interceptor with
      //   _retried=true so we don't retry again, then falls through below.
    }

    if (status === 401) {
      // Requests made with _suppressGlobalLogout:true (e.g. background refreshUser)
      // should NOT trigger an immediate redirect — let the caller handle it silently.
      if (err.config?._suppressGlobalLogout) {
        return Promise.reject(err);
      }
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
  register:         (data)  => api.post('/auth/register', data),
  login:            (data)  => api.post('/auth/login', data),
  // config is optional — pass { _suppressGlobalLogout: true } for background checks
  getMe:            (config) => api.get('/users/me', config),
  updateMe:         (data)  => api.put('/users/me', data),
  changePassword:   (data)  => api.post('/users/me/change-password', data),
  verifyIdentity:   (data)  => api.post('/users/me/verify-identity', data),
  checkPhone:       (phone) => api.get('/users/check-phone', { params: { phone } }),
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
    // Do NOT set Content-Type manually — axios must set it automatically so the
    // multipart boundary is included. Without the boundary, Spring's parser throws
    // and drops the connection, causing a 502 at the gateway.
    // Timeout: 5 minutes — must exceed the gateway's TimeLimiter (300 s) so that
    // the client never drops the connection before the server finishes watermarking
    // the image and uploading it to Cloudflare R2.
    return api.post(`/files/upload/property/${propertyId}`, fd, { timeout: 300000 });
  },
  uploadBatch: (propertyId, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    // Same as uploadSingle — do NOT set Content-Type; let axios set it with the boundary.
    return api.post(`/files/upload/property/${propertyId}/batch`, fd, {
      timeout: 180000, // 3 minutes — large batches can take a while to reach R2
    });
  },
  remove: (fileUrl) => api.delete('/files', { params: { fileUrl } }),
};

// ─── Transactions ─────────────────────────────────────────────
export const transactionAPI = {
  initiate: (data)      => api.post('/transactions/initiate', data),
  verify:   (reference) => api.get(`/transactions/verify/${reference}`),
  getMine:  ()          => api.get('/transactions/my'),
  getAll:   ()          => api.get('/transactions/all'),
  getOne:   (id)        => api.get(`/transactions/${id}`),
};

// ─── Subscriptions ───────────────────────────────────────────
export const subscriptionAPI = {
  listPlans:      ()             => api.get('/subscriptions/plans'),
  subscribe:      (data)         => api.post('/subscriptions', data),
  getMine:        ()             => api.get('/subscriptions/my'),
  getMyLoans:      ()             => api.get('/subscriptions/loans/my'),
  getAllLoans:      ()             => api.get('/subscriptions/loans/all'),
  repayLoan:      (loanId) => api.post(`/subscriptions/loans/${loanId}/repay`),
  getLoanProgram: ()             => api.get('/subscriptions/loan-program/my'),
  activeCheck:    ()             => api.get('/subscriptions/active-check'),
  verify:         (reference)    => api.get(`/subscriptions/verify/${reference}`),
  verifyRepayment: (reference)   => api.get(`/subscriptions/loans/verify-repayment/${reference}`),
};

// ─── Reservations ────────────────────────────────────────────
export const reservationAPI = {
  reserve:           (propertyId) => api.post(`/properties/${propertyId}/reserve`),
  getMine:           ()           => api.get('/reservations/my'),
  getAll:            ()           => api.get('/reservations/all'),
  getForProperty:    (propertyId) => api.get(`/properties/${propertyId}/reservation`),
  getByReference:    (reference)  => api.get(`/reservations/by-reference/${reference}`),
  // Actively verifies with Paystack and activates the reservation if payment confirmed.
  // Eliminates the webhook-vs-redirect race condition on the payment verify page.
  verifyAndActivate: (reference)  => api.get(`/reservations/verify/${reference}`),
};

// ─── Reputation ──────────────────────────────────────────────
export const reputationAPI = {
  getAgentReputation: (agentId)        => api.get(`/agents/${agentId}/reputation`),
  submitFeedback:     (agentId, data)  => api.post(`/agents/${agentId}/feedback`, data),
};

// ─── Commissions ─────────────────────────────────────────────
export const commissionAPI = {
  getMine: () => api.get('/transactions/commissions/my'),
  getAll:  () => api.get('/transactions/commissions/all'),
};

// ─── States / LGAs ───────────────────────────────────────────
export const locationAPI = {
  getStates: ()          => api.get('/states'),
  getLgas:   (stateId)   => api.get(`/states/${stateId}/lgas`),
};

// ─── Notifications ───────────────────────────────────────────
export const notificationAPI = {
  getAll:         ()     => api.get('/notifications'),
  // _noRetry: true — polling errors are already silently swallowed in Navbar;
  // retrying only creates duplicate requests in DevTools with no benefit.
  getUnreadCount: ()     => api.get('/notifications/unread-count', { _noRetry: true }),
  markRead:       (id)   => api.post(`/notifications/${id}/read`),
  markAllRead:    ()     => api.post('/notifications/mark-all-read'),
  adminSend:      (data) => api.post('/notifications/admin/send', data),
};

// ─── Admin user search ────────────────────────────────────────
export const adminAPI = {
  searchUsers: (q) => api.get(`/users/admin/search?q=${encodeURIComponent(q ?? '')}`),
};

// ─── Bank Accounts ───────────────────────────────────────────
export const bankAccountAPI = {
  getAll:     ()     => api.get('/users/me/bank-accounts'),
  add:        (data) => api.post('/users/me/bank-accounts', data),
  setPrimary: (id)   => api.post(`/users/me/bank-accounts/${id}/primary`),
  remove:     (id)   => api.delete(`/users/me/bank-accounts/${id}`),
};

// ─── Wallet ──────────────────────────────────────────────────
export const walletAPI = {
  getBalance:      ()               => api.get('/users/me/wallet'),
  fund:            (data)           => api.post('/users/me/wallet/fund', data),
  getHistory:      ()               => api.get('/users/me/wallet/transactions'),
  verify:          (reference)      => api.post(`/users/me/wallet/transactions/${reference}/verify`),
  withdraw:        (data)           => api.post('/users/me/wallet/withdraw', data),
  getWithdrawals:  ()               => api.get('/users/me/wallet/withdrawals'),
  getAllWithdrawals:()               => api.get('/users/me/wallet/withdrawals/all'),
  processWithdrawal:(id, data)      => api.patch(`/users/me/wallet/withdrawals/${id}/process`, data),
};

export default api;
