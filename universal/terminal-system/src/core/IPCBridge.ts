import type {
  IpcMain,
  IpcMainEvent,
  IpcMainInvokeEvent,
  WebContents,
} from 'electron'
import type {
  CreateTerminalMessage,
  TerminalInputMessage,
  TerminalResizeMessage,
  TerminalCreatedMessage,
  TerminalDataMessage,
  TerminalExitMessage,
  TerminalErrorMessage,
} from '../types/ipc'
import type {
  TerminalState,
  TerminalDataEvent,
  TerminalLifecycleEvent,
} from '../types/terminal'
import { TerminalManager } from './TerminalManager'
import { Logger } from '../utils/logger'

/**
 * IPC Bridge for Electron communication
 * Handles communication between main and renderer processes
 * Based on VSCode IPC architecture
 */
export class IPCBridge {
  private terminalManager: TerminalManager
  private ipcMain: IpcMain
  private webContents: WebContents | null = null
  private logger = new Logger('IPCBridge')

  constructor(ipcMain: IpcMain) {
    this.ipcMain = ipcMain
    this.terminalManager = new TerminalManager()
    this.setupIpcHandlers()
    this.setupTerminalManagerEvents()
  }

  /**
   * Set the web contents for sending messages to renderer
   */
  setWebContents(webContents: WebContents): void {
    this.webContents = webContents
    this.logger.debug('WebContents set for IPC communication')
  }

  /**
   * Get the terminal manager instance
   */
  getTerminalManager(): TerminalManager {
    return this.terminalManager
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.logger.info('Cleaning up IPC Bridge')
    this.terminalManager.cleanup()
    this.removeAllIpcHandlers()
  }

  /**
   * Setup IPC handlers for terminal operations
   */
  private setupIpcHandlers(): void {
    // Handle terminal creation
    this.ipcMain.handle(
      'create-terminal',
      async (_event: IpcMainInvokeEvent, options: CreateTerminalMessage) => {
        try {
          this.logger.debug('Creating terminal via IPC', options)
          const terminal = await this.terminalManager.createTerminal(options)

          const response: TerminalCreatedMessage = {
            id: terminal.id,
            name: terminal.name,
            pid: terminal.pid || 0,
          }

          return response
        } catch (error) {
          this.logger.error('Failed to create terminal via IPC', error as Error)
          throw error
        }
      }
    )

    // Handle terminal input
    this.ipcMain.on(
      'terminal-input',
      (_event: IpcMainEvent, message: TerminalInputMessage) => {
        try {
          this.logger.debug(`Terminal input via IPC: ${message.id}`)
          this.terminalManager.sendData(message.id, message.data)
        } catch (error) {
          this.logger.error(
            'Failed to send terminal input via IPC',
            error as Error
          )
        }
      }
    )

    // Handle terminal resize
    this.ipcMain.on(
      'resize-terminal',
      (_event: IpcMainEvent, message: TerminalResizeMessage) => {
        try {
          this.logger.debug(
            `Terminal resize via IPC: ${message.id} (${message.cols}x${message.rows})`
          )
          this.terminalManager.resizeTerminal({
            id: message.id,
            cols: message.cols,
            rows: message.rows,
          })
        } catch (error) {
          this.logger.error('Failed to resize terminal via IPC', error as Error)
        }
      }
    )

    // Handle terminal close
    this.ipcMain.on('close-terminal', (_event: IpcMainEvent, id: string) => {
      try {
        this.logger.debug(`Closing terminal via IPC: ${id}`)
        this.terminalManager.closeTerminal(id)
      } catch (error) {
        this.logger.error('Failed to close terminal via IPC', error as Error)
      }
    })

    // Handle list terminals
    this.ipcMain.handle('list-terminals', () => {
      try {
        const terminals = this.terminalManager.getAllTerminals()
        this.logger.debug(`Listing ${terminals.length} terminals via IPC`)
        return terminals
      } catch (error) {
        this.logger.error('Failed to list terminals via IPC', error as Error)
        throw error
      }
    })

    this.logger.info('IPC handlers setup complete')
  }

  /**
   * Setup TerminalManager event handlers
   */
  private setupTerminalManagerEvents(): void {
    // Handle terminal creation
    this.terminalManager.on('terminalCreated', (terminal: TerminalState) => {
      if (this.webContents && !this.webContents.isDestroyed()) {
        const message: TerminalCreatedMessage = {
          id: terminal.id,
          name: terminal.name,
          pid: terminal.pid || 0,
        }

        this.webContents.send('terminal-created', message)
        this.logger.debug(`Sent terminal-created event: ${terminal.id}`)
      }
    })

    // Handle terminal data
    this.terminalManager.on('terminalData', (dataEvent: TerminalDataEvent) => {
      if (this.webContents && !this.webContents.isDestroyed()) {
        const message: TerminalDataMessage = {
          id: dataEvent.id,
          data: dataEvent.data,
        }

        this.webContents.send('terminal-data', message)
      }
    })

    // Handle terminal exit
    this.terminalManager.on(
      'terminalExit',
      (exitEvent: TerminalLifecycleEvent) => {
        if (this.webContents && !this.webContents.isDestroyed()) {
          const message: TerminalExitMessage = {
            id: exitEvent.id,
            exitCode: (exitEvent.data as { exitCode: number })?.exitCode || 0,
          }

          this.webContents.send('terminal-exit', message)
          this.logger.debug(`Sent terminal-exit event: ${exitEvent.id}`)
        }
      }
    )

    // Handle terminal errors
    this.terminalManager.on(
      'terminalError',
      (errorEvent: TerminalLifecycleEvent) => {
        if (this.webContents && !this.webContents.isDestroyed()) {
          const message: TerminalErrorMessage = {
            id: errorEvent.id,
            error:
              (errorEvent.data as { error: string })?.error || 'Unknown error',
          }

          this.webContents.send('terminal-error', message)
          this.logger.debug(`Sent terminal-error event: ${errorEvent.id}`)
        }
      }
    )

    this.logger.info('TerminalManager event handlers setup complete')
  }

  /**
   * Remove all IPC handlers
   */
  private removeAllIpcHandlers(): void {
    this.ipcMain.removeAllListeners('create-terminal')
    this.ipcMain.removeAllListeners('terminal-input')
    this.ipcMain.removeAllListeners('resize-terminal')
    this.ipcMain.removeAllListeners('close-terminal')
    this.ipcMain.removeAllListeners('list-terminals')

    this.logger.debug('All IPC handlers removed')
  }
}
