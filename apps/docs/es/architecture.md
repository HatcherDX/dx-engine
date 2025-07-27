---
title: Arquitectura | Diseño Técnico y Principios de Ingeniería de Hatcher IDE
description: Explora la arquitectura técnica de Hatcher diseñada para la Amplificación Controlada. Aprende sobre el diseño determinístico, el enfoque agnóstico del modelo y los principios de ingeniería de código abierto.
---

# Arquitectura

Hatcher está construido como una aplicación Electron moderna con una arquitectura de monorepo que prioriza la escalabilidad, mantenibilidad y rendimiento.

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                    Hatcher Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)     │  Renderer Process (Vue.js)   │
│  ├── Window Management      │  ├── Visual-to-Code Bridge   │
│  ├── AI Engine Integration  │  ├── Code Editor             │
│  ├── File System Access     │  ├── Project Management      │
│  └── Git Operations         │  └── UI Components           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                External AI Services                         │
│  ├── Claude API (Anthropic)                                │
│  ├── Gemini CLI (Google)                                   │
│  └── Future: GPT-4, CodeLlama                              │
└─────────────────────────────────────────────────────────────┘
```

## Estructura del Monorepo

```
dx-engine/
├── apps/                    # Aplicaciones principales
│   ├── electron/           # Proceso principal Electron
│   ├── web/               # Proceso renderer Vue.js
│   ├── preload/           # Scripts preload seguros
│   └── docs/              # Documentación VitePress
│
├── universal/             # Paquetes compartidos
│   ├── vite-plugin/       # Plugins Vite personalizados
│   └── puppeteer-google-translate/  # Servicio de traducción
│
├── scripts/               # Scripts de automatización
│   ├── translation/       # Sistema de traducción TypeScript
│   ├── setup-env.ts      # Configuración de entorno
│   ├── version-bump.ts   # Gestión de versiones
│   └── generate-icons.ts # Generación de iconos
│
└── Config Files           # Configuración del proyecto
    ├── package.json       # Configuración del workspace
    ├── turbo.json         # Configuración Turborepo
    └── tsconfig.json      # Configuración TypeScript
```

## Procesos Electron

### Main Process (apps/electron/)

El proceso principal maneja:

- **Gestión de Ventanas**: Crear y controlar ventanas de aplicación
- **Integración AI**: Comunicación con servicios de IA externos
- **Acceso al Sistema**: Operaciones de archivo y sistema
- **Seguridad**: Validación y sanitización de entrada

```typescript
// apps/electron/src/index.ts
import { app, BrowserWindow } from 'electron'

class HatcherMain {
  private mainWindow: BrowserWindow | null = null

  async initialize() {
    await this.createWindow()
    this.setupAIIntegration()
    this.setupGitIntegration()
  }

  private async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    })
  }
}
```

### Renderer Process (apps/web/)

El proceso renderer contiene la UI Vue.js:

- **Visual-to-Code Bridge**: Funcionalidad central de selección visual
- **Editor de Código**: Editor integrado con resaltado de sintaxis
- **Gestión de Proyectos**: Explorador de archivos y gestión
- **Componentes UI**: Interfaz de usuario reactiva

```typescript
// apps/web/src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { store } from './store'

const app = createApp(App)
app.use(router)
app.use(store)
app.mount('#app')
```

### Preload Scripts (apps/preload/)

Scripts preload seguros que exponen APIs controladas:

```typescript
// apps/preload/src/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Operaciones de archivo seguras
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke('write-file', path, content),

  // Integración AI
  callAI: (prompt: string, context: any) =>
    ipcRenderer.invoke('ai-request', prompt, context),

  // Operaciones Git
  gitStatus: () => ipcRenderer.invoke('git-status'),
  gitDiff: () => ipcRenderer.invoke('git-diff'),
})
```

## Stack Tecnológico

### Frontend (Renderer)

- **Vue.js 3**: Framework reactivo con Composition API
- **TypeScript**: Desarrollo con seguridad de tipos
- **Vite**: Herramientas de construcción rápidas
- **Pinia**: Gestión de estado moderna
- **Vue Router**: Enrutamiento del lado del cliente

### Backend (Main Process)

- **Electron**: Framework de aplicación de escritorio
- **Node.js**: Runtime de JavaScript
- **TypeScript**: Desarrollo con seguridad de tipos
- **IPC**: Comunicación entre procesos

### Herramientas de Desarrollo

- **Turborepo**: Gestión de monorepo y caché
- **ESLint**: Linting de código
- **Prettier**: Formato de código
- **Vitest**: Framework de testing
- **Istanbul**: Cobertura de código

## Patrones de Diseño

### Atomic Design

Componentes organizados según metodología Atomic Design:

```
src/components/
├── atoms/          # Componentes básicos reutilizables
├── molecules/      # Grupos de átomos
├── organisms/      # Secciones complejas
├── templates/      # Layouts con slots
└── pages/          # Componentes de página completa
```

### Gestión de Estado

```typescript
// store/modules/project.ts
import { defineStore } from 'pinia'

