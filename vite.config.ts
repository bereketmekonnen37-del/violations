import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Use relative paths so assets resolve correctly inside a Chrome extension
  base: './',

  build: {
    // Target modern browsers supported by Chrome extensions
    target: 'esnext',
    rollupOptions: {
      output: {
        // Avoid inline dynamic imports that can violate CSP
        format: 'es',
      },
    },
  },
})
