import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        // <emoji-picker> is a web component (emoji-picker-element), not a Vue component
        compilerOptions: { isCustomElement: (tag) => tag === 'emoji-picker' },
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Forward /api/* to the Express server in ../server during development
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
