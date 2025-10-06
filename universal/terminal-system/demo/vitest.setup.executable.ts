import { vi } from 'vitest'
import { EventEmitter } from 'events'

// Mock CSS imports - must be at top level
vi.mock('xterm/css/xterm.css', () => ({
  default: {},
}))

// Fix for happy-dom event creation
if (!global.MouseEvent) {
  global.MouseEvent = class MouseEvent extends Event {
    constructor(type: string, init?: MouseEventInit) {
      super(type, init)
    }
  }
}

// Mock window methods
global.window = {
  ...global.window,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  MouseEvent: global.MouseEvent,
  terminalAPI: {
    getCapabilities: vi.fn(() =>
      Promise.resolve({
        backend: 'subprocess',
        supportsResize: false,
        supportsAnsi: true,
        supportsColor: true,
        supportsPty: false,
      })
    ),
    create: vi.fn((options) =>
      Promise.resolve({ id: options.id, success: true })
    ),
    write: vi.fn(() => Promise.resolve()),
    resize: vi.fn(() => Promise.resolve()),
    kill: vi.fn(() => Promise.resolve()),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Callback parameter required by interface but not used in mock
    onData: vi.fn((_callback) => {
      // Return cleanup function
      return vi.fn()
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Callback parameter required by interface but not used in mock
    onExit: vi.fn((_callback) => {
      // Return cleanup function
      return vi.fn()
    }),
  },
}

// Mock xterm
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    onData: vi.fn(),
    onKey: vi.fn(),
    onResize: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    clear: vi.fn(),
    focus: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
    options: {},
    cols: 80,
    rows: 24,
  })),
}))

// Mock xterm addons
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn(() => ({ cols: 80, rows: 24 })),
  })),
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({})),
}))

// Mock child_process for Electron main process tests
vi.mock('child_process', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Parameters required by spawn interface but not used in mock
  spawn: vi.fn().mockImplementation((_command, _args, _options) => {
    const proc = new EventEmitter()

    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    proc.stdin = {
      write: vi.fn(),
      end: vi.fn(),
    }
    proc.pid = 12345
    proc.kill = vi.fn()

    return proc
  }),
}))

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    whenReady: vi.fn(() => Promise.resolve()),
    quit: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn(),
      openDevTools: vi.fn(),
    },
    isDestroyed: vi.fn(() => false),
  })),
  ipcMain: {
    handle: vi.fn(),
  },
  Menu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn(),
  },
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))
