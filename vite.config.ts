import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createOfficeBridgePlugin } from './src/server/officeBridge'

const aimConnectTarget = process.env.VITE_AIM_CONNECT_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), createOfficeBridgePlugin()],
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: false,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/joshua_os/**', '**/node_modules/**', '**/workspace/**', '**/archive/**', '**/dist/**'],
    },
    proxy: {
      '/api/fleet': {
        target: aimConnectTarget,
        changeOrigin: true,
      },
      '/api/swarm': {
        target: aimConnectTarget,
        changeOrigin: true,
      },
      '/api/forensics': {
        target: aimConnectTarget,
        changeOrigin: true,
      },
      '/api/workspace': {
        target: aimConnectTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5175,
    host: '127.0.0.1',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
  },
})
