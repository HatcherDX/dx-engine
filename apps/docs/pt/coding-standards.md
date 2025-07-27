---
title: Padrões de Codificação | Diretrizes de Desenvolvimento do Hatcher IDE
description: Padrões de codificação oficiais e diretrizes de desenvolvimento para Hatcher IDE. Melhores práticas para TypeScript, Vue, testes e manutenção da qualidade do código no projeto.
---

# Padrões de Código

Este documento descreve os padrões de codificação e convenções para o projeto Hatcher. Seguir esses padrões garante consistência, manutenibilidade e código de alta qualidade em toda a base de código.

> **📊 Status de Conformidade**: Em dezembro de 2024, nossa base de código atinge **100% de conformidade** com esses padrões após auditoria abrangente e melhorias no código.

## Princípios Gerais

### Qualidade do Código

- **Clareza sobre esperteza**: Escrever código que seja fácil de ler e entender
- **Consistência**: Seguir padrões estabelecidos em toda a base de código
- **Manutenibilidade**: Escrever código que seja fácil de modificar e estender
- **Performance**: Considerar implicações de performance, mas priorizar legibilidade primeiro
- **Documentação**: Todo código deve ser autodocumentável com comentários claros quando necessário

### Padrões de Idioma

- **Apenas Inglês**: Todos os comentários, documentação e nomes de variáveis devem estar em inglês
- **Nomenclatura clara**: Usar nomes descritivos que indiquem claramente o propósito
- **Sem abreviações**: Evitar abreviações a menos que sejam amplamente compreendidas (ex: `API`, `URL`)

### Organização de Arquivos

- **Responsabilidade única**: Cada arquivo deve ter um propósito único e bem definido
- **Agrupamento lógico**: Organizar funcionalidades relacionadas juntas
- **Nomenclatura clara**: Usar nomes descritivos que indiquem claramente o propósito

## Padrões de Formatação

### Estilo de Código (Aplicado pelo ESLint)

```typescript
// ✅ Bom: Aspas simples, sem ponto e vírgula, indentação de 2 espaços
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ Evitar: Aspas duplas, ponto e vírgula, indentação inconsistente
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### Tratamento de Erros

```typescript
// ✅ Bom: Tratamento de erro descritivo
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ Evitar: Tratamento de erro genérico
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## Padrões TypeScript

### Definições de Tipos

```typescript
// ✅ Bom: Usar interfaces para formas de objetos
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ Evitar: Type aliases para formas de objetos simples
type UserData = {
  id: string
  name: string
}
```

### Convenções de Nomenclatura

```typescript
// ✅ Bom: PascalCase para tipos, interfaces, classes
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ Bom: camelCase para variáveis, funções, métodos
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ Bom: SCREAMING_SNAKE_CASE para constantes
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

## Padrões Vue.js

### Estrutura de Componente

```vue
<!-- ✅ Bom: Usar Composition API com <script setup> -->
<script setup lang="ts">
interface Props {
  title: string
  isVisible?: boolean
}

interface Emits {
  close: []
  submit: [data: FormData]
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: true,
})

const emit = defineEmits<Emits>()

// Composables no topo
const { user } = useAuth()
const { theme } = useTheme()

// Dados reativos
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// Propriedades computadas
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// Métodos
function handleSubmit() {
  if (!isFormValid.value) return

  isLoading.value = true
  emit('submit', formData)
}
</script>

<template>
  <div v-if="isVisible" class="modal">
    <h2>{{ title }}</h2>
    <form @submit.prevent="handleSubmit">
      <!-- Conteúdo do formulário -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* Styles */
}
</style>
```

## Padrões de Estilo

### Arquitetura CSS

```scss
// ✅ Bom: Usar propriedades customizadas CSS para temas
:root {
  --hatcher-primary: #646cff;
  --hatcher-secondary: #42b883;
  --hatcher-background: #1a1a1a;
  --hatcher-text: #ffffff;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

// ✅ Bom: Metodologia BEM para nomes de classes
.code-editor {
  /* Block */
}

.code-editor__toolbar {
  /* Element */
}

.code-editor__button {
  /* Element */
}

.code-editor__button--active {
  /* Modifier */
}
```

## Padrões de Teste

### Testes Unitários

```typescript
// ✅ Bom: Estrutura de teste descritiva
describe('useVisualSelection', () => {
  describe('startSelection', () => {
    it('should set isSelecting to true', () => {
      const { isSelecting, startSelection } = useVisualSelection()

      startSelection()

      expect(isSelecting.value).toBe(true)
    })
  })
})
```

## Padrões de Documentação

### Comentários de Código

```typescript
// ✅ Bom: Explicar PORQUÊ, não O QUÊ
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // Limitamos o tamanho do contexto para prevenir overflow de tokens nos modelos AI
  // enquanto garantimos informações suficientes para geração de código precisa
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Convenções Git

### Mensagens de Commit

Seguimos [Conventional Commits](https://conventionalcommits.org/):

```bash
# ✅ Bom: Mensagens de commit claras e descritivas
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## Aplicação

Esses padrões são aplicados através de:

- **ESLint**: Verificação automatizada de estilo de código
- **TypeScript**: Segurança de tipos e consistência
- **Prettier**: Formatação de código
- **Husky**: Hooks de pré-commit
- **CI/CD**: Testes e linting automatizados

### Desenvolvimento Local

```bash
# Executar linting
pnpm lint

# Corrigir problemas auto-corregíveis
pnpm lint:fix

# Verificação de tipos
pnpm typecheck

# Executar testes
pnpm test
```

Esses padrões são documentos vivos que evoluem com o projeto e feedback da comunidade.
