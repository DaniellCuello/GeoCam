// src/polyfills.ts
// Requerido por Vercel AI SDK v7 en Hermes (React Native)

import structuredClonePolyfill from '@ungap/structured-clone';
import { TextDecoderStream, TextEncoderStream } from '@stardazed/streams-text-encoding';

if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = structuredClonePolyfill;
}

if (typeof globalThis.TextEncoderStream === 'undefined') {
  (globalThis as any).TextEncoderStream = TextEncoderStream;
}

if (typeof globalThis.TextDecoderStream === 'undefined') {
  (globalThis as any).TextDecoderStream = TextDecoderStream;
}
