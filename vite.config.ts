import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  'media-src blob:',
  "worker-src 'self'",
  "connect-src 'none'",
  "font-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "manifest-src 'self'"
].join('; ');

const contentSecurityPolicy = (): Plugin => ({
  name: 'nijimi-content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
      injectTo: 'head-prepend'
    }
  ]
});

export default defineConfig({
  base: '/nijimi/',
  plugins: [contentSecurityPolicy()],
  build: {
    target: 'es2024',
    sourcemap: true,
    modulePreload: { polyfill: false }
  },
  worker: {
    format: 'es'
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
