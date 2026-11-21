import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 설정 > 앱 정보의 버전 표시 (package.json의 version)
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
})
