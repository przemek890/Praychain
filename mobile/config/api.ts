// ✅ Centralna konfiguracja API
const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;

export const API_CONFIG = {
  BASE_URL: `http://${API_HOST}:${API_PORT}`,
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
  BIBLE_PRAYER: (type: string) => `/api/bible/prayer/${type}`,
  // ✅ Nowe endpointy dla użytkowników
  USERS: '/api/users',
  USER_BY_ID: (userId: string) => `/api/users/${userId}`,
  USER_BY_EMAIL: (email: string) => `/api/users/by-email/${email}`,
  USER_ADD_TOKENS: (userId: string) => `/api/users/${userId}/add-tokens`,
};

/**
 * Extract username from email (part before @)
 */
export const extractUsername = (email: string): string => {
  return email.split('@')[0].toLowerCase();
};