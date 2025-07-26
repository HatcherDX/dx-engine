# 코딩 표준

이 문서는 Hatcher 프로젝트의 코딩 표준과 규약을 개요합니다. 이러한 표준을 따르면 전체 코드베이스에서 일관성, 유지보수성 및 고품질 코드를 보장할 수 있습니다.

> **📊 준수 상태**: 2024년 12월 현재, 포괄적인 감사와 코드 개선을 통해 우리의 코드베이스는 이러한 표준에 **100% 준수**를 달성했습니다.

## 일반 원칙

### 코드 품질

- **영리함보다 명확함**: 읽고 이해하기 쉬운 코드를 작성하세요
- **일관성**: 코드베이스 전체에서 확립된 패턴을 따르세요
- **유지보수성**: 수정하고 확장하기 쉬운 코드를 작성하세요
- **성능**: 성능 영향을 고려하되, 먼저 가독성을 우선시하세요
- **문서화**: 모든 코드는 필요시 명확한 주석과 함께 자체 문서화되어야 합니다

### 언어 표준

- **영어만 사용**: 모든 주석, 문서, 변수명은 영어로 작성되어야 합니다
- **명확한 명명**: 목적을 명확히 나타내는 설명적인 이름을 사용하세요
- **약어 금지**: 널리 이해되는 것 외에는 약어를 피하세요 (예: `API`, `URL`)

### 파일 구조

- **단일 책임**: 각 파일은 단일하고 명확히 정의된 목적을 가져야 합니다
- **논리적 그룹화**: 관련된 기능을 함께 구성하세요
- **명확한 명명**: 목적을 명확히 나타내는 설명적인 이름을 사용하세요

## 포맷팅 표준

### 코드 스타일 (ESLint로 강제)

```typescript
// ✅ 좋음: 작은 따옴표, 세미콜론 없음, 2칸 들여쓰기
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ 피하세요: 큰 따옴표, 세미콜론, 일관성 없는 들여쓰기
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### 오류 처리

```typescript
// ✅ 좋음: 설명적인 오류 처리
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ 피하세요: 일반적인 오류 처리
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## TypeScript 표준

### 타입 정의

```typescript
// ✅ 좋음: 객체 형태에 인터페이스 사용
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ 피하세요: 간단한 객체 형태에 타입 별칭
type UserData = {
  id: string
  name: string
}
```

### 명명 규약

```typescript
// ✅ 좋음: 타입, 인터페이스, 클래스에 PascalCase
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ 좋음: 변수, 함수, 메서드에 camelCase
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ 좋음: 상수에 SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### 함수와 메서드 설계

```typescript
// ✅ 좋음: 적절한 타이핑을 가진 명확한 함수 시그니처
function processUserData(user: UserData): Promise<ProcessedUser> {
  // 구현
}

// ✅ 좋음: 공개 API에 JSDoc 사용
/**
 * 시각적 선택을 기반으로 코드 수정을 생성
 * @param selection - 선택된 DOM 요소들
 * @param context - 현재 프로젝트 컨텍스트
 * @returns 생성된 코드로 해결되는 Promise
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // 구현
}
```

## Vue.js 표준

### 컴포넌트 구조

```vue
<!-- ✅ 좋음: <script setup>과 함께 Composition API 사용 -->
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

// 컴포저블을 맨 위에
const { user } = useAuth()
const { theme } = useTheme()

// 반응형 데이터
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// 계산된 속성
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// 메서드
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
      <!-- 폼 내용 -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* 스타일 */
}
</style>
```

## 스타일 표준

### CSS 아키텍처

```scss
// ✅ 좋음: 테마를 위한 CSS 커스텀 속성 사용
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

// ✅ 좋음: 클래스명에 BEM 방법론
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

## 테스트 표준

### 단위 테스트

```typescript
// ✅ 좋음: 설명적인 테스트 구조
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

## 문서화 표준

### 코드 주석

```typescript
// ✅ 좋음: 무엇이 아닌 왜를 설명
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // AI 모델에서 토큰 오버플로우를 방지하기 위해 컨텍스트 크기를 제한합니다
  // 동시에 정확한 코드 생성을 위한 충분한 정보를 보장합니다
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Git 규약

### 커밋 메시지

[Conventional Commits](https://conventionalcommits.org/)를 따릅니다:

```bash
# ✅ 좋음: 명확하고 설명적인 커밋 메시지
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## 강제 적용

이러한 표준은 다음을 통해 강제 적용됩니다:

- **ESLint**: 자동화된 코드 스타일 검사
- **TypeScript**: 타입 안전성과 일관성
- **Prettier**: 코드 포맷팅
- **Husky**: Pre-commit 훅
- **CI/CD**: 자동화된 테스트와 린팅

### 로컬 개발

```bash
# 린팅 실행
pnpm lint

# 자동 수정 가능한 문제 해결
pnpm lint:fix

# 타입 검사
pnpm typecheck

# 테스트 실행
pnpm test
```

이러한 표준은 프로젝트와 커뮤니티 피드백과 함께 발전하는 살아있는 문서입니다.
