import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { chrome } from '../electron/.electron-vendors.cache.json'

const PACKAGE_ROOT = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  build: {
    ssr: true,
    sourcemap: 'inline',
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',
    lib: {
      entry: ['src/index.ts', 'src/ipcMain.ts'],
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        // ESM preload scripts must have the .mjs extension
        // https://www.electronjs.org/docs/latest/tutorial/esm#esm-preload-scripts-must-have-the-mjs-extension
        entryFileNames: '[name].cjs',
      },
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },

  plugins: [dts()],
})
