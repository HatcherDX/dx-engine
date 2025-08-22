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

### 🚨 REGLA CRÍTICA: CONTROL DE COMMITS

**NUNCA HACER COMMITS AUTOMÁTICAMENTE - SOLO EL DESARROLLADOR DECIDE**

- ❌ `git commit` automático - PROHIBIDO ABSOLUTO
- ❌ Commits con nombres genéricos - PROHIBIDO
- ✅ Solo el desarrollador decide cuándo commitear
- ✅ Solo el desarrollador escribe los mensajes de commit

### 🚨 REGLA CRÍTICA: GESTIÓN DE DEPENDENCIAS

**NUNCA USAR NPM EN ESTE PROYECTO - SOLO PNPM**

- ❌ `npm install` - PROHIBIDO
- ❌ `npm run` - PROHIBIDO
- ❌ `npm ci` - PROHIBIDO
- ✅ `pnpm install` - CORRECTO
- ✅ `pnpm run` - CORRECTO
- ✅ `pnpm exec` - CORRECTO

Este es un **monorepo pnpm workspace**. Usar npm rompe la gestión de dependencias y workspaces.

### 🚨 REGLA CRÍTICA: APLICACIÓN SOLO ELECTRON - NUNCA BROWSER

**ESTE ES UN IDE DESKTOP - NUNCA CORRERÁ EN BROWSER**

- ❌ **PROHIBIDO**: Lógica de fallback para browser
- ❌ **PROHIBIDO**: Detección de environment browser vs electron
- ❌ **PROHIBIDO**: Mock data para browser mode
- ❌ **PROHIBIDO**: `import.meta.env.DEV` checks para browser
- ✅ **OBLIGATORIO**: Usar SOLO `window.electronAPI` para operaciones Git
- ✅ **OBLIGATORIO**: Asumir que Electron APIs siempre están disponibles
- ✅ **OBLIGATORIO**: Si falla Electron API, mostrar error - NO fallback

**APLICACIONES QUE CORREN EN BROWSER:**

- `apps/docs/` - Solo documentación
- Todo lo demás es Electron desktop app

**ESTA REGLA ELIMINA COMPLEJIDAD INNECESARIA Y BUGS DE FALLBACK.**

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

### 🚨 REGLA CRÍTICA: MODIFICACIONES MANUALES - NO SCRIPTS BATCH

**NUNCA CREAR SCRIPTS PARA OPERACIONES BATCH O LIMPIEZA MASIVA**

- ❌ **PROHIBIDO**: Crear scripts para remover código/logs masivamente
- ❌ **PROHIBIDO**: Usar sed, awk o similares para modificaciones batch
- ❌ **PROHIBIDO**: Crear loops automatizados para modificar múltiples archivos
- ❌ **PROHIBIDO**: Scripts de "limpieza" o "refactoring" automático
- ✅ **OBLIGATORIO**: Hacer TODAS las modificaciones manualmente, archivo por archivo
- ✅ **OBLIGATORIO**: Revisar cada cambio individualmente antes de aplicarlo
- ✅ **OBLIGATORIO**: Usar las herramientas Edit/MultiEdit para cambios precisos

**RAZÓN**: Las operaciones batch pueden causar daños masivos no intencionados.
Cada modificación debe ser consciente, revisada y precisa.

**Esta regla garantiza que cada cambio sea intencional y controlado.**

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

### 🚨 REGLA CRÍTICA: CONVENCIONES DE INTERFACES TYPESCRIPT MODERNAS

**NUNCA USAR EL PREFIJO `I` EN INTERFACES - ESTILO OBSOLETO**

La convención del prefijo `I` (como `ITerminal`, `IUser`, `IConfig`) es obsoleta y no se recomienda en TypeScript moderno.

**❌ INCORRECTO - Estilo obsoleto:**

```typescript
interface ITerminal {
  id: string
  status: 'online' | 'offline'
}

interface IUserOptions {
  name: string
  email: string
}
```

**✅ CORRECTO - Estilo moderno:**

```typescript
interface Terminal {
  id: string
  status: 'online' | 'offline'
}

interface UserOptions {
  name: string
  email: string
}
```

**RAZONES PARA EVITAR EL PREFIJO `I`:**

1. **TypeScript ya diferencia tipos y valores** - No necesitas el prefijo para saber que es una interfaz
2. **Mejor legibilidad** - Nombres más limpios y descriptivos
3. **Consistencia con la comunidad** - Angular, React, Node.js, etc., usan este estilo moderno
4. **Facilita refactoring** - Si cambias de interface a type, no necesitas cambiar el nombre

**CONVENCIONES DE NAMING MODERNAS:**

- ✅ `Terminal` (nombre descriptivo directo)
- ✅ `TerminalConfig` (con sufijo semántico)
- ✅ `TerminalOptions` (con sufijo semántico)
- ✅ `UserProps` (para componentes Vue/React)
- ✅ `APIResponse<T>` (genérico descriptivo)

**ESTA REGLA ES OBLIGATORIA PARA MANTENER CONSISTENCIA CON EL ECOSISTEMA TYPESCRIPT MODERNO.**

### 🚨 REGLA CRÍTICA: DOCUMENTACIÓN TSDOC OBLIGATORIA

**TODA FUNCIÓN, CLASE, INTERFACE Y TIPO DEBE TENER DOCUMENTACIÓN TSDOC**

**ANTES DE CADA CAMBIO DE CÓDIGO, REFRESCAR O CREAR DOCUMENTACIÓN TSDOC:**

