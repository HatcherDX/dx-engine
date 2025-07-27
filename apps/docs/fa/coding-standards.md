---
title: استانداردهای کدنویسی | راهنمای توسعه Hatcher IDE
description: استانداردهای رسمی کدنویسی و راهنمای توسعه برای Hatcher IDE. بهترین روش‌ها برای TypeScript، Vue، تست و حفظ کیفیت کد در پروژه.
---

# استانداردهای کدنویسی

این سند استانداردهای کدنویسی و قراردادهای پروژه Hatcher را تشریح می‌کند. پیروی از این استانداردها تضمین‌کننده قوام، قابلیت نگهداری و کد با کیفیت بالا در سراسر پایگاه کد است.

> **📊 وضعیت انطباق**: تا دسامبر 2024، پایگاه کد ما پس از بررسی جامع و بهبودهای کد به **100% انطباق** با این استانداردها دست یافته است.

## اصول کلی

### کیفیت کد

- **وضوح بر هوشمندی**: کدی بنویسید که خواندن و درک آن آسان باشد
- **قوام**: الگوهای تعیین‌شده را در سراسر پایگاه کد دنبال کنید
- **قابلیت نگهداری**: کدی بنویسید که تغییر و گسترش آن آسان باشد
- **عملکرد**: تأثیرات عملکرد را در نظر بگیرید، اما خوانایی را اولویت دهید
- **مستندسازی**: تمام کد باید خودمستند باشد و در صورت لزوم نظرات واضح داشته باشد

### استانداردهای زبان

- **فقط انگلیسی**: تمام نظرات، مستندات و نام متغیرها باید به زبان انگلیسی باشند
- **نام‌گذاری واضح**: از نام‌های توصیفی استفاده کنید که هدف را به وضوح نشان دهند
- **بدون مخفف**: از مخفف‌ها اجتناب کنید مگر اینکه به طور گسترده درک شوند (مثل `API`، `URL`)

### سازماندهی فایل‌ها

- **مسئولیت واحد**: هر فایل باید یک هدف واحد و به خوبی تعریف‌شده داشته باشد
- **گروه‌بندی منطقی**: عملکردهای مرتبط را با هم سازماندهی کنید
- **نام‌گذاری واضح**: از نام‌های توصیفی استفاده کنید که هدف را به وضوح نشان دهند

## استانداردهای قالب‌بندی

### سبک کد (توسط ESLint اجبار شده)

```typescript
// ✅ خوب: تک نقل‌قول، بدون نقطه‌ویرگول، تورفتگی 2 فاصله
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ اجتناب: دو نقل‌قول، نقطه‌ویرگول، تورفتگی ناسازگار
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### مدیریت خطا

```typescript
// ✅ خوب: مدیریت خطای توصیفی
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ اجتناب: مدیریت خطای عمومی
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## استانداردهای TypeScript

### تعاریف نوع

```typescript
// ✅ خوب: از interface برای شکل‌های شیء استفاده کنید
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ اجتناب: نام‌های مستعار نوع برای شکل‌های شیء ساده
type UserData = {
  id: string
  name: string
}
```

### قراردادهای نام‌گذاری

```typescript
// ✅ خوب: PascalCase برای انواع، رابط‌ها، کلاس‌ها
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ خوب: camelCase برای متغیرها، توابع، متدها
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ خوب: SCREAMING_SNAKE_CASE برای ثابت‌ها
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### طراحی توابع و متدها

```typescript
// ✅ خوب: امضاهای تابع واضح با تایپ مناسب
function processUserData(user: UserData): Promise<ProcessedUser> {
  // پیاده‌سازی
}

// ✅ خوب: از JSDoc برای APIهای عمومی استفاده کنید
/**
 * تغییرات کد را بر اساس انتخاب‌های بصری تولید می‌کند
 * @param selection - المان‌های DOM انتخاب‌شده
 * @param context - زمینه پروژه فعلی
 * @returns Promise که به کد تولیدشده حل می‌شود
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // پیاده‌سازی
}
```

## استانداردهای Vue.js

### ساختار کامپوننت

```vue
<!-- ✅ خوب: از Composition API با <script setup> استفاده کنید -->
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

// Composableها در بالا
const { user } = useAuth()
const { theme } = useTheme()

// داده‌های واکنشی
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// ویژگی‌های محاسبه‌شده
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// متدها
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
      <!-- محتوای فرم -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* استایل‌ها */
}
</style>
```

## استانداردهای استایل

### معماری CSS

```scss
// ✅ خوب: از ویژگی‌های سفارشی CSS برای تم‌بندی استفاده کنید
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

// ✅ خوب: روش‌شناسی BEM برای نام‌های کلاس
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

## استانداردهای تست

### تست‌های واحد

```typescript
// ✅ خوب: ساختار تست توصیفی
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

## استانداردهای مستندسازی

### نظرات کد

```typescript
// ✅ خوب: چرا را توضیح دهید، نه چه را
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // اندازه زمینه را محدود می‌کنیم تا از سرریز توکن در مدل‌های AI جلوگیری کنیم
  // در عین حال اطلاعات کافی برای تولید کد دقیق تضمین می‌کنیم
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## قراردادهای Git

### پیام‌های Commit

ما از [Conventional Commits](https://conventionalcommits.org/) پیروی می‌کنیم:

```bash
# ✅ خوب: پیام‌های commit واضح و توصیفی
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## اجرا

این استانداردها از طریق موارد زیر اجرا می‌شوند:

- **ESLint**: بررسی خودکار سبک کد
- **TypeScript**: ایمنی نوع و قوام
- **Prettier**: قالب‌بندی کد
- **Husky**: قلاب‌های pre-commit
- **CI/CD**: تست و linting خودکار

### توسعه محلی

```bash
# اجرای linting
pnpm lint

# رفع مسائل قابل تعمیر خودکار
pnpm lint:fix

# بررسی نوع
pnpm typecheck

# اجرای تست‌ها
pnpm test
```

این استانداردها اسناد زنده‌ای هستند که با پروژه و بازخورد جامعه تکامل می‌یابند.
