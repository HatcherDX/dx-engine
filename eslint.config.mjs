// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import prettierConfig from 'eslint-config-prettier'

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-*/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.min.js',
      'pnpm-lock.yaml',
      '**/cache/**',
      '**/.vitepress/cache/**',
      '**/vendor/**',
      '**/lib/**',
      '**/deps/**',
      '**/scripts/**',
      '**/*.d.ts',
      '**/vite.config.ts',
      '**/vite.config.mts',
      '**/.vitepress/config.mts',
      '**/.vitepress/theme/**',
      '**/webpack.config.cjs',
      '**/*.bundle.js',
      '**/*.chunk.js',
    ],
  },

  // Base config for all JS files
  eslint.configs.recommended,

  // TypeScript specific configuration
  ...tseslint.configs.recommended,

  // Vue configuration
  ...vuePlugin.configs['flat/recommended'],

  // Node.js environment for specific files
  {
    files: ['**/apps/electron/**/*.{ts,js}', '**/scripts/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Browser environment for web apps
  {
    files: ['**/apps/web/**/*.{ts,js,vue}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // DOM types
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        Navigator: 'readonly',
        ResizeObserver: 'readonly',
      },
    },
  },

  // Vue files with TypeScript
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },

  // Custom overrides for all TypeScript files
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off', // TypeScript handles this
    },
  },

  // Prettier config must be last
  prettierConfig,
]
