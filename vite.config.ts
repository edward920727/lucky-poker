import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 将 React 相关代码分离
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // 将 Firebase 相关代码分离（使用动态检测）
          if (id.includes('firebase')) {
            return 'firebase-vendor';
          }
          // 将其他大型库分离
          if (id.includes('html2canvas')) {
            return 'utils-vendor';
          }
        },
      },
    },
    // 增加 chunk 大小警告限制（可选）
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['firebase'],
  },
})
