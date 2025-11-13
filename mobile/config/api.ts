// ✅ Centralna konfiguracja API
const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;

export const API_CONFIG = {
  BASE_URL: `http://${API_HOST}:${API_PORT}`, // dynamicznie używa API_HOST i API_PORT
  HEALTH_URL: `http://${API_HOST}:${API_PORT}/health`,
  TIMEOUT: 10000,
};

export const ENDPOINTS = {
  TRANSCRIBE: '/api/transcribe',
  PRAYER_ANALYZE: (transcriptionId: string) => `/api/prayer/analyze/${transcriptionId}`,
  TOKEN_BALANCE: (userId: string) => `/api/tokens/balance/${userId}`,
  TOKEN_TRANSACTIONS: (userId: string) => `/api/tokens/transactions/${userId}`,
  CHARITY_ACTIONS: '/api/charity/actions',
  CHARITY_DONATE: '/api/charity/donate',
  CHARITY_USER_DONATIONS: (userId: string) => `/api/charity/user/${userId}/donations`,
  BIBLE_PRAYER: (type: string) => `/api/bible/prayer/${type}`, // ✅ POPRAWIONE (bez podwójnego /api)
};