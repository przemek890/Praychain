// ✅ Centralna konfiguracja API
const API_HOST = process.env.EXPO_PUBLIC_API_HOST || 'MacBook-Pro-A2141.local';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';

export const API_CONFIG = {
  BASE_URL: `http://${API_HOST}:${API_PORT}/api`,
  HEALTH_URL: `http://${API_HOST}:${API_PORT}/health`,
  TIMEOUT: 5000,
};

export const ENDPOINTS = {
  BIBLE_RANDOM: '/bible/random-quote',
  TRANSCRIBE: '/transcribe',
  PRAYER_ANALYZE: (id: string) => `/prayer/analyze/${id}`,
  TOKEN_BALANCE: (userId: string) => `/tokens/balance/${userId}`,
  TOKEN_TRANSACTIONS: (userId: string) => `/tokens/transactions/${userId}`,
  CHARITY_ACTIONS: '/charity/actions',
  CHARITY_DONATE: '/charity/donate',
  CHARITY_STATS: (charityId: string) => `/charity/actions/${charityId}/stats`,
  CHARITY_USER_DONATIONS: (userId: string) => `/charity/user/${userId}/donations`,
};