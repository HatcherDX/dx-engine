/* eslint-env node */

import vue from '@vitejs/plugin-vue'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { chrome } from '../electron/.electron-vendors.cache.json'

const PACKAGE_ROOT = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  resolve: {
    alias: {
      '/@/': `${join(PACKAGE_ROOT, 'src')}/`,
    },
  },
  base: '',
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: join(PACKAGE_ROOT, 'index.html'),
      external: ['node-pty', 'electron'],
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    exclude: ['node-pty', 'electron', '@hatcherdx/terminal-system'],
  },
  plugins: [vue()],
})
