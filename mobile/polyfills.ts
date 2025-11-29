import { Buffer } from 'buffer';

// Polyfill Buffer dla React Native/Expo
global.Buffer = Buffer;

// Polyfill process jeśli nie istnieje
if (typeof global.process === 'undefined') {
  global.process = { env: {} } as any;
}

export {};