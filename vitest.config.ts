import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@/apps/web', replacement: resolve(__dirname, 'apps/web/src') },
      {
        find: '@/apps/electron',
        replacement: resolve(__dirname, 'apps/electron/src'),
      },
      {
        find: '@/apps/preload',
        replacement: resolve(__dirname, 'apps/preload/src'),
      },
      { find: '@/universal', replacement: resolve(__dirname, 'universal') },
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '/assets', replacement: resolve(__dirname, 'apps/web/public') },
    ],
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],

    // INCLUIR TODOS LOS TESTS DEL MONOREPO (EXCLUYENDO WIP)
    include: [
      'apps/**/*.{test,spec}.{js,ts}',
      'universal/**/*.{test,spec}.{js,ts}',
      'scripts/**/*.{test,spec}.{js,ts}',
    ],

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/docs/**',
      'apps/docs/**',
    ],

    // CONFIGURACIÓN DE ALIAS PARA TESTS
    alias: {
      '@/apps/web': resolve(__dirname, 'apps/web/src'),
      '@/apps/electron': resolve(__dirname, 'apps/electron/src'),
      '@/apps/preload': resolve(__dirname, 'apps/preload/src'),
      '@/universal': resolve(__dirname, 'universal'),
      '@': resolve(__dirname, 'src'),
      '/assets': resolve(__dirname, 'apps/web/public'),
      '/@/': resolve(__dirname, 'apps/electron/src/'),
      '/logo-dark.svg': resolve(__dirname, 'apps/web/public/logo-dark.svg'),
    },

    // CONFIGURACIÓN DE ISTANBUL - AUTOMÁTICA
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      enabled: true,
      clean: true,
      cleanOnRerun: true,

      // INCLUIR TODO EL CÓDIGO FUENTE (EXCLUYENDO WIP)
      include: [
        'apps/**/*.{js,ts,vue}',
        'universal/**/*.{js,ts}',
        '!apps/docs/**',
      ],

      // EXCLUIR ARCHIVOS NO RELEVANTES
      exclude: [
        '**/*.{test,spec}.{js,ts,vue}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        '**/node_modules/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/public/**',
        '**/assets/**',
        '**/*.min.js',
        '**/registerServiceWorker.ts',
        '**/vite-env.d.ts',
        '**/style.css',
      ],
    },
  },
})
