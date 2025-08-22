/**
 * @fileoverview Enhanced Terminal IPC Debug Console Script
 *
 * @description
 * Debug script for testing Electron IPC communication with terminal system.
 * Used for development and troubleshooting terminal functionality.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * ElectronAPI interface for terminal operations.
 *
 * @internal
 */
interface ElectronAPI {
  invoke(channel: string, ...args: any[]): Promise<any>
  on(channel: string, callback: (...args: any[]) => void): void
  off(channel: string, callback: (...args: any[]) => void): void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

/**
 * Sets up debug console for testing Electron IPC communication.
 *
 * @remarks
 * This function initializes event listeners for terminal operations
 * and provides debug functionality for development.
 *
 * @example
 * ```typescript
 * setupDebugConsole()
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function setupDebugConsole(): void {
  console.log('Starting Enhanced Terminal IPC Debug Console...')

  // Test window.electronAPI availability
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('✅ window.electronAPI is available')

    setupTerminalListButton()
    setupTerminalDataButton()
    setupSendInputButton()
    setupEventListeners()
  } else {
    console.warn('⚠ window.electronAPI not available - running in web mode')
  }

  console.log('✓ Enhanced Terminal IPC Debug setup complete')
}

/**
 * Sets up terminal list button functionality.
 *
 * @private
 */
function setupTerminalListButton(): void {
  const terminalListButton = document.getElementById('terminal-list')
  if (terminalListButton && window.electronAPI) {
    terminalListButton.addEventListener('click', async () => {
      try {
        const terminals = await window.electronAPI.invoke('get-terminal-list')
        console.log('Terminal list:', terminals)
      } catch (error) {
        console.error('Error getting terminal list:', error)
      }
    })
  }
}

/**
 * Sets up terminal data button functionality.
 *
 * @private
 */
function setupTerminalDataButton(): void {
  const terminalDataButton = document.getElementById('terminal-data')
  if (terminalDataButton && window.electronAPI) {
    terminalDataButton.addEventListener('click', async () => {
      try {
        const data = await window.electronAPI.invoke(
          'get-terminal-data',
          'main'
        )
        console.log('Terminal data:', data)
      } catch (error) {
        console.error('Error getting terminal data:', error)
      }
    })
  }
}

/**
 * Sets up send input button functionality.
 *
 * @private
 */
function setupSendInputButton(): void {
  const sendInputButton = document.getElementById('send-input')
  if (sendInputButton && window.electronAPI) {
    sendInputButton.addEventListener('click', async () => {
      try {
        await window.electronAPI.invoke('sendTerminalInput', 'main', 'ls -la\n')
        console.log('✓ Input sent to terminal')
      } catch (error) {
        console.error('Error sending terminal input:', error)
      }
    })
  }
}

/**
 * Sets up event listeners for terminal output.
 *
 * @private
 */
function setupEventListeners(): void {
  if (window.electronAPI?.on) {
    window.electronAPI.on(
      'terminal-output',
      (terminalId: string, data: string) => {
        console.log(`Terminal ${terminalId} output:`, data)
      }
    )

    window.electronAPI.on(
      'terminal-error',
      (terminalId: string, error: Error) => {
        console.error(`Terminal ${terminalId} error:`, error)
      }
    )
  }
}

// Auto-initialize if running in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDebugConsole)
  } else {
    setupDebugConsole()
  }
}
