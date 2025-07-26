# پل بصری-به-کد

> **تبدیل مستقیم از تعامل بصری به تغییرات دقیق کد.**

## نمای کلی

پل بصری-به-کد ویژگی اصلی Hatcher است که به توسعه‌دهندگان اجازه می‌دهد با اپلیکیشن‌هایشان به صورت بصری تعامل کنند در حالی که تغییرات دقیق و قطعی کد تولید می‌کند.

## نحوه کارکرد

### 1. حالت بازرسی بصری

حالت بازرسی را برای شروع انتخاب عناصر در اپلیکیشن خود فعال کنید:

```bash
# شروع سرور توسعه با بازرسی بصری
hatcher dev --visual-inspect
```

### 2. انتخاب عناصر

- **Hover**: عناصر را برای دیدن اطلاعات ساختار هایلایت کنید
- **Click**: عنصری را برای تغییر انتخاب کنید
- **Multi-select**: از Cmd/Ctrl + کلیک برای انتخاب چندین عنصر استفاده کنید

### 3. زمینه خودکار

وقتی عنصری را انتخاب می‌کنید، Hatcher به طور خودکار:

- کامپوننت‌ها و فایل‌های مرتبط را شناسایی می‌کند
- ساختار سلسله‌مراتبی را آنالیز می‌کند
- Playbook‌های مرتبط را بارگیری می‌کند
- زمینه را برای AI آماده می‌کند

## انواع تغییرات

### استایل‌دهی و چیدمان

```typescript
// قبل: عنصر به صورت بصری انتخاب شده
<div className="container">
  <h1>عنوان</h1>
</div>

// دستور: "عنوان را آبی و وسط‌چین کن"
// بعد: کد به طور خودکار تغییر یافته
<div className="container">
  <h1 className="text-blue-600 text-center">عنوان</h1>
</div>
```

### ساختار کامپوننت

```typescript
// قبل: کامپوننت ساده
function Header() {
  return <h1>خوش آمدید</h1>
}

// دستور: "ناوبری با منوی خانه و درباره اضافه کن"
// بعد: ساختار گسترش یافته
function Header() {
  return (
    <header>
      <h1>خوش آمدید</h1>
      <nav>
        <a href="/">خانه</a>
        <a href="/about">درباره</a>
      </nav>
    </header>
  )
}
```

### منطق کسب‌وکار

```typescript
// قبل: کامپوننت استاتیک
function Counter() {
  return <div>0</div>
}

// دستور: "این را به شمارنده‌ای تبدیل کن که با کلیک افزایش یابد"
// بعد: منطق اضافه شده
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div onClick={() => setCount(count + 1)}>
      {count}
    </div>
  )
}
```

## نقشه‌برداری بصری-به-کد

### شناسایی کامپوننت

Hatcher از چندین استراتژی برای نقشه‌برداری عناصر بصری به کد استفاده می‌کند:

1. **React DevTools Integration**: استفاده از ابزارهای توسعه React
2. **Source Maps**: نقشه‌برداری از عناصر DOM به کد منبع
3. **AST Analysis**: آنالیز درخت نحو انتزاعی برای درک ساختار
4. **Convention Detection**: تشخیص خودکار الگوها و کنوانسیون‌های پروژه

### حل سلسله‌مراتب

```typescript
// ساختار عنصر انتخاب شده
App
  └── Layout
      └── Content
          └── ProductCard  // ← عنصر انتخاب شده
              ├── Image
              ├── Title
              └── Price
```

وقتی `ProductCard` انتخاب می‌شود، Hatcher درک می‌کند:

- کامپوننت والد (`Content`)
- کامپوننت‌های فرزند (`Image`, `Title`, `Price`)
- Props و state موجود
- استایل‌های اعمال شده

## پیکربندی

### تنظیمات فریمورک

```json
// hatcher.config.json
{
  "visualBridge": {
    "framework": "react",
    "bundler": "vite",
    "sourceMapEnabled": true,
    "devtoolsIntegration": true
  }
}
```

### نقشه‌برداری انتخابگرها

```json
{
  "selectorMapping": {
    "components": {
      "[data-component]": "component",
      ".card": "ui-element",
      "#main": "layout"
    }
  }
}
```

## حالت دیباگ

### بازرسی عمیق

```bash
# حالت دیباگ با اطلاعات تفصیلی
hatcher dev --visual-inspect --debug
```

در حالت دیباگ، می‌توانید ببینید:

- نقشه‌برداری عنصر-به-فایل در زمان واقعی
- نودهای AST شناسایی شده
- زمینه ارسال شده به AI
- پیش‌بینی تغییرات قبل از اعمال

### اطلاعات همپوشان

حالت دیباگ اطلاعات همپوشان نمایش می‌دهد:

- مسیر فایل کامپوننت
- Props موجود
- State فعلی
- Playbook فعال

## بهترین شیوه‌ها

### 1. استفاده از Data Attributes

```typescript
// کمک به شناسایی کامپوننت
<div data-component="ProductCard" data-id={product.id}>
  <img src={product.image} data-element="product-image" />
  <h3 data-element="product-title">{product.title}</h3>
</div>
```

### 2. ساختار کامپوننت واضح

```typescript
// ساختار قابل شناسایی آسان
function ProductCard({ product }: Props) {
  return (
    <article className="product-card">
      <ProductImage src={product.image} />
      <ProductInfo title={product.title} price={product.price} />
    </article>
  )
}
```

### 3. ثبات در نام‌گذاری

```typescript
// الگوی نام‌گذاری ثابت
const ProductCard = () => {}
const ProductImage = () => {}
const ProductInfo = () => {}
```

## عیب‌یابی

### عنصر تشخیص داده نمی‌شود

```bash
# بررسی پیکربندی فریمورک
hatcher doctor --visual-bridge

# تأیید source maps
hatcher dev --debug-source-maps
```

### تغییرات نادرست

1. Playbook را برای زمینه مشخص‌تر بررسی کنید
2. از انتخابگرهای data attribute صریح‌تر استفاده کنید
3. تأیید کنید که ساختار کامپوننت مطابق کنوانسیون است

### مسائل عملکرد

```json
// بهینه‌سازی برای پروژه‌های بزرگ
{
  "visualBridge": {
    "throttleInspection": true,
    "cacheComponentMap": true,
    "limitScanDepth": 5
  }
}
```

---

**پل بصری-به-کد شهود بصری را به پیاده‌سازی دقیق کد متصل می‌کند و توسعه UI را طبیعی‌تر و کارآمدتر می‌سازد.**
