// entrypoint.js

// 1. Polyfills – MUST be imported first
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

// 2. Only then Expo Router
import 'expo-router/entry';
