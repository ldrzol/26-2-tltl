import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },

  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
})