/* eslint-env node */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef -- __dirname is available in Node.js environment
      '@': resolve(__dirname, './src'),
      // eslint-disable-next-line no-undef -- __dirname is available in Node.js environment
      '@hatcherdx/terminal-system': resolve(__dirname, '../src'),
    },
  },
  optimizeDeps: {
    exclude: ['node-pty'],
  },
  server: {
    port: 5175,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron', 'node-pty'],
    },
  },
  base: './',
})
