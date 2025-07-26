# Estándares de Codificación

Esta guía establece los estándares de codificación para contribuir a Hatcher, asegurando consistencia y calidad en todo el codebase.

## Configuración General

### TypeScript

- Usar TypeScript para todo el código nuevo
- Configuración strict habilitada
- Preferir tipos explícitos sobre `any`

```typescript
// ✅ Correcto
interface User {
  id: string
  name: string
  email: string
}

// ❌ Incorrecto
let user: any = { id: '1', name: 'John' }
```

### Formato

- Usar Prettier para formato automático
- Configuración: 2 espacios, sin semicolons, comillas simples

```typescript
// ✅ Correcto
const config = {
  name: 'hatcher',
  version: '0.1.0'
}

// ❌ Incorrecto
const config = {
    name: "hatcher",
    version: "0.1.0";
};
```

## Vue.js

### Composition API

Preferir Composition API sobre Options API:

```vue
<!-- ✅ Correcto -->
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<!-- ❌ Incorrecto -->
<script lang="ts">
export default {
  data() {
    return { count: 0 }
  },
  computed: {
    doubled() {
      return this.count * 2
    },
  },
}
</script>
```

### Componentes

- Usar PascalCase para nombres de componentes
- Props tipadas con interfaces
- Emits declarados explícitamente

```vue
<script setup lang="ts">
interface Props {
  title: string
  isVisible?: boolean
}

interface Emits {
  close: []
  update: [value: string]
}

defineProps<Props>()
defineEmits<Emits>()
</script>
```

## Electron

### IPC Seguro

```typescript
// Main Process
ipcMain.handle('safe-operation', async (event, data) => {
  // Validación
  if (!isValidData(data)) {
    throw new Error('Invalid data')
  }

  return await performOperation(data)
})

// Renderer Process
const result = await window.electronAPI.safeOperation(data)
```

### Preload Scripts

```typescript
// ✅ Correcto: API controlada
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
})

// ❌ Incorrecto: Exponer Node.js directamente
contextBridge.exposeInMainWorld('node', {
  fs: require('fs'),
})
```

## Naming Conventions

### Variables y Funciones

```typescript
// ✅ camelCase para variables y funciones
const userName = 'john'
const calculateTotal = (items: Item[]) => {}

// ✅ PascalCase para clases y componentes
class ProjectManager {}
const UserProfile = defineComponent({})

// ✅ UPPER_SNAKE_CASE para constantes
const MAX_RETRY_ATTEMPTS = 3
const API_BASE_URL = 'https://api.example.com'
```

### Archivos

```
components/atoms/BaseButton.vue     # PascalCase para componentes
utils/stringHelpers.ts             # camelCase para utilidades
types/apiTypes.ts                  # camelCase con sufijo
constants/appConstants.ts          # camelCase con sufijo
```

## Gestión de Estado

### Pinia Stores

```typescript
export const useProjectStore = defineStore('project', {
  state: () => ({
    currentProject: null as Project | null,
    isLoading: false,
    error: null as string | null,
  }),

  actions: {
    async loadProject(id: string) {
      this.isLoading = true
      try {
        this.currentProject = await projectApi.get(id)
        this.error = null
      } catch (error) {
        this.error = error.message
      } finally {
        this.isLoading = false
      }
    },
  },
})
```

## Manejo de Errores

### Error Boundaries

```typescript
// Tipos de error consistentes
interface AppError {
  code: string
  message: string
  details?: unknown
}

// Manejo centralizado
class ErrorHandler {
  static handle(error: AppError) {
    console.error(`[${error.code}] ${error.message}`, error.details)
    // Enviar a servicio de logging
  }
}
```

### Try-Catch

```typescript
// ✅ Correcto: Manejo específico
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  if (error instanceof ValidationError) {
    return { error: 'Invalid input' }
  }
  throw error // Re-throw si no podemos manejar
}
```

## Testing

### Naming

```typescript
// ✅ Descriptivo y específico
describe('ProjectManager', () => {
  describe('loadProject', () => {
    it('should load project when valid ID provided', () => {
      // test implementation
    })

    it('should throw error when project not found', () => {
      // test implementation
    })
  })
})
```

### Mocking

```typescript
// ✅ Mock específico
vi.mock('./projectApi', () => ({
  get: vi.fn().mockResolvedValue(mockProject),
}))

// ❌ Mock genérico
vi.mock('./projectApi', () => vi.fn())
```

## Documentación

### JSDoc

```typescript
/**
 * Calcula el total de items con descuentos aplicados
 * @param items - Lista de items a calcular
 * @param discountRate - Tasa de descuento (0-1)
 * @returns Total calculado con descuentos
 * @throws {ValidationError} Cuando la tasa de descuento es inválida
 */
function calculateTotal(items: Item[], discountRate: number): number {
  if (discountRate < 0 || discountRate > 1) {
    throw new ValidationError('Discount rate must be between 0 and 1')
  }
  // implementación
}
```

### README

Cada módulo debe tener documentación clara:

````markdown
# ProjectManager

Gestiona la carga y manipulación de proyectos.

## Usage

```typescript
const manager = new ProjectManager()
await manager.loadProject('project-id')
```
````

## API

- `loadProject(id: string): Promise<Project>`
- `saveProject(project: Project): Promise<void>`

````

## Performance

### Lazy Loading

```typescript
// ✅ Componentes lazy
const HeavyComponent = defineAsyncComponent(
  () => import('./HeavyComponent.vue')
)

// ✅ Módulos lazy
const heavyModule = await import('./heavyModule')
````

### Memoria

```typescript
// ✅ Cleanup en composables
export function useApiData() {
  const abortController = new AbortController()

  onUnmounted(() => {
    abortController.abort()
  })

  return {
    /* API data */
  }
}
```

## Git

### Commits

Usar Conventional Commits:

```bash
feat: add visual element selection
fix: resolve memory leak in AI service
docs: update API documentation
refactor: simplify project loading logic
```

### Branches

```bash
feature/visual-selection    # Nuevas características
fix/memory-leak             # Corrección de bugs
hotfix/security-patch       # Parches urgentes
```

## Herramientas

### Scripts

```bash
pnpm lint          # Ejecutar ESLint
pnpm lint:fix      # Corregir automáticamente
pnpm type-check    # Verificar tipos TypeScript
pnpm test          # Ejecutar tests
pnpm build         # Build de producción
```

### VSCode

Configuración recomendada (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Enforzamiento

Estas reglas se enfozan automáticamente a través de:

- **ESLint**: Reglas de código
- **Prettier**: Formato consistente
- **TypeScript**: Verificación de tipos
- **Husky**: Hooks de pre-commit
- **CI/CD**: Verificación en pull requests
