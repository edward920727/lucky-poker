import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 React 相关代码分离
          'react-vendor': ['react', 'react-dom'],
          // 将 Firebase 相关代码分离
          'firebase-vendor': ['firebase'],
          // 将其他大型库分离
          'utils-vendor': ['html2canvas'],
        },
      },
    },
    // 增加 chunk 大小警告限制（可选）
    chunkSizeWarningLimit: 1000,
  },
})
