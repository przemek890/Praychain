import { Buffer } from 'buffer';

global.Buffer = Buffer;

if (typeof global.process === 'undefined') {
  global.process = { env: {} } as any;
}

export {};