export const useProjectStore = defineStore('project', {
  state: () => ({
    currentProject: null,
    openFiles: [],
    selectedElements: [],
  }),

  actions: {
    async loadProject(path: string) {
      // Cargar proyecto desde disco
    },

    selectElement(element: DOMElement) {
      // Agregar elemento a selección
    },
  },
})
```

### Comunicación IPC

```typescript
// Renderer -> Main
const result = await window.electronAPI.callAI(prompt, context)

// Main -> Renderer
ipcMain.handle('ai-request', async (event, prompt, context) => {
  const result = await aiService.generate(prompt, context)
  return result
})
```

## Integración de IA

### Abstracción de Motores

```typescript
interface AIEngine {
  name: string
  generate(prompt: string, context: Context): Promise<AIResponse>
  validateConfig(): boolean
}

class ClaudeEngine implements AIEngine {
  async generate(prompt: string, context: Context) {
    // Implementación específica de Claude
  }
}

class GeminiEngine implements AIEngine {
  async generate(prompt: string, context: Context) {
    // Implementación específica de Gemini
  }
}
```

### Context Management

```typescript
class ContextManager {
  buildContext(element: DOMElement, project: Project): Context {
    return {
      element: this.serializeElement(element),
      componentTree: this.getComponentTree(element),
      projectRules: project.playbooks,
      codeStyle: project.eslintConfig,
    }
  }
}
```

## Seguridad

### Aislamiento de Contexto

- **contextIsolation: true**: Aislar contextos de renderer
- **nodeIntegration: false**: Deshabilitar Node.js en renderer
- **Preload Scripts**: Exponer APIs controladas únicamente

### Validación de Entrada

```typescript
// Validación en Main Process
ipcMain.handle('write-file', async (event, filepath, content) => {
  // Validar path
  if (!isValidPath(filepath)) {
    throw new Error('Invalid file path')
  }

  // Validar permisos
  if (!hasWritePermission(filepath)) {
    throw new Error('Access denied')
  }

  // Sanitizar contenido
  const sanitizedContent = sanitize(content)

  return await fs.writeFile(filepath, sanitizedContent)
})
```

## Rendimiento

### Optimizaciones

- **Lazy Loading**: Cargar componentes bajo demanda
- **Virtual Scrolling**: Para listas grandes
- **Debounced Updates**: Evitar actualizaciones excesivas
- **Worker Threads**: Para operaciones pesadas

### Gestión de Memoria

```typescript
// Limpieza de recursos
class ResourceManager {
  private activeAIRequests = new Map()

  cleanup() {
    // Cancelar requests pendientes
    this.activeAIRequests.forEach((request) => request.abort())
    this.activeAIRequests.clear()
  }
}
```

## Testing

### Estrategia de Testing

- **Unit Tests**: Lógica de negocio y utilidades
- **Component Tests**: Componentes Vue aislados
- **Integration Tests**: Flujos completos
- **E2E Tests**: Casos de usuario reales

```typescript
// tests/visual-to-code.spec.ts
describe('Visual-to-Code Bridge', () => {
  it('should select elements correctly', async () => {
    const element = await page.locator('.target-element')
    await element.click()

    expect(await page.locator('.selected').count()).toBe(1)
  })
})
```

## Despliegue

### Build Process

```bash
# Build completo
pnpm build

# Empaquetar para diferentes plataformas
pnpm pack:prod  # Todas las plataformas
pnpm pack:mac   # Solo macOS
pnpm pack:win   # Solo Windows
pnpm pack:linux # Solo Linux
```

### Distribución

- **GitHub Releases**: Distribución automática
- **Auto-updater**: Actualizaciones en app
- **Code Signing**: Certificados de confianza
