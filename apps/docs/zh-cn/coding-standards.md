---
title: 编码标准 | Hatcher IDE 开发指南
description: Hatcher IDE 的官方编码标准和开发指南。TypeScript、Vue、测试和维护项目代码质量的最佳实践。
---

# 编码标准

本文档阐述了 Hatcher 项目的编码标准和约定。遵循这些标准可以确保整个代码库的一致性、可维护性和高质量代码。

> **📊 符合性状态**：截至 2024 年 12 月，经过全面审计和代码改进，我们的代码库与这些标准的符合度达到了 **100%**。

## 通用原则

### 代码质量

- **明晰胜过巧姙**：编写易于阅读和理解的代码
- **一致性**：在整个代码库中遵循既定模式
- **可维护性**：编写易于修改和扩展的代码
- **性能**：考虑性能影响，但优先考虑可读性
- **文档**：所有代码都应该具有自文档化特性，必要时附有清晰的注释

### 语言标准

- **仅使用英语**：所有注释、文档和变量名称必须使用英语
- **清晰命名**：使用清晰表明目的的描述性名称
- **不使用缩写**：避免缩写，除非广泛理解（如 `API`、`URL`）

### 文件组织

- **单一职责**：每个文件应该有一个单一、明确定义的目的
- **逻辑分组**：将相关功能组织在一起
- **清晰命名**：使用清晰表明目的的描述性名称

## 格式化标准

### 代码风格（由 ESLint 强制执行）

```typescript
// ✅ 好：单引号、无分号、2 个空格缩进
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ 避免：双引号、分号、不一致的缩进
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### 错误处理

```typescript
// ✅ 好：描述性的错误处理
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ 避免：通用错误处理
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## TypeScript 标准

### 类型定义

```typescript
// ✅ 好：使用接口定义对象形状
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ 避免：使用类型别名定义简单对象形状
type UserData = {
  id: string
  name: string
}
```

### 命名约定

```typescript
// ✅ 好：类型、接口、类使用 PascalCase
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ 好：变量、函数、方法使用 camelCase
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ 好：常量使用 SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### 函数和方法设计

```typescript
// ✅ 好：具有适当类型的清晰函数签名
function processUserData(user: UserData): Promise<ProcessedUser> {
  // 实现
}

// ✅ 好：为公共 API 使用 JSDoc
/**
 * 基于视觉选择生成代码修改
 * @param selection - 选中的 DOM 元素
 * @param context - 当前项目上下文
 * @returns 解析为生成代码的 Promise
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // 实现
}
```

## Vue.js 标准

### 组件结构

```vue
<!-- ✅ 好：使用带有 <script setup> 的 Composition API -->
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

// 组合式函数放在顶部
const { user } = useAuth()
const { theme } = useTheme()

// 响应式数据
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// 计算属性
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// 方法
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
      <!-- 表单内容 -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* 样式 */
}
</style>
```

## 样式标准

### CSS 架构

```scss
// ✅ 好：使用 CSS 自定义属性进行主题化
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

// ✅ 好：类名使用 BEM 方法论
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

## 测试标准

### 单元测试

```typescript
// ✅ 好：描述性的测试结构
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

## 文档标准

### 代码注释

```typescript
// ✅ 好：解释“为什么”而不是“是什么”
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // 我们限制上下文大小以防止 AI 模型中的令牌溢出
  // 同时确保有足够的信息进行准确的代码生成
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Git 约定

### 提交消息

我们遵循 [Conventional Commits](https://conventionalcommits.org/)：

```bash
# ✅ 好：清晰、描述性的提交消息
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## 强制执行

这些标准通过以下方式强制执行：

- **ESLint**：自动化代码风格检查
- **TypeScript**：类型安全和一致性
- **Prettier**：代码格式化
- **Husky**：预提交钩子
- **CI/CD**：自动化测试和代码检查

### 本地开发

```bash
# 运行代码检查
pnpm lint

# 修复可自动修复的问题
pnpm lint:fix

# 类型检查
pnpm typecheck

# 运行测试
pnpm test
```

这些标准是随着项目和社区反馈不断发展的活文档。
