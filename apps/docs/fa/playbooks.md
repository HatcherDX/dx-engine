# Playbooks: زمینه هوشمند برای AI

> **به AI یاد بدهید پروژه شما را مانند یک عضو ارشد تیم درک کند.**

## Playbooks چیست؟

Playbooks سیستم زمینه پویای هستند که به شما اجازه می‌دهند دقیقاً تعریف کنید که AI چگونه باید codebase شما را درک کند، تفسیر کند و با آن تعامل داشته باشد.

## فلسفه Playbooks

### زمینه همه چیز است

قدرتمندترین AI تنها به اندازه زمینه‌ای که دریافت می‌کند خوب است. Playbooks تضمین می‌کنند که هر تعامل AI با درک عمیق از:

- معماری پروژه شما
- کنوانسیون‌های کدنویسی تعیین شده
- الگوهای طراحی مورد استفاده
- تصمیمات تجاری و فنی

### دانش قابل اجرا

برخلاف مستندات ایستا، Playbooks دانش قابل اجرا هستند که فعالانه رفتار AI را در هر تعامل شکل می‌دهند.

## ساختار Playbook

### Playbook پایه

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
  - 'همیشه از TypeScript سخت استفاده کنید'
  - 'کامپوننت‌ها باید رابط Props صریح داشته باشند'
  - 'برای استایل‌دهی از CSS Modules استفاده کنید'
  - 'برای کامپوننت‌های پیچیده error boundaries پیاده کنید'
```

### Playbook مخصوص حوزه

````yaml
# .hatcher/playbooks/ui-components.yaml
name: 'UI Components Playbook'
scope: 'src/components/**'
extends: 'core'

patterns:
  component_structure: |
    هر کامپوننت باید این ساختار را دنبال کند:
    1. رابط Props با مستندات
    2. کامپوننت اصلی با forwardRef در صورت نیاز
    3. Export پیش‌فرض با displayName
    4. Export نامگذاری شده برای زیرکامپوننت‌ها اگر وجود دارد

  styling_approach: |
    از سیستم طراحی با استفاده کنید:
    - Tailwind CSS برای utility classes
    - CSS Modules برای استایل‌دهی پیچیده
    - متغیرهای CSS برای theming

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

## انواع Playbooks

### 1. Playbook معماری

ساختار سطح بالا و تصمیمات طراحی را تعریف می‌کند:

```yaml
architecture:
  pattern: 'Clean Architecture'
  layers:
    - presentation: 'کامپوننت‌های UI و pages'
    - business: 'Use cases و domain logic'
    - data: 'Repository و external services'

  dependencies:
    direction: 'inward' # وابستگی‌ها به سمت درون اشاره می‌کنند
    external_services: 'abstractions only'
```

### 2. Playbook فریمورک

کنوانسیون‌های مخصوص فریمورک مورد استفاده:

```yaml
framework_conventions:
  next_js:
    routing: 'app-directory'
    data_fetching: 'server-components-first'
    state_management: 'zustand'

  react:
    hooks_rules:
      - 'برای منطق پیچیده از custom hooks استفاده کنید'
      - 'useEffect تنها برای side effects'
      - 'useState برای state محلی ساده'
```

### 3. Playbook تست

الگوها و رویه‌های تست:

```yaml
testing:
  philosophy: 'رفتار را تست کنید، نه پیاده‌سازی'

  patterns:
    unit_tests:
      - 'توابع خالص را جداگانه تست کنید'
      - 'وابستگی‌های خارجی را Mock کنید'

    integration_tests:
      - 'تعامل بین کامپوننت‌ها را تست کنید'
      - 'از data fixtures واقعی استفاده کنید'

    e2e_tests:
      - 'بر user journeys حیاتی تمرکز کنید'
      - 'Happy path و edge cases را تست کنید'

  tools:
    unit: 'vitest'
    integration: 'testing-library'
    e2e: 'playwright'
```

## زمینه پویا

### فعال‌سازی بر اساس Scope

Playbooks بر اساس فایلی که در حال کار است به طور خودکار فعال می‌شوند:

```yaml
# Playbook برای API routes
scope: "src/app/api/**"
context:
  api_patterns:
    - "برای اعتبارسنجی request از zod استفاده کنید"
    - "فرمت خطای سازگار برگردانید"
    - "HTTP status codes مناسب پیاده کنید"

