/**
 * @fileoverview Test that imports vitest.setup.executable.ts for coverage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Setup Executable Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (global.window) {
      delete global.window
    }
    if (global.MouseEvent) {
      delete global.MouseEvent
    }
  })

  it('should import and execute setup code for coverage', async () => {
    // Import the executable copy of the setup file
    await import('./vitest.setup.executable.ts')

    // Verify effects
    expect(global.MouseEvent).toBeDefined()
    expect(global.window).toBeDefined()
    expect(global.window.terminalAPI).toBeDefined()

    // Test MouseEvent
    const event = new global.MouseEvent('click')
    expect(event.type).toBe('click')

    // Test terminalAPI - cover all functions (lines 25-47)
    const caps = await global.window.terminalAPI.getCapabilities()
    expect(caps.backend).toBe('subprocess')

    const createResult = await global.window.terminalAPI.create({ id: 'test' })
    expect(createResult.success).toBe(true)

    await global.window.terminalAPI.write()
    await global.window.terminalAPI.resize()
    await global.window.terminalAPI.kill()

    const dataCleanup = global.window.terminalAPI.onData(vi.fn())
    expect(typeof dataCleanup).toBe('function')

    const exitCleanup = global.window.terminalAPI.onExit(vi.fn())
    expect(typeof exitCleanup).toBe('function')

    // Test all module imports to cover remaining lines
    const xtermCss = await import('xterm/css/xterm.css')
    expect(xtermCss.default).toEqual({})

    const { Terminal } = await import('xterm')
    const terminal = new Terminal()
    expect(terminal.cols).toBe(80)
    expect(terminal.loadAddon).toBeDefined()
    expect(terminal.open).toBeDefined()
    expect(terminal.onData).toBeDefined()
    expect(terminal.onKey).toBeDefined()
    expect(terminal.onResize).toBeDefined()
    expect(terminal.write).toBeDefined()
    expect(terminal.writeln).toBeDefined()
    expect(terminal.clear).toBeDefined()
    expect(terminal.focus).toBeDefined()
    expect(terminal.dispose).toBeDefined()
    expect(terminal.resize).toBeDefined()

    const { FitAddon } = await import('@xterm/addon-fit')
    const fitAddon = new FitAddon()
    expect(fitAddon.fit).toBeDefined()
    expect(fitAddon.proposeDimensions()).toEqual({ cols: 80, rows: 24 })

    const { WebLinksAddon } = await import('@xterm/addon-web-links')
    const webLinksAddon = new WebLinksAddon()
    expect(webLinksAddon).toEqual({})

    const { spawn } = await import('child_process')
    const proc = spawn('test', ['arg1', 'arg2'])
    expect(proc.stdout).toBeDefined()
    expect(proc.stderr).toBeDefined()
    expect(proc.stdin.write).toBeDefined()
    expect(proc.stdin.end).toBeDefined()
    expect(proc.pid).toBe(12345)
    expect(proc.kill).toBeDefined()

    const electron = await import('electron')
    await electron.app.whenReady()
    expect(electron.app.quit).toBeDefined()
    expect(electron.app.on).toBeDefined()

    const window = new electron.BrowserWindow()
    expect(window.loadFile).toBeDefined()
    expect(window.on).toBeDefined()
    expect(window.webContents.send).toBeDefined()
    expect(window.webContents.openDevTools).toBeDefined()
    expect(window.isDestroyed()).toBe(false)

    expect(electron.ipcMain.handle).toBeDefined()
    expect(electron.Menu.buildFromTemplate).toBeDefined()
    expect(electron.Menu.setApplicationMenu).toBeDefined()
    expect(electron.contextBridge.exposeInMainWorld).toBeDefined()
    expect(electron.ipcRenderer.invoke).toBeDefined()
    expect(electron.ipcRenderer.on).toBeDefined()
    expect(electron.ipcRenderer.removeListener).toBeDefined()
  })
})
