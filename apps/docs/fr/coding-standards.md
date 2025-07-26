# Normes de Codage

Ce document décrit les normes de codage et les conventions pour le projet Hatcher. Suivre ces normes garantit la cohérence, la maintenabilité et un code de haute qualité dans toute la base de code.

> **📊 État de Conformité** : En décembre 2024, notre base de code atteint **100% de conformité** avec ces normes après un audit complet et des améliorations du code.

## Principes Généraux

### Qualité du Code

- **Clarté plutôt que complexité** : Écrire du code facile à lire et à comprendre
- **Cohérence** : Suivre les modèles établis dans toute la base de code
- **Maintenabilité** : Écrire du code facile à modifier et à étendre
- **Performance** : Considérer les implications de performance, mais prioriser la lisibilité d'abord
- **Documentation** : Tout le code doit être auto-documenté avec des commentaires clairs si nécessaire

### Normes de Langage

- **Anglais uniquement** : Tous les commentaires, documentation et noms de variables doivent être en anglais
- **Nommage clair** : Utiliser des noms descriptifs qui indiquent clairement le but
- **Pas d'abréviations** : Éviter les abréviations sauf si elles sont largement comprises (ex: `API`, `URL`)

### Organisation des Fichiers

- **Responsabilité unique** : Chaque fichier doit avoir un but unique et bien défini
- **Groupement logique** : Organiser les fonctionnalités liées ensemble
- **Nommage clair** : Utiliser des noms descriptifs qui indiquent clairement le but

## Normes de Formatage

### Style de Code (Appliqué par ESLint)

```typescript
// ✅ Bon : Guillemets simples, pas de points-virgules, indentation de 2 espaces
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ Éviter : Guillemets doubles, points-virgules, indentation incohérente
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### Gestion des Erreurs

```typescript
// ✅ Bon : Gestion d'erreur descriptive
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ Éviter : Gestion d'erreur générique
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## Normes TypeScript

### Définitions de Types

```typescript
// ✅ Bon : Utiliser des interfaces pour les formes d'objets
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ Éviter : Alias de types pour les formes d'objets simples
type UserData = {
  id: string
  name: string
}
```

### Conventions de Nommage

```typescript
// ✅ Bon : PascalCase pour les types, interfaces, classes
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ Bon : camelCase pour les variables, fonctions, méthodes
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ Bon : SCREAMING_SNAKE_CASE pour les constantes
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### Conception de Fonctions et Méthodes

```typescript
// ✅ Bon : Signatures de fonction claires avec typage approprié
function processUserData(user: UserData): Promise<ProcessedUser> {
  // Implémentation
}

// ✅ Bon : Utiliser JSDoc pour les APIs publiques
/**
 * Génère des modifications de code basées sur des sélections visuelles
 * @param selection - Les éléments DOM sélectionnés
 * @param context - Le contexte actuel du projet
 * @returns Promise résolvant vers du code généré
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // Implémentation
}
```

## Normes Vue.js

### Structure de Composant

```vue
<!-- ✅ Bon : Utiliser l'API Composition avec <script setup> -->
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

// Composables en haut
const { user } = useAuth()
const { theme } = useTheme()

// Données réactives
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// Propriétés calculées
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// Méthodes
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
      <!-- Contenu du formulaire -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* Styles */
}
</style>
```

## Normes de Style

### Architecture CSS

```scss
// ✅ Bon : Utiliser les propriétés personnalisées CSS pour les thèmes
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

// ✅ Bon : Méthodologie BEM pour les noms de classes
.code-editor {
  /* Bloc */
}

.code-editor__toolbar {
  /* Élément */
}

.code-editor__button {
  /* Élément */
}

.code-editor__button--active {
  /* Modificateur */
}
```

## Normes de Test

### Tests Unitaires

```typescript
// ✅ Bon : Structure de test descriptive
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

## Normes de Documentation

### Commentaires de Code

```typescript
// ✅ Bon : Expliquer POURQUOI, pas QUOI
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // Nous limitons la taille du contexte pour éviter le débordement de tokens
  // tout en assurant suffisamment d'informations pour une génération précise
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Conventions Git

### Messages de Commit

Nous suivons les [Commits Conventionnels](https://conventionalcommits.org/) :

```bash
# ✅ Bon : Messages de commit clairs et descriptifs
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## Application

Ces normes sont appliquées par :

- **ESLint** : Vérification automatisée du style de code
- **TypeScript** : Sécurité des types et cohérence
- **Prettier** : Formatage du code
- **Husky** : Hooks de pré-commit
- **CI/CD** : Tests et linting automatisés

### Développement Local

```bash
# Exécuter le linting
pnpm lint

# Corriger les problèmes auto-corrigeables
pnpm lint:fix

# Vérification des types
pnpm typecheck

# Exécuter les tests
pnpm test
```

Ces normes sont des documents vivants qui évoluent avec le projet et les retours de la communauté.
