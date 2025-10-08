/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_TERMINAL_WS_PORT: string
  readonly VITE_TERMINAL_WS_HOST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
