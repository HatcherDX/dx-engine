---
title: Kodlama Standartları | Hatcher IDE Geliştirme Yönergeleri
description: Hatcher IDE için resmi kodlama standartları ve geliştirme yönergeleri. TypeScript, Vue, test ve projede kod kalitesini korumak için en iyi uygulamalar.
---

# Kodlama Standartları

Bu belge, Hatcher projesi için kodlama standartları ve konvansiyonlarını açıklar. Bu standartları takip etmek, tüm kod tabanında tutarlılık, sürdürülebilirlik ve yüksek kaliteli kod sağlar.

> **📊 Uyumluluk Durumu**: Aralık 2024 itibariyle, kod tabanımız kapsamlı denetim ve kod iyileştirmelerinden sonra bu standartlara **%100 uyumluluk** sağlamaktadır.

## Genel İlkeler

### Kod Kalitesi

- **Zekice olmaktan çok açık olmak**: Okumak ve anlamak kolay kod yazın
- **Tutarlılık**: Kod tabanı boyunca yerleşik kalıpları takip edin
- **Sürdürülebilirlik**: Değiştirmek ve genişletmek kolay kod yazın
- **Performans**: Performans etkilerini göz önünde bulundurun, ancak önce okunabilirliği öncelendirin
- **Dokümantasyon**: Tüm kod gerektiğinde açık yorumlarla kendi kendini belgeleyici olmalıdır

### Dil Standartları

- **Sadece İngilizce**: Tüm yorumlar, dokümantasyon ve değişken adları İngilizce olmalıdır
- **Açık İsimlendirme**: Amacı açıkça belirten tanımlayıcı isimler kullanın
- **Kısaltma Yok**: Yaygın olarak anlaşılanlar dışında kısaltmalardan kaçının (örn. `API`, `URL`)

### Dosya Organizasyonu

- **Tek Sorumluluk**: Her dosyanın tek, iyi tanımlanmış bir amacı olmalıdır
- **Mantıklı Gruplama**: İlgili işlevselliği birlikte düzenleyin
- **Açık İsimlendirme**: Amacı açıkça belirten tanımlayıcı isimler kullanın

## Biçimlendirme Standartları

### Kod Stili (ESLint tarafından zorlanır)

```typescript
// ✅ İyi: Tek tırnak, noktalı virgül yok, 2 boşluk girinti
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ Kaçının: Çift tırnak, noktalı virgül, tutarsız girinti
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### Hata İşleme

```typescript
// ✅ İyi: Tanımlayıcı hata işleme
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ Kaçının: Genel hata işleme
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## TypeScript Standartları

### Tip Tanımları

```typescript
// ✅ İyi: Nesne şekilleri için interface kullanın
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ Kaçının: Basit nesne şekilleri için tip takma adları
type UserData = {
  id: string
  name: string
}
```

### İsimlendirme Konvansiyonları

```typescript
// ✅ İyi: Tipler, interface'ler, sınıflar için PascalCase
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ İyi: Değişkenler, fonksiyonlar, metotlar için camelCase
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ İyi: Sabitler için SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### Fonksiyon ve Metot Tasarımı

```typescript
// ✅ İyi: Uygun tiplendirme ile açık fonksiyon imzaları
function processUserData(user: UserData): Promise<ProcessedUser> {
  // Uygulama
}

// ✅ İyi: Genel API'ler için JSDoc kullanın
/**
 * Görsel seçimlere dayalı kod değişiklikleri üretir
 * @param selection - Seçilen DOM elemanları
 * @param context - Mevcut proje bağlamı
 * @returns Üretilen koda çözümlenen Promise
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // Uygulama
}
```

## Vue.js Standartları

### Bileşen Yapısı

```vue
<!-- ✅ İyi: <script setup> ile Composition API kullanın -->
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

// Composable'lar üstte
const { user } = useAuth()
const { theme } = useTheme()

// Reaktif veri
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// Hesaplanmış özellikler
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// Metotlar
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
      <!-- Form içeriği -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* Stiller */
}
</style>
```

## Stil Standartları

### CSS Mimarisi

```scss
// ✅ İyi: Tema için CSS özel özelliklerini kullanın
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

// ✅ İyi: Sınıf adları için BEM metodolojisi
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

## Test Standartları

### Birim Testleri

```typescript
// ✅ İyi: Tanımlayıcı test yapısı
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

## Dokümantasyon Standartları

### Kod Yorumları

```typescript
// ✅ İyi: NE değil NEDEN'i açıklayın
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // AI modellerinde token taşmasını önlemek için bağlam boyutunu sınırlıyoruz
  // aynı zamanda doğru kod üretimi için yeterli bilgi sağlıyoruz
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Git Konvansiyonları

### Commit Mesajları

[Conventional Commits](https://conventionalcommits.org/) takip ediyoruz:

```bash
# ✅ İyi: Açık, tanımlayıcı commit mesajları
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## Uygulama

Bu standartlar şunlar tarafından uygulanır:

- **ESLint**: Otomatik kod stili kontrolü
- **TypeScript**: Tip güvenliği ve tutarlılık
- **Prettier**: Kod biçimlendirme
- **Husky**: Pre-commit hook'ları
- **CI/CD**: Otomatik test ve linting

### Yerel Geliştirme

```bash
# Linting çalıştır
pnpm lint

# Otomatik düzeltilebilir sorunları düzelt
pnpm lint:fix

# Tip kontrolü
pnpm typecheck

# Testleri çalıştır
pnpm test
```

Bu standartlar, proje ve topluluk geri bildirimleriyle birlikte gelişen yaşayan belgelerdir.
