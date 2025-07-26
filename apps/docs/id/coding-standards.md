# Standar Coding

Dokumen ini menguraikan standar coding dan konvensi untuk proyek Hatcher. Mengikuti standar ini memastikan konsistensi, maintainability, dan kode berkualitas tinggi di seluruh codebase.

> **📊 Status Kepatuhan**: Per Desember 2024, codebase kami mencapai **100% kepatuhan** dengan standar ini setelah audit komprehensif dan perbaikan kode.

## Prinsip Umum

### Kualitas Kode

- **Kejelasan daripada kepintaran**: Tulis kode yang mudah dibaca dan dipahami
- **Konsistensi**: Ikuti pola yang telah ditetapkan di seluruh codebase
- **Maintainability**: Tulis kode yang mudah dimodifikasi dan diperluas
- **Performa**: Pertimbangkan implikasi performa, tapi prioritaskan readability terlebih dahulu
- **Dokumentasi**: Semua kode harus self-documenting dengan komentar yang jelas saat diperlukan

### Standar Bahasa

- **Hanya Bahasa Inggris**: Semua komentar, dokumentasi, dan nama variabel harus dalam bahasa Inggris
- **Penamaan yang Jelas**: Gunakan nama deskriptif yang dengan jelas menunjukkan tujuan
- **Tanpa Singkatan**: Hindari singkatan kecuali dipahami secara luas (misalnya `API`, `URL`)

### Organisasi File

- **Tanggung Jawab Tunggal**: Setiap file harus memiliki tujuan tunggal yang terdefinisi dengan baik
- **Pengelompokan Logis**: Organisasikan fungsionalitas terkait bersama-sama
- **Penamaan yang Jelas**: Gunakan nama deskriptif yang dengan jelas menunjukkan tujuan

## Standar Formatting

### Gaya Kode (Ditegakkan oleh ESLint)

```typescript
// ✅ Baik: Tanda kutip tunggal, tanpa semicolon, indentasi 2 spasi
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ Hindari: Tanda kutip ganda, semicolon, indentasi tidak konsisten
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### Penanganan Error

```typescript
// ✅ Baik: Penanganan error yang deskriptif
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ Hindari: Penanganan error generik
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## Standar TypeScript

### Definisi Tipe

```typescript
// ✅ Baik: Gunakan interface untuk bentuk objek
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ Hindari: Type alias untuk bentuk objek sederhana
type UserData = {
  id: string
  name: string
}
```

### Konvensi Penamaan

```typescript
// ✅ Baik: PascalCase untuk tipe, interface, kelas
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ Baik: camelCase untuk variabel, fungsi, method
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ Baik: SCREAMING_SNAKE_CASE untuk konstanta
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### Desain Fungsi dan Method

```typescript
// ✅ Baik: Signature fungsi yang jelas dengan typing yang tepat
function processUserData(user: UserData): Promise<ProcessedUser> {
  // Implementasi
}

// ✅ Baik: Gunakan JSDoc untuk API publik
/**
 * Menghasilkan modifikasi kode berdasarkan seleksi visual
 * @param selection - Elemen DOM yang dipilih
 * @param context - Konteks proyek saat ini
 * @returns Promise yang resolve ke kode yang dihasilkan
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // Implementasi
}
```

## Standar Vue.js

### Struktur Komponen

```vue
<!-- ✅ Baik: Gunakan Composition API dengan <script setup> -->
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

// Composables di atas
const { user } = useAuth()
const { theme } = useTheme()

// Data reaktif
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// Computed properties
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// Methods
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
      <!-- Konten form -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* Styles */
}
</style>
```

## Standar Styling

### Arsitektur CSS

```scss
// ✅ Baik: Gunakan CSS custom properties untuk theming
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

// ✅ Baik: Metodologi BEM untuk nama kelas
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

## Standar Testing

### Unit Tests

```typescript
// ✅ Baik: Struktur test yang deskriptif
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

## Standar Dokumentasi

### Komentar Kode

```typescript
// ✅ Baik: Jelaskan MENGAPA, bukan APA
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // Kami membatasi ukuran konteks untuk mencegah token overflow di model AI
  // sambil memastikan informasi yang cukup untuk generasi kode yang akurat
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Konvensi Git

### Pesan Commit

Kami mengikuti [Conventional Commits](https://conventionalcommits.org/):

```bash
# ✅ Baik: Pesan commit yang jelas dan deskriptif
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## Penegakan

Standar ini ditegakkan melalui:

- **ESLint**: Pemeriksaan gaya kode otomatis
- **TypeScript**: Keamanan tipe dan konsistensi
- **Prettier**: Formatting kode
- **Husky**: Pre-commit hooks
- **CI/CD**: Testing dan linting otomatis

### Pengembangan Lokal

```bash
# Menjalankan linting
pnpm lint

# Memperbaiki masalah yang dapat diperbaiki otomatis
pnpm lint:fix

# Type checking
pnpm typecheck

# Menjalankan tests
pnpm test
```

Standar ini adalah dokumen hidup yang berkembang dengan proyek dan umpan balik komunitas.
