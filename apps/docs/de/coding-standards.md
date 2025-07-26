# Coding-Standards

Dieses Dokument beschreibt die Coding-Standards und Konventionen für das Hatcher-Projekt. Das Befolgen dieser Standards gewährleistet Konsistenz, Wartbarkeit und hochwertigen Code in der gesamten Codebasis.

> **📊 Compliance-Status**: Stand Dezember 2024 erreicht unsere Codebasis **100% Compliance** mit diesen Standards nach umfassender Prüfung und Code-Verbesserungen.

## Allgemeine Prinzipien

### Code-Qualität

- **Klarheit vor Cleverness**: Code schreiben, der leicht zu lesen und zu verstehen ist
- **Konsistenz**: Etablierte Muster in der gesamten Codebasis befolgen
- **Wartbarkeit**: Code schreiben, der leicht zu modifizieren und zu erweitern ist
- **Performance**: Performance-Auswirkungen berücksichtigen, aber Lesbarkeit priorisieren
- **Dokumentation**: Aller Code sollte selbstdokumentierend sein mit klaren Kommentaren wenn nötig

### Sprach-Standards

- **Nur Englisch**: Alle Kommentare, Dokumentation und Variablennamen müssen auf Englisch sein
- **Klare Benennung**: Beschreibende Namen verwenden, die den Zweck klar anzeigen
- **Keine Abkürzungen**: Abkürzungen vermeiden, es sei denn, sie sind weithin verstanden (z.B. `API`, `URL`)

### Datei-Organisation

- **Einzige Verantwortlichkeit**: Jede Datei sollte einen einzigen, klar definierten Zweck haben
- **Logische Gruppierung**: Verwandte Funktionalität zusammen organisieren
- **Klare Benennung**: Beschreibende Namen verwenden, die den Zweck klar anzeigen

## Formatierungs-Standards

### Code-Stil (Durchgesetzt von ESLint)

```typescript
// ✅ Gut: Einfache Anführungszeichen, keine Semikolons, 2-Leerzeichen-Einrückung
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ Vermeiden: Doppelte Anführungszeichen, Semikolons, inkonsistente Einrückung
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### Fehlerbehandlung

```typescript
// ✅ Gut: Beschreibende Fehlerbehandlung
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ Vermeiden: Generische Fehlerbehandlung
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## TypeScript-Standards

### Typ-Definitionen

```typescript
// ✅ Gut: Interfaces für Objekt-Formen verwenden
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ Vermeiden: Typ-Aliase für einfache Objekt-Formen
type UserData = {
  id: string
  name: string
}
```

### Benennungskonventionen

```typescript
// ✅ Gut: PascalCase für Typen, Interfaces, Klassen
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ Gut: camelCase für Variablen, Funktionen, Methoden
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ Gut: SCREAMING_SNAKE_CASE für Konstanten
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### Funktions- und Methoden-Design

```typescript
// ✅ Gut: Klare Funktionssignaturen mit ordnungsgeäßer Typisierung
function processUserData(user: UserData): Promise<ProcessedUser> {
  // Implementierung
}

// ✅ Gut: JSDoc für öffentliche APIs verwenden
/**
 * Generiert Code-Modifikationen basierend auf visuellen Auswahlen
 * @param selection - Die ausgewählten DOM-Elemente
 * @param context - Der aktuelle Projekt-Kontext
 * @returns Promise, das zu generiertem Code aufgelöst wird
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // Implementierung
}
```

## Vue.js-Standards

### Komponenten-Struktur

```vue
<!-- ✅ Gut: Composition API mit <script setup> verwenden -->
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

// Composables am Anfang
const { user } = useAuth()
const { theme } = useTheme()

// Reaktive Daten
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// Computed Properties
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// Methoden
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
      <!-- Formular-Inhalt -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* Styles */
}
</style>
```

## Stil-Standards

### CSS-Architektur

```scss
// ✅ Gut: CSS Custom Properties für Theming verwenden
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

// ✅ Gut: BEM-Methodologie für Klassennamen
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

## Test-Standards

### Unit-Tests

```typescript
// ✅ Gut: Beschreibende Test-Struktur
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

## Dokumentations-Standards

### Code-Kommentare

```typescript
// ✅ Gut: WARUM erklären, nicht WAS
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // Wir begrenzen die Kontextgröße, um Token-Überlauf in AI-Modellen zu verhindern
  // während wir genügend Informationen für präzise Code-Generierung sicherstellen
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Git-Konventionen

### Commit-Nachrichten

Wir befolgen [Conventional Commits](https://conventionalcommits.org/):

```bash
# ✅ Gut: Klare, beschreibende Commit-Nachrichten
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## Durchsetzung

Diese Standards werden durchgesetzt durch:

- **ESLint**: Automatisierte Code-Stil-Überprüfung
- **TypeScript**: Typ-Sicherheit und Konsistenz
- **Prettier**: Code-Formatierung
- **Husky**: Pre-Commit-Hooks
- **CI/CD**: Automatisierte Tests und Linting

### Lokale Entwicklung

```bash
# Linting ausführen
pnpm lint

# Auto-korrigierbare Probleme beheben
pnpm lint:fix

# Typ-Überprüfung
pnpm typecheck

# Tests ausführen
pnpm test
```

Diese Standards sind lebende Dokumente, die sich mit dem Projekt und Community-Feedback weiterentwickeln.
