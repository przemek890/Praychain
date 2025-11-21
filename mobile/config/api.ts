// ✅ Centralna konfiguracja API
const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;
const API_MODE = process.env.EXPO_PUBLIC_API_MODE || 'development';
const API_USERNAME = process.env.EXPO_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD;

export const API_CONFIG = {
  BASE_URL: `http://${API_HOST}:${API_PORT}`,
  HEALTH_URL: `http://${API_HOST}:${API_PORT}/health`,
  TIMEOUT: 10000,
  IS_PRODUCTION: API_MODE === 'production',
  AUTH: {
    USERNAME: API_USERNAME,
    PASSWORD: API_PASSWORD,
  }
};

/**
 * Get Basic Auth headers if in production mode
 */
export const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (API_CONFIG.IS_PRODUCTION && API_USERNAME && API_PASSWORD) {
    const credentials = btoa(`${API_USERNAME}:${API_PASSWORD}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  return headers;
};

/**
 * Helper for fetch with automatic auth
 */
export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const authHeaders = getAuthHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
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