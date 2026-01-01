import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Polyfill process.env to prevent "process is not defined" crashes
        'process.env': {
            ...env,
            API_KEY: env.GEMINI_API_KEY,
            GEMINI_API_KEY: env.GEMINI_API_KEY
        },
        // Polyfill global for some older libraries (like Buffer/Solana)
        global: 'window',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // 'buffer' alias removed to allow index.html polyfill to take precedence 
          // without Vite interfering with module resolution
        }
      }
    };
});