# Playbook برای کامپوننت‌های UI
scope: "src/components/**"
context:
  ui_patterns:
    - "Responsive design پیاده کنید"
    - "از semantic HTML استفاده کنید"
    - "انطباق accessibility تضمین کنید"
```

### وراثت و ترکیب

```yaml
# Playbook پایه
name: "base"
conventions:
  typescript: "strict"
  formatting: "prettier"

# Playbook تخصصی
name: "react-components"
extends: "base"  # از پایه وراثت ببرید
conventions:
  react:
    hooks: "recommended-rules"
    props: "interface-required"
```

## مدیریت Playbook

### ایجاد Playbook جدید

```bash
# تولید قالب playbook
hatcher playbook create --name ui-patterns --scope "src/components/**"

# وارد کردن از پروژه دیگر
hatcher playbook import --from ../other-project/.hatcher/playbooks/
```

### اعتبارسنجی Playbook

```bash
# اعتبارسنجی syntax و ساختار
hatcher playbook validate

# تست playbook بر علیه codebase
hatcher playbook test --dry-run
```

### اشتراک Playbooks

```bash
# برای اشتراک export کنید
hatcher playbook export --output team-playbooks.tar.gz

# در registry منتشر کنید
hatcher playbook publish --registry team-registry
```

## قالب‌های Playbook

### قالب Next.js

```bash
hatcher playbook install next-js-app-router
hatcher playbook install react-typescript
hatcher playbook install tailwind-css
```

### قالب Backend

```bash
hatcher playbook install express-typescript
hatcher playbook install prisma-orm
hatcher playbook install graphql-api
```

## بهترین شیوه‌ها

### 1. ساده شروع کنید

```yaml
# با کنوانسیون‌های پایه شروع کنید
conventions:
  - 'از TypeScript strict mode استفاده کنید'
  - 'توصیه‌های ESLint را دنبال کنید'
  - 'کد خودمستند بنویسید'
```

### 2. بر اساس استفاده تکرار کنید

هم‌زمان با توسعه پروژه، زمینه مشخص‌تر اضافه کنید:

```yaml
# نسخه 1.0 - پایه
conventions:
  naming: "camelCase برای توابع"

# نسخه 1.1 - مشخص‌تر
conventions:
  naming:
    functions: "camelCase"
    constants: "UPPER_SNAKE_CASE"
    types: "PascalCase"
```

### 3. تصمیمات را مستند کنید

```yaml
decisions:
  state_management: |
    Zustand انتخاب شد به دلیل:
    - اندازه bundle کوچک
    - پشتیبانی خوب TypeScript
    - عدم نیاز به boilerplate
    - آسانی در تست

  styling_approach: |
    ترکیب Tailwind + CSS Modules:
    - Tailwind برای utility classes
    - CSS Modules برای کامپوننت‌های پیچیده
    - سازگاری با design system
```

### 4. از Examples استفاده کنید

````yaml
examples:
  api_route: |
    ```typescript
    // src/app/api/users/route.ts
    import { NextRequest } from 'next/server'
    import { userSchema } from '@/schemas/user'

    export async function POST(request: NextRequest) {
      try {
        const body = await request.json()
        const userData = userSchema.parse(body)
        
        // منطق کسب‌وکار در اینجا
        
        return Response.json({ success: true, data: userData })
      } catch (error) {
        return Response.json(
          { success: false, error: 'Invalid data' },
          { status: 400 }
        )
      }
    }
    ```
````

## عیب‌یابی

### Playbook اعمال نمی‌شود

```bash
# دیباگ فعال‌سازی playbook
hatcher playbook debug --file src/components/Button.tsx

# مشاهده playbooks فعال
hatcher playbook list --active
```

### تضاد بین Playbooks

```bash
# آنالیز تضادها
hatcher playbook conflicts

# حل با اولویت
hatcher playbook prioritize ui-components > general
```

---

**Playbooks AI را از یک دستیار عمومی به شریک توسعه‌ای تبدیل می‌کنند که زمینه مخصوص پروژه شما را درک می‌کند.**
