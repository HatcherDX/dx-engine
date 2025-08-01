---
title: योगदान | Hatcher IDE विकास में योगदान कैसे करें
description: Hatcher IDE में योगदान करना सीखें। ओपन-सोर्स प्रोजेक्ट में कोड योगदान, दस्तावेज़ीकरण, परीक्षण और सामुदायिक भागीदारी के लिए दिशानिर्देश।
---

# Hatcher में योगदान

Hatcher में योगदान करने में आपकी रुचि के लिए धन्यवाद! यह गाइड आपको प्रोजेक्ट में योगदान शुरू करने में मदद करेगी।

## आचार संहिता

इस प्रोजेक्ट में भाग लेकर, आप हमारी [आचार संहिता](CODE_OF_CONDUCT.md) का पालन करने के लिए सहमत हैं। कृपया योगदान करने से पहले इसे पढ़ें।

## शुरुआत

### विकास सेटअप

1. **Fork और Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **निर्भरताएं स्थापित करें**

   ```bash
   pnpm install
   ```

3. **विकास सर्वर शुरू करें**
   ```bash
   pnpm dev
   ```

### प्रोजेक्ट संरचना

```
dx-engine/
├── apps/
│   ├── electron/          # मुख्य Electron प्रक्रिया
│   ├── web/              # रेंडरर प्रक्रिया (Vue.js)
│   ├── preload/          # प्रीलोड स्क्रिप्ट्स
│   └── docs/             # VitePress दस्तावेज़ीकरण
├── universal/
│   ├── vite-plugin/      # कस्टम Vite प्लगइन्स
│   └── puppeteer-google-translate/
└── scripts/              # बिल्ड और विकास स्क्रिप्ट्स
```

## योगदान के तरीके

### बग रिपोर्ट करना

बग रिपोर्ट करते समय, कृपया शामिल करें:

- **स्पष्ट विवरण**: क्या हुआ बनाम आपकी अपेक्षा
- **पुनर्प्रस्तुति के चरण**: समस्या को फिर से बनाने के लिए विस्तृत चरण
- **वातावरण**: OS, Node.js संस्करण, pnpm संस्करण
- **स्क्रीनशॉट**: यदि लागू हो, दृश्य प्रमाण शामिल करें

मुद्दे बनाते समय हमारे [बग रिपोर्ट टेम्प्लेट](.github/ISSUE_TEMPLATE/bug_report.md) का उपयोग करें।

### फीचर अनुरोध

हम फीचर अनुरोधों का स्वागत करते हैं! कृपया शामिल करें:

- **उपयोग का मामला**: यह फीचर क्यों आवश्यक है?
- **प्रस्तावित समाधान**: यह कैसे काम करना चाहिए?
- **विकल्प**: आपने कौन से अन्य दृष्टिकोण माने थे?

हमारे [फीचर अनुरोध टेम्प्लेट](.github/ISSUE_TEMPLATE/feature_request.md) का उपयोग करें।

### कोड योगदान

#### शुरू करने से पहले

1. **मौजूदा मुद्दों की जांच करें**: संबंधित मुद्दों या फीचर अनुरोधों की तलाश करें
2. **प्रमुख परिवर्तनों पर चर्चा करें**: महत्वपूर्ण परिवर्तनों पर चर्चा करने के लिए एक मुद्दा खोलें
3. **छोटी शुरुआत करें**: छोटे, केंद्रित योगदान से शुरू करें

#### विकास वर्कफ़्लो

1. **ब्रांच बनाएं**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **परिवर्तन करें**
   - हमारे कोडिंग मानकों का पालन करें (नीचे देखें)
   - नई कार्यक्षमता के लिए परीक्षण लिखें
   - आवश्यकतानुसार दस्तावेज़ीकरण अपडेट करें

3. **अपने परिवर्तनों का परीक्षण करें**

   ```bash
   pnpm build
   pnpm test
   ```

