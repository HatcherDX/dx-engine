---
title: جسر البصري إلى الكود | التلاعب المباشر بواجهة المستخدم لتوليد الكود
description: تعلم عن جسر البصري إلى الكود الثوري في Hatcher الذي يحول التلاعب المباشر بواجهة المستخدم إلى تغييرات دقيقة في الكود. أشر بدلاً من الوصف للحصول على تطوير أفضل بالذكاء الاصطناعي.
---

# جسر البصري إلى الكود

> **تحويل مباشر من التفاعل البصري إلى تعديلات الكود الدقيقة.**

## نظرة عامة

جسر البصري إلى الكود هو الميزة الأساسية في Hatcher التي تسمح للمطورين بالتفاعل مع تطبيقاتهم بصرياً بينما تولد تعديلات كود دقيقة وحتمية.

## كيف يعمل

### 1. وضع الفحص البصري

قم بتفعيل وضع الفحص لبدء اختيار العناصر في تطبيقك:

```bash
# بدء خادم التطوير مع الفحص البصري
hatcher dev --visual-inspect
```

### 2. اختيار العناصر

- **التمرير**: مرر فوق العناصر لرؤية معلومات الهيكل
- **النقر**: اختر عنصراً للتعديل
- **الاختيار المتعدد**: استخدم Cmd/Ctrl + نقر لاختيار عناصر متعددة

### 3. السياق التلقائي

عندما تختار عنصراً، يقوم Hatcher تلقائياً بـ:

- تحديد المكونات والملفات ذات الصلة
- تحليل البنية الهرمية
- تحميل ملفات اللعب المناسبة
- إعداد السياق للذكاء الاصطناعي

## أنواع التعديلات

### التنسيق والتخطيط

```typescript
// قبل: عنصر مختار بصرياً
<div className="container">
  <h1>عنوان</h1>
</div>

// الأمر: "اجعل العنوان أزرق وفي الوسط"
// بعد: الكود معدل تلقائياً
<div className="container">
  <h1 className="text-blue-600 text-center">عنوان</h1>
</div>
```

### هيكل المكون

```typescript
// قبل: مكون بسيط
function Header() {
  return <h1>مرحبا</h1>
}

// الأمر: "أضف تنقل مع قائمة الرئيسية وحول"
// بعد: هيكل موسع
function Header() {
  return (
    <header>
      <h1>مرحبا</h1>
      <nav>
        <a href="/">الرئيسية</a>
        <a href="/about">حول</a>
      </nav>
    </header>
  )
}
```

### منطق الأعمال

```typescript
// قبل: مكون ثابت
function Counter() {
  return <div>0</div>
}

// الأمر: "اجعل هذا عداد قابل للنقر للزيادة"
// بعد: منطق مضاف
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div onClick={() => setCount(count + 1)}>
      {count}
    </div>
  )
}
```

## خريطة البصري إلى الكود

### تحديد المكون

يستخدم Hatcher عدة استراتيجيات لربط العناصر البصرية بالكود:

1. **تكامل React DevTools**: استخدام أدوات تطوير React
2. **خرائط المصدر**: ربط عناصر DOM بالكود المصدر
3. **تحليل AST**: تحليل شجرة بناء الجمل لفهم الهيكل
4. **اكتشاف الاتفاقيات**: الكشف التلقائي لأنماط واتفاقيات المشروع

### حل التسلسل الهرمي

```typescript
// هيكل العنصر المختار
App
  └── Layout
      └── Content
          └── ProductCard  // ← عنصر مختار
              ├── Image
              ├── Title
              └── Price
```

عند اختيار `ProductCard`، يفهم Hatcher:

- المكون الوالد (`Content`)
- المكونات الفرعية (`Image`, `Title`, `Price`)
- الخصائص والحالة المتاحة
- التنسيق المطبق

## التكوين

### إعدادات إطار العمل

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

### خريطة المحددات

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

## وضع التنقيح

### فحص عميق

```bash
# وضع التنقيح مع معلومات تفصيلية
hatcher dev --visual-inspect --debug
```

في وضع التنقيح، يمكنك رؤية:

- ربط العنصر بالملف في الوقت الفعلي
- عقد AST المحددة
- السياق المرسل للذكاء الاصطناعي
- معاينة التغييرات قبل التنفيذ

### طبقة المعلومات

يعرض وضع التنقيح طبقة مع:

- مسار ملف المكون
- الخصائص المتاحة
- الحالة الحالية
- ملف اللعب النشط

## أفضل الممارسات

### 1. استخدم صفات البيانات

```typescript
// يساعد في تحديد المكون
<div data-component="ProductCard" data-id={product.id}>
  <img src={product.image} data-element="product-image" />
  <h3 data-element="product-title">{product.title}</h3>
</div>
```

### 2. هيكل مكون واضح

```typescript
// هيكل قابل للتحديد بسهولة
function ProductCard({ product }: Props) {
  return (
    <article className="product-card">
      <ProductImage src={product.image} />
      <ProductInfo title={product.title} price={product.price} />
    </article>
  )
}
```

### 3. اتساق التسمية

```typescript
// نمط تسمية متسق
const ProductCard = () => {}
const ProductImage = () => {}
const ProductInfo = () => {}
```

## استكشاف الأخطاء

### لم يتم اكتشاف العنصر

```bash
# فحص تكوين إطار العمل
hatcher doctor --visual-bridge

# تحقق من خرائط المصدر
hatcher dev --debug-source-maps
```

### تعديلات غير دقيقة

1. فحص ملف اللعب لسياق أكثر تحديداً
2. استخدم محددات صفات البيانات الأكثر وضوحاً
3. تحقق من أن هيكل المكون يتبع الاتفاقيات

### مشاكل الأداء

```json
// تحسين للمشاريع الكبيرة
{
  "visualBridge": {
    "throttleInspection": true,
    "cacheComponentMap": true,
    "limitScanDepth": 5
  }
}
```

---

**جسر البصري إلى الكود يربط الحدس البصري بتنفيذ الكود الدقيق، مما يجعل تطوير واجهة المستخدم أكثر طبيعية وفعالية.**
