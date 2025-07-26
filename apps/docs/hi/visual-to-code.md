# विज़ुअल-टू-कोड ब्रिज

> **विज़ुअल इंटरैक्शन से सटीक कोड संशोधन का प्रत्यक्ष रूपांतरण।**

## अवलोकन

विज़ुअल-टू-कोड ब्रिज Hatcher की मुख्य सुविधा है जो डेवलपर्स को अपने एप्लिकेशन के साथ विज़ुअल रूप से इंटरैक्ट करने की अनुमति देती है जबकि सटीक और निर्धारक कोड संशोधन उत्पन्न करती है।

## यह कैसे काम करता है

### 1. विज़ुअल इंस्पेक्शन मोड

अपने एप्लिकेशन में तत्वों का चयन शुरू करने के लिए इंस्पेक्शन मोड सक्रिय करें:

```bash
# विज़ुअल इंस्पेक्शन के साथ डेवलपमेंट सर्वर शुरू करें
hatcher dev --visual-inspect
```

### 2. तत्व चयन

- **होवर**: संरचना जानकारी देखने के लिए तत्वों को हाइलाइट करें
- **क्लिक**: संशोधन के लिए तत्व का चयन करें
- **मल्टी-सेलेक्ट**: कई तत्वों का चयन करने के लिए Cmd/Ctrl + क्लिक का उपयोग करें

### 3. स्वचालित संदर्भ

जब आप किसी तत्व का चयन करते हैं, तो Hatcher स्वचालित रूप से:

- संबंधित घटकों और फाइलों की पहचान करता है
- पदानुक्रमित संरचना का विश्लेषण करता है
- प्रासंगिक Playbooks लोड करता है
- AI के लिए संदर्भ तैयार करता है

## संशोधन के प्रकार

### स्टाइलिंग और लेआउट

```typescript
// पहले: तत्व को विज़ुअल रूप से चुना गया
<div className="container">
  <h1>शीर्षक</h1>
</div>

// आदेश: "शीर्षक को नीला और केंद्रित बनाएं"
// बाद में: कोड स्वचालित रूप से संशोधित
<div className="container">
  <h1 className="text-blue-600 text-center">शीर्षक</h1>
</div>
```

### घटक संरचना

```typescript
// पहले: सरल घटक
function Header() {
  return <h1>स्वागत है</h1>
}

// आदेश: "होम और अबाउट मेनू के साथ नेवीगेशन जोड़ें"
// बाद में: संरचना का विस्तार
function Header() {
  return (
    <header>
      <h1>स्वागत है</h1>
      <nav>
        <a href="/">होम</a>
        <a href="/about">अबाउट</a>
      </nav>
    </header>
  )
}
```

### बिजनेस लॉजिक

```typescript
// पहले: स्थिर घटक
function Counter() {
  return <div>0</div>
}

// आदेश: "इसे एक क्लिकेबल काउंटर बनाएं जो बढ़ता है"
// बाद में: लॉजिक जोड़ा गया
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div onClick={() => setCount(count + 1)}>
      {count}
    </div>
  )
}
```

## विज़ुअल-टू-कोड मैपिंग

### घटक पहचान

Hatcher विज़ुअल तत्वों को कोड के साथ मैप करने के लिए कई रणनीतियों का उपयोग करता है:

1. **React DevTools Integration**: React डेवलपर टूल का उपयोग
2. **Source Maps**: DOM तत्वों से स्रोत कोड तक मैपिंग
3. **AST Analysis**: संरचना समझ के लिए abstract syntax tree विश्लेषण
4. **Convention Detection**: परियोजना पैटर्न और कन्वेंशन का स्वचालित पता लगाना

### पदानुक्रम समाधान

```typescript
// चयनित तत्व की संरचना
App
  └── Layout
      └── Content
          └── ProductCard  // ← चयनित तत्व
              ├── Image
              ├── Title
              └── Price
```

जब `ProductCard` चुना जाता है, तो Hatcher समझता है:

- Parent घटक (`Content`)
- Child घटक (`Image`, `Title`, `Price`)
- उपलब्ध Props और state
- लागू स्टाइलिंग

## कॉन्फ़िगरेशन

### फ्रेमवर्क सेटिंग्स

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

### सेलेक्टर मैपिंग

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

## डिबगिंग मोड

### गहरी जांच

```bash
# विस्तृत जानकारी के साथ डिबग मोड
hatcher dev --visual-inspect --debug
```

डिबग मोड में, आप देख सकते हैं:

- रीयल-टाइम तत्व-से-फाइल मैपिंग
- पहचाने गए AST nodes
- AI को भेजा गया संदर्भ
- लागू करने से पहले संशोधन पूर्वावलोकन

### जानकारी ओवरले

डिबग मोड ओवरले प्रदर्शित करता है:

- घटक फाइल पथ
- उपलब्ध Props
- वर्तमान State
- सक्रिय Playbook

## सर्वोत्तम प्रथाएं

### 1. डेटा एट्रिब्यूट्स का उपयोग करें

```typescript
// घटक पहचान में मदद करता है
<div data-component="ProductCard" data-id={product.id}>
  <img src={product.image} data-element="product-image" />
  <h3 data-element="product-title">{product.title}</h3>
</div>
```

### 2. स्पष्ट घटक संरचना

```typescript
// आसानी से पहचाने जाने वाली संरचना
function ProductCard({ product }: Props) {
  return (
    <article className="product-card">
      <ProductImage src={product.image} />
      <ProductInfo title={product.title} price={product.price} />
    </article>
  )
}
```

### 3. नेमिंग में स्थिरता

```typescript
// स्थिर नेमिंग पैटर्न
const ProductCard = () => {}
const ProductImage = () => {}
const ProductInfo = () => {}
```

## समस्या निवारण

### तत्व का पता नहीं चला

```bash
# फ्रेमवर्क कॉन्फ़िगरेशन जांचें
hatcher doctor --visual-bridge

# source maps सत्यापित करें
hatcher dev --debug-source-maps
```

### गलत संशोधन

1. अधिक विशिष्ट संदर्भ के लिए Playbook जांचें
2. अधिक स्पष्ट डेटा एट्रिब्यूट सेलेक्टर का उपयोग करें
3. घटक संरचना कन्वेंशन के अनुरूप है, सत्यापित करें

### प्रदर्शन समस्याएं

```json
// बड़ी परियोजनाओं के लिए अनुकूलन
{
  "visualBridge": {
    "throttleInspection": true,
    "cacheComponentMap": true,
    "limitScanDepth": 5
  }
}
```

---

**विज़ुअल-टू-कोड ब्रिज विज़ुअल अंतर्ज्ञान को सटीक कोड कार्यान्वयन से जोड़ता है, UI विकास को अधिक प्राकृतिक और कुशल बनाता है।**