4. **अपने परिवर्तनों को कमिट करें**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   हम [Conventional Commits](https://conventionalcommits.org/) प्रारूप का पालन करते हैं।

5. **पुश और PR बनाएं**
   ```bash
   git push origin feature/your-feature-name
   ```

## कोडिंग मानक

Hatcher पूरे प्रोजेक्ट में निरंतरता, रखरखाव योग्यता और उच्च गुणवत्ता वाले कोड को सुनिश्चित करने के लिए सख्त कोडिंग मानकों का पालन करता है।

**📋 [पूर्ण कोडिंग मानक गाइड](./coding-standards.md)**

### त्वरित संदर्भ

**TypeScript**

- सभी नए कोड के लिए strict mode सक्षम के साथ TypeScript का उपयोग करें
- ऑब्जेक्ट आकारों के लिए types पर interfaces को प्राथमिकता दें
- चरों और फ़ंक्शन्स के लिए अर्थपूर्ण, वर्णनात्मक नाम का उपयोग करें
- सभी सार्वजनिक APIs के लिए JSDoc टिप्पणियां शामिल करें

**Vue.js**

- `<script setup>` सिंटैक्स के साथ Composition API का उपयोग करें
- TypeScript interfaces के साथ props और emits को परिभाषित करें
- पुन: उपयोग योग्य तर्क के लिए composables को प्राथमिकता दें
- एकल फ़ाइल घटक संरचना का पालन करें: script → template → style

### कोड गुणवत्ता उपकरण

हम मानकों को लागू करने के लिए स्वचालित उपकरणों का उपयोग करते हैं:

```bash
# कोड स्टाइल समस्याओं को lint और ठीक करें
pnpm lint:fix

# टाइप जांच
pnpm typecheck

# सभी परीक्षण चलाएं
pnpm test

# कोड फॉर्मेट करें
pnpm format
```

## Pull Request प्रक्रिया

### सबमिट करने से पहले

- [ ] कोड प्रोजेक्ट मानकों का पालन करता है
- [ ] परीक्षण स्थानीय रूप से पास होते हैं
- [ ] दस्तावेज़ीकरण अपडेट किया गया है
- [ ] परिवर्तन केंद्रित और परमाणु हैं

### PR विवरण टेम्प्लेट

```markdown
## विवरण

परिवर्तनों का संक्षिप्त विवरण

## परिवर्तन का प्रकार

- [ ] बग फिक्स
- [ ] नई सुविधा
- [ ] ब्रेकिंग चेंज
- [ ] दस्तावेज़ीकरण अपडेट

## परीक्षण

- [ ] यूनिट परीक्षण जोड़े/अपडेट किए गए
- [ ] एकीकरण परीक्षण जोड़े/अपडेट किए गए
- [ ] मैनुअल परीक्षण पूरा किया गया
```

## समुदाय

### संचार चैनल

- **GitHub Issues**: बग रिपोर्ट और फीचर अनुरोध
- **GitHub Discussions**: सामान्य प्रश्न और विचार
- **Discord**: समुदाय के साथ रीयल-टाइम चैट
- **Twitter**: अपडेट के लिए [@HatcherDX](https://twitter.com/HatcherDX) को फॉलो करें

### समुदाय दिशानिर्देश

- **सम्मानजनक रहें**: सभी के साथ सम्मान से व्यवहार करें
- **रचनात्मक रहें**: समस्याओं पर नहीं, समाधानों पर ध्यान दें
- **धैर्यवान रहें**: याद रखें कि हम सभी स्वयंसेवक हैं
- **सहायक रहें**: ज्ञान साझा करें और दूसरों की मदद करें

## विकास संसाधन

### उपयोगी लिंक

- [Vue.js दस्तावेज़ीकरण](https://vuejs.org/)
- [Electron दस्तावेज़ीकरण](https://electronjs.org/)
- [TypeScript हैंडबुक](https://typescriptlang.org/)
- [Vite दस्तावेज़ीकरण](https://vitejs.dev/)

## प्रश्न?

यदि योगदान के बारे में आपके प्रश्न हैं:

1. मौजूदा [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions) की जांच करें
2. हमारे [Discord समुदाय](https://discord.gg/hatcher) में शामिल हों
3. एक नई चर्चा या मुद्दा बनाएं

Hatcher में योगदान के लिए धन्यवाद! मिलकर, हम AI-सहायित विकास का भविष्य बना रहे हैं।
