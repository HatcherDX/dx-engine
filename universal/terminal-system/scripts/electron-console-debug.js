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

console.log('Starting Enhanced Terminal IPC Debug Console...')

// Test window.electronAPI availability
if (typeof window !== 'undefined' && window.electronAPI) {
  console.log(' window.electronAPI is available')

  // Test terminal list functionality
  const terminalListButton = document.getElementById('terminal-list')
  if (terminalListButton) {
    terminalListButton.addEventListener('click', async () => {
      try {
        const terminals = await window.electronAPI.invoke('get-terminal-list')
        console.log('Terminal list:', terminals)
      } catch (error) {
        console.error('Error getting terminal list:', error)
      }
    })
  }

  // Test terminal data functionality
  const terminalDataButton = document.getElementById('terminal-data')
  if (terminalDataButton) {
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

  // Test sendTerminalInput functionality
  const sendInputButton = document.getElementById('send-input')
  if (sendInputButton) {
    sendInputButton.addEventListener('click', async () => {
      try {
        await window.electronAPI.invoke('sendTerminalInput', 'main', 'ls -la\n')
        console.log(' Input sent to terminal')
      } catch (error) {
        console.error('Error sending terminal input:', error)
      }
    })
  }

  // Set up event listeners for terminal output
  if (window.electronAPI.on) {
    window.electronAPI.on('terminal-output', (terminalId, data) => {
      console.log(`Terminal ${terminalId} output:`, data)
    })

    window.electronAPI.on('terminal-error', (terminalId, error) => {
      console.error(`Terminal ${terminalId} error:`, error)
    })
  }
} else {
  console.warn('� window.electronAPI not available - running in web mode')
}

console.log(' Enhanced Terminal IPC Debug setup complete')
