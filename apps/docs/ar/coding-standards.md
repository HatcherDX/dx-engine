# معايير البرمجة

تحدد هذه الوثيقة معايير البرمجة والاتفاقيات لمشروع Hatcher. اتباع هذه المعايير يضمن الاتساق وقابلية الصيانة والكود عالي الجودة عبر قاعدة الكود بأكملها.

> **📊 حالة الامتثال**: اعتباراً من ديسمبر 2024، تحقق قاعدة الكود الخاصة بنا **100% امتثال** لهذه المعايير بعد مراجعة شاملة وتحسينات الكود.

## المبادئ العامة

### جودة الكود

- **الوضوح على الذكاء**: اكتب كوداً سهل القراءة والفهم
- **الاتساق**: اتبع الأنماط المؤسسة عبر قاعدة الكود
- **قابلية الصيانة**: اكتب كوداً سهل التعديل والتوسيع
- **الأداء**: ضع في اعتبارك تأثيرات الأداء، لكن أولوية للقابلية للقراءة أولاً
- **التوثيق**: يجب أن يكون جميع الكود موثقاً ذاتياً مع تعليقات واضحة عند الضرورة

### معايير اللغة

- **الإنجليزية فقط**: يجب أن تكون جميع التعليقات والوثائق وأسماء المتغيرات باللغة الإنجليزية
- **التسمية الواضحة**: استخدم أسماء وصفية تشير بوضوح إلى الغرض
- **لا اختصارات**: تجنب الاختصارات إلا إذا كانت مفهومة على نطاق واسع (مثل `API`، `URL`)

### تنظيم الملفات

- **المسؤولية الواحدة**: يجب أن يكون لكل ملف غرض واحد محدد بوضوح
- **التجميع المنطقي**: نظم الوظائف ذات الصلة معاً
- **التسمية الواضحة**: استخدم أسماء وصفية تشير بوضوح إلى الغرض

## معايير التنسيق

### نمط الكود (مفروض بواسطة ESLint)

```typescript
// ✅ جيد: علامات اقتباس مفردة، بدون فواصل منقوطة، مسافة بادئة من مسافتين
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ تجنب: علامات اقتباس مزدوجة، فواصل منقوطة، مسافات بادئة غير متسقة
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### معالجة الأخطاء

```typescript
// ✅ جيد: معالجة أخطاء وصفية
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ تجنب: معالجة أخطاء عامة
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## معايير TypeScript

### تعريفات الأنواع

```typescript
// ✅ جيد: استخدم interfaces لأشكال الكائنات
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ تجنب: أسماء مستعارة للأنواع لأشكال الكائنات البسيطة
type UserData = {
  id: string
  name: string
}
```

### اتفاقيات التسمية

```typescript
// ✅ جيد: PascalCase للأنواع والواجهات والفئات
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ جيد: camelCase للمتغيرات والدوال والطرق
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ جيد: SCREAMING_SNAKE_CASE للثوابت
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### تصميم الدوال والطرق

```typescript
// ✅ جيد: توقيعات دوال واضحة مع كتابة مناسبة
function processUserData(user: UserData): Promise<ProcessedUser> {
  // التنفيذ
}

// ✅ جيد: استخدم JSDoc للواجهات العامة
/**
 * يولد تعديلات الكود بناءً على الاختيارات المرئية
 * @param selection - عناصر DOM المختارة
 * @param context - سياق المشروع الحالي
 * @returns Promise يحل إلى الكود المولد
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // التنفيذ
}
```

## معايير Vue.js

### هيكل المكون

```vue
<!-- ✅ جيد: استخدم Composition API مع <script setup> -->
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

// Composables في الأعلى
const { user } = useAuth()
const { theme } = useTheme()

// بيانات تفاعلية
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// خصائص محسوبة
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// طرق
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
      <!-- محتوى النموذج -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* أنماط */
}
</style>
```

## معايير الأنماط

### معمارية CSS

```scss
// ✅ جيد: استخدم خصائص CSS المخصصة للسمات
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

// ✅ جيد: منهجية BEM لأسماء الفئات
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

## معايير الاختبار

### اختبارات الوحدة

```typescript
// ✅ جيد: هيكل اختبار وصفي
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

## معايير التوثيق

### تعليقات الكود

```typescript
// ✅ جيد: اشرح لماذا وليس ماذا
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // نحد من حجم السياق لمنع فيض الرموز في نماذج الذكاء الاصطناعي
  // مع ضمان معلومات كافية لتوليد كود دقيق
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## اتفاقيات Git

### رسائل الالتزام

نتبع [Conventional Commits](https://conventionalcommits.org/):

```bash
# ✅ جيد: رسائل التزام واضحة ووصفية
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## الإنفاذ

يتم إنفاذ هذه المعايير من خلال:

- **ESLint**: فحص نمط الكود الآلي
- **TypeScript**: أمان الأنواع والاتساق
- **Prettier**: تنسيق الكود
- **Husky**: خطافات pre-commit
- **CI/CD**: اختبار وتدقيق آلي

### التطوير المحلي

```bash
# تشغيل التدقيق
pnpm lint

# إصلاح المشاكل القابلة للإصلاح التلقائي
pnpm lint:fix

# فحص الأنواع
pnpm typecheck

# تشغيل الاختبارات
pnpm test
```

هذه المعايير هي وثائق حية تتطور مع المشروع وتعليقات المجتمع.
