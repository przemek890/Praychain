const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';
const API_MODE = process.env.EXPO_PUBLIC_API_MODE || 'development';
const API_USERNAME = process.env.EXPO_PUBLIC_API_USERNAME || '';
const API_PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD || '';

export const API_CONFIG = {
  BASE_URL: API_MODE === 'production' 
    ? `https://${API_HOST}` 
    : `http://${API_HOST}:${API_PORT}`,
  
  HEALTH_URL: API_MODE === 'production'
    ? `https://${API_HOST}/health`
    : `http://${API_HOST}:${API_PORT}/health`,
  
  TIMEOUT: 10000,
  UPLOAD_TIMEOUT: 120000,
  IS_PRODUCTION: API_MODE === 'production',
  AUTH: {
    USERNAME: API_USERNAME,
    PASSWORD: API_PASSWORD,
  }
};

export const getAuthHeaders = (url: string, method: string = 'GET', skipAuth: boolean = false): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (API_CONFIG.IS_PRODUCTION && !skipAuth && API_CONFIG.AUTH.USERNAME) {
    const credentials = btoa(`${API_CONFIG.AUTH.USERNAME}:${API_CONFIG.AUTH.PASSWORD}`);
    (headers as Record<string, string>)['Authorization'] = `Basic ${credentials}`;
  }
  
  return headers;
};


export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const method = options.method || 'GET';

  const isFormData = options.body instanceof FormData;
  const baseHeaders = getAuthHeaders(url, options.method || 'GET');
  const headers: Record<string, string> = {
    ...baseHeaders as Record<string, string>,
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (isFormData) {
    delete headers['Content-Type'];
  }
  
  const timeout = isFormData ? API_CONFIG.UPLOAD_TIMEOUT : API_CONFIG.TIMEOUT;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log(`${method} ${url} (timeout: ${timeout}ms, formData: ${isFormData})`);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Request failed: ${response.status} ${response.statusText}`);
    } else {
      console.log(`Request OK: ${response.status}`);
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`⏰ Request timeout after ${timeout}ms: ${url}`);
      throw new Error(`Request timeout after ${timeout / 1000}s`);
    }
    
    console.error(`Network error: ${error.message}`);
    throw error;
  }
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

export const extractUsername = (email: string): string => {
  if (!email) return 'user';
  return email.split('@')[0];
};