````typescript
/**
 * Calculates the average of two numbers using arithmetic mean.
 *
 * @remarks
 * This method is part of the {@link core-library#Statistics | Statistics subsystem}.
 * Used for basic mathematical operations throughout the application.
 *
 * @param x - The first input number
 * @param y - The second input number
 * @returns The arithmetic mean of `x` and `y`
 *
 * @example
 * ```typescript
 * const result = getAverage(10, 20);
 * console.log(result); // 15
 * ```
 *
 * @throws {@link ValidationError}
 * Thrown when either parameter is not a valid number
 *
 * @beta
 * @since 1.0.0
 */
public static getAverage(x: number, y: number): number {
  return (x + y) / 2.0;
}
````

**TAGS TSDOC OBLIGATORIOS:**

- `@param` - Para cada parámetro de función
- `@returns` - Para valor de retorno (si no es void)
- `@throws` - Para excepciones posibles
- `@example` - Al menos un ejemplo de uso
- `@remarks` - Contexto adicional y propósito
- `@since` - Versión donde se introdujo

**TAGS TSDOC DE ESTADO:**

- `@alpha` - API experimental, puede cambiar
- `@beta` - API estable pero puede cambiar
- `@public` - API pública estable
- `@internal` - Solo para uso interno
- `@deprecated` - Marcado para eliminación

**DOCUMENTACIÓN ESPECÍFICA POR TIPO:**

````typescript
/**
 * Configuration interface for terminal creation options.
 *
 * @remarks
 * Used throughout the terminal system to standardize terminal initialization.
 * All properties are optional with sensible defaults.
 *
 * @public
 * @since 1.0.0
 */
interface TerminalOptions {
  /**
   * Display name for the terminal tab.
   * @defaultValue "Terminal"
   */
  name?: string

  /**
   * Working directory for the terminal session.
   * @defaultValue Current working directory
   */
  cwd?: string

  /**
   * Shell command to execute.
   * @defaultValue System default shell
   */
  shell?: string
}

/**
 * Manages terminal instances and their lifecycle.
 *
 * @remarks
 * Central hub for all terminal operations including creation, destruction,
 * and communication with the underlying shell processes.
 *
 * @example
 * ```typescript
 * const manager = new TerminalManager();
 * const terminal = await manager.createTerminal({
 *   name: "Development",
 *   cwd: "/home/user/project"
 * });
 * ```
 *
 * @public
 * @since 1.0.0
 */
class TerminalManager {
  /**
   * Creates a new terminal instance with specified options.
   *
   * @param options - Configuration for the new terminal
   * @returns Promise that resolves to the created terminal instance
   *
   * @throws {@link TerminalCreationError}
   * Thrown when terminal creation fails due to system constraints
   *
   * @example
   * ```typescript
   * const terminal = await manager.createTerminal({
   *   name: "Node.js",
   *   shell: "node"
   * });
   * ```
   */
  async createTerminal(options: TerminalOptions): Promise<Terminal> {
    // Implementation
  }
}
````

**REGLAS DE DOCUMENTACIÓN:**

- ❌ **INACEPTABLE**: Código sin documentación TSDoc
- ❌ **INACEPTABLE**: Documentación en español
- ❌ **INACEPTABLE**: Documentación incompleta (sin @param/@returns)
- ❌ **INACEPTABLE**: Cambios sin actualizar documentación TSDoc existente
- ✅ **OBLIGATORIO**: Documentación completa en inglés
- ✅ **OBLIGATORIO**: Ejemplos de uso funcionalmente correctos
- ✅ **OBLIGATORIO**: Referencias cruzadas con {@link}
- ✅ **OBLIGATORIO**: Al hacer cambios, refrescar TSDoc existente o crear nueva documentación
- ✅ **OBLIGATORIO**: Usar TSDoc como banco de contexto para entender el sistema

**POLÍTICA DE ACTUALIZACIÓN DE TSDOC:**

Cada cambio de código DEBE incluir actualización de documentación TSDoc:

1. **Al modificar funciones existentes**: Actualizar @param, @returns, @example
2. **Al agregar nuevas funciones**: Documentación TSDoc completa obligatoria
3. **Al refactorizar**: Verificar y actualizar todas las referencias {@link}
4. **Al cambiar comportamiento**: Actualizar @remarks y @example

**ESTA POLÍTICA GARANTIZA QUE LA DOCUMENTACIÓN SIRVA COMO BANCO DE CONTEXTO CONFIABLE PARA FUTURAS MODIFICACIONES.**

**ESTRUCTURA OBLIGATORIA DE TSDOC:**

Según las mejores prácticas de Microsoft TSDoc, cada archivo debe seguir esta estructura:

````typescript
/**
 * @fileoverview Brief description of the file's purpose.
 *
 * @description
 * Detailed explanation of the module/component functionality,
 * its role within the system, and key architectural decisions.
 *
 * @example
 * ```typescript
 * // Functional example showing typical usage
 * const example = new MyClass()
 * const result = await example.process()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Class/interface description.
 *
 * @remarks
 * Additional context, implementation notes, or architectural considerations.
 * Use {@link RelatedClass} for cross-references.
 *
 * @public | @internal | @beta
 */
export class MyClass {
  /**
   * Method description explaining what it does.
   *
   * @param paramName - Description of the parameter
   * @returns Description of return value with {@link ReturnType}
   *
   * @throws {@link ErrorType} Description of when this error occurs
   *
   * @example
   * ```typescript
   * const result = await myClass.methodName('input')
   * console.log(result) // Expected output
   * ```
   *
   * @public
   */
  async methodName(paramName: string): Promise<ReturnType> {
    // Implementation
  }
}
````

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
