---
title: نظام الكتب الإرشادية | إدارة السياق الديناميكي للذكاء الاصطناعي للفرق
description: أتقن نظام الكتب الإرشادية في Hatcher - الحل من الجيل التالي لإدارة سياق الذكاء الاصطناعي. أنشئ دساتير شركات ديناميكية وقابلة للإدارة تعلم الذكاء الاصطناعي معايير الترميز والقرارات المعمارية لفريقك.
---

# ملفات اللعب: سياق ذكي للذكاء الاصطناعي

> **علم الذكاء الاصطناعي فهم مشروعك مثل عضو فريق متقدم.**

## ما هي ملفات اللعب؟

ملفات اللعب هي نظام سياق ديناميكي يسمح لك بتحديد بدقة كيف يجب على الذكاء الاصطناعي فهم وتفسير والتفاعل مع قاعدة الأكواد الخاصة بك.

## فلسفة ملفات اللعب

### السياق هو كل شيء

حتى أقوى ذكاء اصطناعي هو بجودة السياق الذي يتلقاه. تضمن ملفات اللعب أن كل تفاعل مع الذكاء الاصطناعي يأتي مع فهم عميق لـ:

- هندسة مشروعك
- اتفاقيات البرمجة المعتمدة
- أنماط التصميم المستخدمة
- قرارات الأعمال والتقنية

### المعرفة قابلة للتنفيذ

على عكس الوثائق الثابتة، ملفات اللعب هي معرفة قابلة للتنفيذ تشكل بنشاط سلوك الذكاء الاصطناعي في كل تفاعل.

## بنية ملف اللعب

### ملف لعب أساسي

```yaml
# .hatcher/playbooks/core.yaml
name: 'Core Project Playbook'
version: '1.0.0'
scope: 'global'

project:
  name: 'E-commerce Platform'
  framework: 'Next.js'
  architecture: 'modular-monolith'

conventions:
  naming:
    components: 'PascalCase'
    functions: 'camelCase'
    files: 'kebab-case'

  structure:
    components: 'src/components'
    pages: 'src/pages'
    utils: 'src/utils'
    types: 'src/types'

standards:
  - 'استخدم دائماً TypeScript الصارم'
  - 'يجب أن تحتوي المكونات على واجهة Props صريحة'
  - 'استخدم CSS Modules للتنسيق'
  - 'قم بتنفيذ error boundaries للمكونات المعقدة'
```

### ملف لعب مخصص للمجال

````yaml
# .hatcher/playbooks/ui-components.yaml
name: 'UI Components Playbook'
scope: 'src/components/**'
extends: 'core'

patterns:
  component_structure: |
    يجب أن يتبع كل مكون هذا الهيكل:
    1. واجهة Props مع التوثيق
    2. مكون رئيسي مع forwardRef إذا لزم الأمر
    3. تصدير افتراضي مع displayName
    4. تصدير مسمى للمكونات الفرعية إن وجدت

  styling_approach: |
    استخدم نظام التصميم مع:
    - Tailwind CSS لـ utility classes
    - CSS Modules للتنسيق المعقد
    - متغيرات CSS للقوالب

examples:
  button_component: |
    ```typescript
    interface ButtonProps {
      variant: 'primary' | 'secondary' | 'outline'
      size: 'sm' | 'md' | 'lg'
      children: React.ReactNode
      onClick?: () => void
    }

    export const Button = ({ variant, size, children, ...props }: ButtonProps) => {
      return (
        <button 
          className={`btn btn-${variant} btn-${size}`}
          {...props}
        >
          {children}
        </button>
      )
    }
    ```
````

## أنواع ملفات اللعب

### 1. ملف لعب هندسي

يحدد الهيكل رفيع المستوى وقرارات التصميم:

```yaml
architecture:
  pattern: 'Clean Architecture'
  layers:
    - presentation: 'مكونات UI والصفحات'
    - business: 'Use cases ومنطق المجال'
    - data: 'Repository والخدمات الخارجية'

  dependencies:
    direction: 'inward' # الاعتماديات تشير للداخل
    external_services: 'abstractions only'
```

### 2. ملف لعب إطار العمل

اتفاقيات مخصصة لإطار العمل المستخدم:

