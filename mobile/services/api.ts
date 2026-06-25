// ─── CoreCity Mobile — API Service ───────────────────────────────────────────
// Adapted from the web frontend's services/api.js.
// Key differences:
//   • Token stored in expo-secure-store (not localStorage)
//   • 401 handler calls a registered callback (not window.location.href)
//   • baseURL read from EXPO_PUBLIC_API_URL env var
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'cc_token';
export const USER_KEY  = 'cc_user';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api/v1';

// Callback registered by AuthContext; called when a 401 forces a sign-out.
let _unauthorizedCb: (() => void) | null = null;
export const setUnauthorizedCallback = (cb: () => void) => { _unauthorizedCb = cb; };

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15_000 });

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // SecureStore unavailable on some emulators — fail gracefully
  }
  return config;
});

// ── Response interceptor: retry on gateway errors, handle 401 ────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;

    // Retry GET requests on transient gateway errors (once)
    if (
      [502, 503, 504].includes(status) &&
      !err.config._retried &&
      !err.config._noRetry &&
      err.config.method?.toLowerCase() === 'get'
    ) {
      err.config._retried = true;
      await new Promise((r) => setTimeout(r, 2_000));
      return api.request(err.config);
    }

    // Force sign-out on 401
    if (status === 401 && !err.config?._suppressGlobalLogout) {
      const hadToken = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null);
      await SecureStore.deleteItemAsync(USER_KEY).catch(() => null);
      if (hadToken && _unauthorizedCb) _unauthorizedCb();
    }

    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (data: unknown)          => api.post('/auth/register', data),
  login:          (data: unknown)          => api.post('/auth/login', data),
  getMe:          (config?: object)        => api.get('/users/me', config),
  updateMe:       (data: unknown)          => api.put('/users/me', data),
  changePassword: (data: unknown)          => api.post('/users/me/change-password', data),
  verifyIdentity: (data: unknown)          => api.post('/users/me/verify-identity', data),
  checkPhone:     (phone: string)          => api.get('/users/check-phone', { params: { phone } }),
};

// ─── Properties ───────────────────────────────────────────────────────────────
export const propertyAPI = {
  search:    (params: Record<string, unknown>) => api.get('/properties/search', { params }),
  featured:  ()                                => api.get('/properties/featured'),
  getOne:    (id: number | string)             => api.get(`/properties/${id}`),
  getMyList: ()                                => api.get('/properties/my-listings'),
  create:    (data: unknown)                   => api.post('/properties', data),
  update:    (id: number | string, d: unknown) => api.put(`/properties/${id}`, d),
  remove:    (id: number | string)             => api.delete(`/properties/${id}`),
  publish:   (id: number | string)             => api.post(`/properties/${id}/publish`),
};

// ─── Files ────────────────────────────────────────────────────────────────────
export const fileAPI = {
  uploadSingle: (
    propertyId: number | string,
    file: { uri: string; name: string; type: string }
  ) => {
    const fd = new FormData();
    // React Native FormData accepts { uri, name, type } as a file part
    fd.append('file', file as unknown as Blob);
    fd.append('category', 'images');
    return api.post(`/files/upload/property/${propertyId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    });
  },
};

// ─── Enquiries ────────────────────────────────────────────────────────────────
export const enquiryAPI = {
  send:      (propertyId: number | string, message: string) =>
               api.post('/enquiries', { propertyId, message }),
  getMyList: () => api.get('/enquiries/my'),
};

// ─── Saved / Favourites ───────────────────────────────────────────────────────
export const savedAPI = {
  getAll: ()                         => api.get('/properties/saved'),
  save:   (id: number | string)      => api.post(`/properties/${id}/save`),
  unsave: (id: number | string)      => api.delete(`/properties/${id}/save`),
};

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const walletAPI = {
  get:      ()               => api.get('/wallet'),
  withdraw: (data: unknown)  => api.post('/wallet/withdraw', data),
  history:  (params?: Record<string, unknown>) =>
              api.get('/wallet/transactions', { params }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:         ()                        => api.get('/notifications'),
  getUnreadCount: ()                        => api.get('/notifications/unread-count'),
  markRead:       (id: number | string)     => api.patch(`/notifications/${id}/read`),
  markAllRead:    ()                        => api.patch('/notifications/read-all'),
};

// ─── Location ─────────────────────────────────────────────────────────────────
export const locationAPI = {
  getStates: ()                         => api.get('/location/states'),
  getLgas:   (stateId: number | string) => api.get(`/location/states/${stateId}/lgas`),
};

// ─── Reservations ─────────────────────────────────────────────────────────────
export const reservationAPI = {
  initiate: (propertyId: number | string) =>
              api.post('/reservations/initiate', { propertyId }),
  getMyList: () => api.get('/reservations/my'),
};

export default api;
