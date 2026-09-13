import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite only inlines `import.meta.env.VITE_*` values that exist at BUILD
  // time — loadEnv reads .env files and also picks up real process.env vars
  // (which is how Vercel's dashboard-configured Environment Variables reach
  // the build). Fail loudly here instead of shipping a bundle that only
  // throws once a real user opens it in the browser.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY at build time. ' +
        'Set them in .env.local for local builds, or in Vercel → Project Settings → ' +
        'Environment Variables (scoped to Production/Preview as needed) and redeploy.',
    )
  }

  return {
    plugins: [react()],

    // Relative paths are needed when this build is zipped up as a Chrome
    // extension. Vercel sets VERCEL=1 during its build, so a Vercel
    // deployment (a real multi-route website, not a packaged extension)
    // gets absolute paths instead — required for assets to resolve
    // correctly on any route depth and after a client-side route refresh.
    base: process.env.VERCEL ? '/' : './',

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
  }
})
