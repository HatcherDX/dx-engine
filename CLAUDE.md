# CLAUDE.md - Hatcher DX Engine

## Configuración de Proyecto

### Arquitectura Tecnológica

- Frontend: Vue 3 + TypeScript + Vite
- Desktop: Electron para aplicaciones multiplataforma
- Build Tools: Turborepo (monorepo), Vite
- Testing: Vitest + Istanbul coverage
- Styling: CSS custom properties

### Estructura del Monorepo

```
dx-engine/
├── apps/                    # Aplicaciones Electron
│   ├── web/                # App web Vue
│   ├── electron/           # Proceso principal Electron
│   ├── preload/            # Scripts preload
│   └── docs/               # Documentación multiidioma
├── universal/              # Librerías universales
│   ├── vite-plugin/        # Plugin Vite personalizado
│   └── puppeteer-google-translate/  # Traductor automático
└── scripts/                # Scripts de automatización
```

## Comandos de Desarrollo

### 🚨 REGLA CRÍTICA: GESTIÓN DE DEPENDENCIAS

**NUNCA USAR NPM EN ESTE PROYECTO - SOLO PNPM**

- ❌ `npm install` - PROHIBIDO
- ❌ `npm run` - PROHIBIDO
- ❌ `npm ci` - PROHIBIDO
- ✅ `pnpm install` - CORRECTO
- ✅ `pnpm run` - CORRECTO
- ✅ `pnpm exec` - CORRECTO

Este es un **monorepo pnpm workspace**. Usar npm rompe la gestión de dependencias y workspaces.

### 🚨 REGLA CRÍTICA: VALIDACIÓN OBLIGATORIA POST-CAMBIOS

**DESPUÉS DE CADA CAMBIO DE CÓDIGO, EJECUTAR VALIDACIONES OBLIGATORIAS**

**ANTES DE DAR POR TERMINADA CUALQUIER TAREA, EJECUTAR:**

```bash
# OBLIGATORIO: Verificar formato de código
pnpm run format:check

# OBLIGATORIO: Verificar linting
pnpm lint
```

**SI CUALQUIERA DE ESTOS COMANDOS FALLA, LA TAREA NO ESTÁ COMPLETA**

- ❌ **INACEPTABLE**: Entregar código que rompe el format:check
- ❌ **INACEPTABLE**: Entregar código que rompe el linting
- ✅ **OBLIGATORIO**: Ambos comandos deben pasar exitosamente
- ✅ **OBLIGATORIO**: Si falla format:check, ejecutar `pnpm run format` para arreglar
- ✅ **OBLIGATORIO**: Si falla lint, arreglar todos los errores antes de continuar

**Esta validación es OBLIGATORIA para mantener la calidad del código y evitar problemas en CI/CD.**

### Comandos Principales

```bash
# Instalar dependencias (SOLO con pnpm)
pnpm install

# Desarrollo
pnpm dev

# Build de producción
pnpm build

# Tests con coverage
pnpm test:coverage

# Linting
pnpm lint

# Pack Electron (desarrollo)
pnpm pack:dev

# Pack Electron (producción)
pnpm pack:prod
```

## Patrones de Desarrollo

### Arquitectura de Componentes (Atomic Design)

#### Átomos (atoms/)

- Componentes básicos sin estado propio
- Controlados completamente por props
- Sin márgenes propios (espaciado controlado por padre)
- Ejemplos: BaseButton, BaseInput, IconComponent

```vue
<!-- ✅ CORRECTO: Átomo controlado por props -->
<template>
  <button :class="buttonClass" @click="emit('click', $event)">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'medium' },
})

const emit = defineEmits(['click'])
</script>
```

#### Moléculas (molecules/)

- Grupos de átomos con lógica mínima
- Candidatos ideales para v-model
- Ejemplos: SearchInput, FormField, ToolbarButton

#### Organismos (organisms/)

- Secciones complejas con datos reales
- Pueden manejar estado propio
- Ejemplos: AppHeader, DataTable, NavigationSidebar

#### Plantillas (templates/)

- Estructura con slots, sin lógica de negocio
- Uso intensivo de `<slot>` para inyección de contenido

#### Páginas (pages/views/)

- Componentes "inteligentes" con lógica principal
- Interactúan con stores, servicios y APIs
- Asignados a rutas en Vue Router

## Reglas de Desarrollo Estrictas

### ESLint y Calidad de Código

- NUNCA usar require(): Siempre ES6 imports
- NUNCA usar 'as any': Usar tipos TypeScript específicos
- Props estáticas sin binding: `title="Texto"` en lugar de `:title="'Texto'"`

### Comentarios en Código

**TODOS LOS COMENTARIOS EN CÓDIGO DEBEN SER EN INGLÉS**

