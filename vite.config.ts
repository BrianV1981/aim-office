import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const aimConnectTarget = process.env.VITE_AIM_CONNECT_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: false,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/joshua_os/**', '**/node_modules/**', '**/workspace/**', '**/archive/**', '**/dist/**'],
    },
    proxy: {
      '/api': {
        target: aimConnectTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5175,
    host: '0.0.0.0',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
  },
})
