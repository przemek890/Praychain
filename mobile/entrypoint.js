// entrypoint.js

// 1. Polyfills – MUSZĄ być importowane jako pierwsze
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

// 2. Dopiero potem Expo Router
import 'expo-router/entry';
