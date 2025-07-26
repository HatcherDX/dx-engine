import { app } from 'electron'

/** Whether in development environment */
export const isDev = import.meta.env.DEV
/** Whether in production environment */
export const isProd = import.meta.env.PROD
/** Whether in packaged state */
export const isPackaged = app.isPackaged

export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'