```yaml
framework_conventions:
  next_js:
    routing: 'app-directory'
    data_fetching: 'server-components-first'
    state_management: 'zustand'

  react:
    hooks_rules:
      - 'استخدم custom hooks للمنطق المعقد'
      - 'useEffect فقط للتأثيرات الجانبية'
      - 'useState للحالة المحلية البسيطة'
```

### 3. ملف لعب الاختبار

أنماط وممارسات الاختبار:

```yaml
testing:
  philosophy: 'اختبر السلوك، ليس التنفيذ'

  patterns:
    unit_tests:
      - 'اختبر الدوال النقية بشكل منفصل'
      - 'قم بMock الاعتماديات الخارجية'

    integration_tests:
      - 'اختبر التفاعل بين المكونات'
      - 'استخدم بيانات fixtures واقعية'

    e2e_tests:
      - 'ركز على رحلات المستخدم الحرجة'
      - 'اختبر المسار السعيد والحالات الحدية'

  tools:
    unit: 'vitest'
    integration: 'testing-library'
    e2e: 'playwright'
```

## السياق الديناميكي

### التفعيل بناءً على النطاق

يتم تفعيل ملفات اللعب تلقائياً بناءً على الملف قيد العمل:

```yaml
# ملف لعب لـ API routes
scope: "src/app/api/**"
context:
  api_patterns:
    - "استخدم zod للتحقق من الطلبات"
    - "أرجع نسق خطأ متسق"
    - "نفذ رموز حالة HTTP مناسبة"

# ملف لعب لمكونات UI
scope: "src/components/**"
context:
  ui_patterns:
    - "نفذ تصميم متجاوب"
    - "استخدم HTML دلالي"
    - "ضمن الامتثال لمعايير إمكانية الوصول"
```

### الوراثة والتركيب

```yaml
# ملف لعب أساسي
name: "base"
conventions:
  typescript: "strict"
  formatting: "prettier"

# ملف لعب متخصص
name: "react-components"
extends: "base"  # وراثة من الأساسي
conventions:
  react:
    hooks: "recommended-rules"
    props: "interface-required"
```

## إدارة ملفات اللعب

### إنشاء ملف لعب جديد

```bash
# توليد قالب ملف لعب
hatcher playbook create --name ui-patterns --scope "src/components/**"

# استيراد من مشروع آخر
hatcher playbook import --from ../other-project/.hatcher/playbooks/
```

### التحقق من ملف اللعب

```bash
# التحقق من البنية والنحو
hatcher playbook validate

# اختبار ملف اللعب على قاعدة الأكواد
hatcher playbook test --dry-run
```

### مشاركة ملفات اللعب

```bash
# تصدير للمشاركة
hatcher playbook export --output team-playbooks.tar.gz

# نشر في السجل
hatcher playbook publish --registry team-registry
```

## قوالب ملفات اللعب

### قالب Next.js

```bash
hatcher playbook install next-js-app-router
hatcher playbook install react-typescript
hatcher playbook install tailwind-css
```

### قالب الخلفية

```bash
hatcher playbook install express-typescript
hatcher playbook install prisma-orm
hatcher playbook install graphql-api
```

## أفضل الممارسات

### 1. ابدأ ببساطة

```yaml
# ابدأ بالاتفاقيات الأساسية
conventions:
  - 'استخدم وضع TypeScript الصارم'
  - 'اتبع توصيات ESLint'
  - 'اكتب كوداً ذاتي التوثيق'
```

### 2. التكرار بناءً على الاستخدام

أضف سياقاً أكثر تحديداً مع نمو المشروع:

```yaml
# الإصدار 1.0 - أساسي
conventions:
  naming: "camelCase للدوال"

# الإصدار 1.1 - أكثر تحديداً
conventions:
  naming:
    functions: "camelCase"
    constants: "UPPER_SNAKE_CASE"
    types: "PascalCase"
```

### 3. وثق القرارات

```yaml
decisions:
  state_management: |
    تم اختيار Zustand بسبب:
    - حجم الحزمة الصغير
    - دعم TypeScript جيد
    - عدم الحاجة لboilerplate
    - سهولة الاختبار

  styling_approach: |
    دمج Tailwind + CSS Modules:
    - Tailwind لـ utility classes
    - CSS Modules للمكونات المعقدة
    - الاتساق مع نظام التصميم
```

---

**ملفات اللعب تحول الذكاء الاصطناعي من مساعد عام إلى شريك تطوير يفهم السياق المحدد لمشروعك.**
