import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const aimConnectTarget = process.env.VITE_AIM_CONNECT_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: false,
    proxy: {
      '/api': {
        target: aimConnectTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
  },
})
