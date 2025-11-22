// ✅ Centralna konfiguracja API
const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;
const API_MODE = process.env.EXPO_PUBLIC_API_MODE || 'development';
const API_USERNAME = process.env.EXPO_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD;

export const API_CONFIG = {
  // ✅ W production używamy HTTPS bez portu, w dev HTTP z portem
  BASE_URL: API_MODE === 'production' 
    ? `https://${API_HOST}` 
    : `http://${API_HOST}:${API_PORT}`,
  
  HEALTH_URL: API_MODE === 'production'
    ? `https://${API_HOST}/health`
    : `http://${API_HOST}:${API_PORT}/health`,
  
  TIMEOUT: 10000,
  IS_PRODUCTION: API_MODE === 'production',
  AUTH: {
    USERNAME: API_USERNAME,
    PASSWORD: API_PASSWORD,
  }
};

/**
 * Lista endpointów które NIE wymagają Basic Auth (publiczne)
 */
const PUBLIC_ENDPOINTS = [
  '/',
  '/health',
  '/api/health',
];

/**
 * Sprawdź czy endpoint wymaga Basic Auth
 */
const requiresAuth = (url: string, method: string = 'GET'): boolean => {
  // W development NIGDY nie używaj Basic Auth
  if (!API_CONFIG.IS_PRODUCTION) {
    console.log('🔓 Development mode - no auth required');
    return false;
  }
  
  // Sprawdź czy URL jest w PUBLIC_ENDPOINTS
  const urlPath = url.replace(API_CONFIG.BASE_URL, '');
  const isPublic = PUBLIC_ENDPOINTS.some(endpoint => {
    if (endpoint === '/') return urlPath === '/' || urlPath === '';
    return urlPath === endpoint || urlPath.startsWith(endpoint);
  });
  
  if (isPublic) {
    console.log('🔓 Public endpoint (no auth):', urlPath);
    return false;
  }
  
  // ✅ GET/HEAD/OPTIONS są publiczne (zgodnie z nginx)
  if (method.toUpperCase() === 'GET' || 
      method.toUpperCase() === 'HEAD' || 
      method.toUpperCase() === 'OPTIONS') {
    console.log('🔓 GET/HEAD/OPTIONS - no auth required:', urlPath);
    return false;
  }
  
  // ✅ POST/PUT/DELETE/PATCH wymagają Basic Auth
  console.log('🔐 Non-GET request in production - auth required:', method, urlPath);
  return true;
};

/**
 * Get headers z opcjonalnym Basic Auth
 */
export const getAuthHeaders = (url: string, method: string = 'GET', skipAuth: boolean = false): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Dodaj Basic Auth tylko jeśli:
  // 1. NIE jest to GET/HEAD/OPTIONS
  // 2. Endpoint tego wymaga
  // 3. Nie jest wyraźnie wyłączony (skipAuth)
  // 4. Mamy credentials
  if (!skipAuth && requiresAuth(url, method) && API_USERNAME && API_PASSWORD) {
    const credentials = btoa(`${API_USERNAME}:${API_PASSWORD}`);
    headers['Authorization'] = `Basic ${credentials}`;
    console.log('✅ Added Basic Auth for:', method, url);
  }

  return headers;
};

/**
 * Helper for fetch with automatic auth
 */
export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const method = options.method || 'GET';
  const authHeaders = getAuthHeaders(url, method);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  // Log dla debugowania
  if (!response.ok) {
    console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
    console.error('Method:', method);
    console.error('URL:', url);
  }

  return response;
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
  BIBLE_SHORT_QUOTE: '/api/bible/short-quote',
  BIBLE_RANDOM_QUOTE: '/api/bible/random-quote',
  BIBLE_DAILY_READING: '/api/bible/daily-reading',
  BIBLE_BOOKS: '/api/bible/books',
  BIBLE_CHAPTER: '/api/bible/chapter',
  USERS: '/api/users',
  USER_BY_ID: (userId: string) => `/api/users/${userId}`,
  USER_BY_EMAIL: (email: string) => `/api/users/by-email/${email}`,
  USER_ADD_TOKENS: (userId: string) => `/api/users/${userId}/add-tokens`,
  USER_WALLET: (userId: string) => `/api/users/${userId}/wallet`,
};

/**
 * Extract username from email (part before @)
 */
export const extractUsername = (email: string): string => {
  return email.split('@')[0].toLowerCase();
};