import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { node } from './.electron-vendors.cache.json'

const PACKAGE_ROOT = fileURLToPath(new URL('.', import.meta.url))
// const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

export default defineConfig({
  envDir: PACKAGE_ROOT,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': `${join(PACKAGE_ROOT, 'src')}/`,
    },
  },
  build: {
    ssr: true,
    sourcemap: false,
    target: `node${node}`,
    outDir: 'dist-vite',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',
    lib: {
      entry: {
        index: join(PACKAGE_ROOT, 'src/index.ts'),
        ptyHost: join(PACKAGE_ROOT, 'src/ptyHost.ts'),
      },
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['electron', 'node-pty', 'express', 'express-ws'],
      output: {
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name].cjs',
      },
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
})
