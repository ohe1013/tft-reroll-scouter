import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    server: {
      headers: {
        // ✅ blob: 기반 worker 허용
        'Content-Security-Policy':
          "default-src 'self' blob:; script-src 'self' 'unsafe-inline' blob:; worker-src 'self' blob:;"
      }
    }
  }
})
