import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('uc-'),
        },
      },
    }),
  ],
  server: {
    proxy: {
      '/api/email': {
        target: 'https://emailservice-i0wa.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/api/users': {
        target: 'https://userservice-517a.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
