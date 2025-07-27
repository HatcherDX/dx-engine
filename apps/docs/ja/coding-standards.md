---
title: コーディング標準 | Hatcher IDE開発ガイドライン
description: Hatcher IDEの公式コーディング標準と開発ガイドライン。TypeScript、Vue、テスト、プロジェクトでのコード品質維持のベストプラクティス。
---

# コーディング標準

このドキュメントは、Hatcherプロジェクトのコーディング標準と規約について説明します。これらの標準に従うことで、コードベース全体の一貫性、保守性、高品質なコードが保証されます。

> **📊 準拠状況**: 2024年12月現在、包括的な監査とコードの改善により、私たちのコードベースはこれらの標準に**100%準拠**しています。

## 一般原則

### コード品質

- **賢さより明確さ**: 読みやすく理解しやすいコードを書く
- **一貫性**: コードベース全体で確立されたパターンに従う
- **保守性**: 修正や拡張が容易なコードを書く
- **パフォーマンス**: パフォーマンスへの影響を考慮するが、まず可読性を優先する
- **ドキュメント**: すべてのコードは、必要に応じて明確なコメントで自己文書化されるべき

### 言語標準

- **英語のみ**: すべてのコメント、ドキュメント、変数名は英語でなければならない
- **明確な命名**: 目的を明確に示す説明的な名前を使用する
- **略語なし**: 広く理解されているもの（例：`API`、`URL`）以外は略語を避ける

### ファイル構成

- **単一責任**: 各ファイルは単一の明確に定義された目的を持つべき
- **論理的グループ化**: 関連する機能をまとめて整理する
- **明確な命名**: 目的を明確に示す説明的な名前を使用する

## フォーマット標準

### コードスタイル（ESLintによって適用）

```typescript
// ✅ 良い例: シングルクォート、セミコロンなし、2スペースインデント
const message = 'Hello World'
const config = {
  apiUrl: 'https://api.hatche.rs',
  timeout: 5000,
}

// ❌ 避ける: ダブルクォート、セミコロン、一貫しないインデント
const message = "Hello World";
const config = {
    apiUrl: "https://api.hatche.rs",
    timeout: 5000;
};
```

### エラーハンドリング

```typescript
// ✅ 良い例: 説明的なエラーハンドリング
try {
  const result = await fetchUserData()
  return result
} catch (error) {
  console.error('Failed to fetch user data:', error)
  throw new Error(`User data fetch failed: ${error.message}`)
}

// ❌ 避ける: 一般的なエラーハンドリング
try {
  const result = await fetchUserData()
  return result
} catch (e) {
  console.error(e)
  throw e
}
```

## TypeScript標準

### 型定義

```typescript
// ✅ 良い例: オブジェクト形式にはinterfaceを使用
interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
}

// ❌ 避ける: 単純なオブジェクト形式にtype alias
type UserData = {
  id: string
  name: string
}
```

### 命名規約

```typescript
// ✅ 良い例: 型、インターフェース、クラスにはPascalCase
interface ApiResponse {}
class UserService {}
type ComponentProps = {}

// ✅ 良い例: 変数、関数、メソッドにはcamelCase
const userName = 'john'
function getUserData() {}
const handleClick = () => {}

// ✅ 良い例: 定数にはSCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.hatche.rs'
const MAX_RETRY_ATTEMPTS = 3
```

### 関数とメソッドの設計

```typescript
// ✅ 良い例: 適切な型付けによる明確な関数シグネチャ
function processUserData(user: UserData): Promise<ProcessedUser> {
  // 実装
}

// ✅ 良い例: パブリックAPIにはJSDocを使用
/**
 * ビジュアル選択に基づいてコード修正を生成
 * @param selection - 選択されたDOM要素
 * @param context - 現在のプロジェクトコンテキスト
 * @returns 生成されたコードに解決されるPromise
 */
async function generateCodeFromSelection(
  selection: DOMSelection[],
  context: ProjectContext
): Promise<CodeModification[]> {
  // 実装
}
```

## Vue.js標準

### コンポーネント構造

```vue
<!-- ✅ 良い例: <script setup>でComposition APIを使用 -->
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

// コンポーザブルを上部に
const { user } = useAuth()
const { theme } = useTheme()

// リアクティブデータ
const isLoading = ref(false)
const formData = reactive({
  name: '',
  email: '',
})

// 算出プロパティ
const isFormValid = computed(() => {
  return formData.name.length > 0 && formData.email.includes('@')
})

// メソッド
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
      <!-- フォームコンテンツ -->
    </form>
  </div>
</template>

<style scoped>
.modal {
  /* スタイル */
}
</style>
```

## スタイル標準

### CSSアーキテクチャ

```scss
// ✅ 良い例: テーマにCSS カスタムプロパティを使用
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

// ✅ 良い例: クラス名にBEM手法を使用
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

## テスト標準

### ユニットテスト

```typescript
// ✅ 良い例: 説明的なテスト構造
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

## ドキュメント標準

### コードコメント

```typescript
// ✅ 良い例: 何をするかではなく、なぜするかを説明
function calculateOptimalAIPrompt(context: ProjectContext): string {
  // AIモデルでのトークンオーバーフローを防ぐためにコンテキストサイズを制限
  // 正確なコード生成のための十分な情報を確保
  const maxContextSize = 4000

  if (context.size > maxContextSize) {
    return compressContext(context, maxContextSize)
  }

  return buildPrompt(context)
}
```

## Git規約

### コミットメッセージ

[Conventional Commits](https://conventionalcommits.org/)に従います：

```bash
# ✅ 良い例: 明確で説明的なコミットメッセージ
feat: add visual element selection to code generation
fix: resolve memory leak in AI response processing
docs: update installation guide for macOS
style: improve code formatting in user service
refactor: extract common AI prompt logic
```

## 適用

これらの標準は以下によって適用されます：

- **ESLint**: 自動化されたコードスタイルチェック
- **TypeScript**: 型安全性と一貫性
- **Prettier**: コードフォーマット
- **Husky**: プリコミットフック
- **CI/CD**: 自動化されたテストとリンティング

### ローカル開発

```bash
# リンティング実行
pnpm lint

# 自動修正可能な問題を修正
pnpm lint:fix

# 型チェック
pnpm typecheck

# テスト実行
pnpm test
```

これらの標準は、プロジェクトとコミュニティのフィードバックとともに進化する生きた文書です。