```typescript
// ✅ CORRECTO: Comentarios en inglés
// Include all source code (excluding WIP)
include: [
  'apps/**/*.{js,ts,vue}',
  'universal/**/*.{js,ts}',
  'scripts/**/*.{js,ts}',
],

// Exclude irrelevant files
exclude: [
  '**/*.{test,spec}.{js,ts,vue}',
  // Exclude development scripts that don't need coverage
  'scripts/dev-electron.ts',
  'scripts/watch.ts',
]
```

```typescript
// ❌ INCORRECTO: Comentarios en español
// INCLUIR TODO EL CÓDIGO FUENTE (EXCLUYENDO WIP)
include: [
  'apps/**/*.{js,ts,vue}',
  'universal/**/*.{js,ts}',
  'scripts/**/*.{js,ts}',
],

// EXCLUIR ARCHIVOS NO RELEVANTES
exclude: [
  '**/*.{test,spec}.{js,ts,vue}',
  // Excluir scripts de desarrollo que no necesitan cobertura
  'scripts/dev-electron.ts',
  'scripts/watch.ts',
]
```

### Vue Router Navigation

- NUNCA usar string paths: Siempre object notation

```javascript
// ❌ INCORRECTO
router.push('/users/123')

// ✅ CORRECTO
router.push({ name: 'user-detail', params: { id: '123' } })
```

### Manejo de Eventos

- Componentes emiten eventos: No implementan lógica directamente
- Páginas manejan lógica: O emiten hacia App.vue para funcionalidad compartida
- App.vue maneja shared logic: Navegación, auth, modales globales

## Configuraciones Electron Específicas

### Proceso Principal (main.ts)

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  })

  // Development vs Production
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile('dist/index.html')
  }
}

app.whenReady().then(createWindow)
```

### Preload Script (preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readFile: (filepath: string) => ipcRenderer.invoke('read-file', filepath),
  writeFile: (filepath: string, data: string) =>
    ipcRenderer.invoke('write-file', filepath, data),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
})
```

### Vue + Electron Integration

```vue
<template>
  <div class="app">
    <TitleBar @minimize="handleMinimize" @close="handleClose" />
    <MainContent />
  </div>
</template>

<script setup>
// Verificar que estamos en Electron
const isElectron = window.electronAPI !== undefined

const handleMinimize = () => {
  if (isElectron) {
    window.electronAPI.minimizeWindow()
  }
}

const handleClose = () => {
  if (isElectron) {
    window.electronAPI.closeWindow()
  }
}
</script>
```

## Configuración de Testing

### Vitest Setup Global

```typescript
// vitest.setup.ts
import { vi } from 'vitest'

// Mock Electron APIs
global.window.electronAPI = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  getSystemInfo: vi.fn(() =>
    Promise.resolve({
      platform: 'test',
      arch: 'x64',
    })
  ),
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
}
```

### Convención de Archivos de Test

**NUNCA crear carpetas `__tests__`**. Los tests van junto al archivo que testean:

```
src/
├── controllers/
│   ├── indexController.ts
│   └── indexController.spec.ts    # ✅ CORRECTO
├── services/
│   ├── userService.ts
│   └── userService.spec.ts        # ✅ CORRECTO
└── utils/
    ├── formatters.ts
    └── formatters.spec.ts         # ✅ CORRECTO
```

**Patrón de naming**: `{filename}.spec.ts` (no `.test.ts`)

### Tests Simples

Los tests deben ser simples y no requerir mocks complejos:

```typescript
import { describe, it, expect } from 'vitest'

describe('Component', () => {
  it('should work without complex setup', () => {
    expect(true).toBe(true)
  })
})
```

## Consideraciones de Seguridad

### Configuración Segura

- contextIsolation: true: Aislar contexto del renderer
- nodeIntegration: false: Deshabilitar integración Node.js en renderer
- Preload scripts: Para exponer APIs de forma controlada
- Validación de input: Validar todos los datos del renderer

### Comunicación IPC Segura

```typescript
// ✅ CORRECTO: Validación en main process
ipcMain.handle('read-file', async (event, filepath) => {
  // Validar que el path es seguro
  if (!isValidPath(filepath)) {
    throw new Error('Invalid file path')
  }

  // Validar permisos
  if (!hasReadPermission(filepath)) {
    throw new Error('Access denied')
  }

  return await fs.readFile(filepath, 'utf8')
})
```

## Comandos de Testing

```bash
# Ejecutar TODOS los tests del monorepo
pnpm test

# Ejecutar tests con coverage de TODO el monorepo
pnpm test:coverage

# Ver el reporte HTML
open coverage/index.html
```

La configuración de testing es **global y simple**: un solo `vitest.config.ts` en la raíz encuentra automáticamente todos los tests sin scripts complejos.
