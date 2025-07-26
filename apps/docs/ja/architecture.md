# アーキテクチャ

Hatcherは、スケーラビリティ、保守性、パフォーマンスを優先するモノレポアーキテクチャを持つ現代的なElectronアプリケーションとして構築されています。

## ハイレベルアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Hatcher Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)     │  Renderer Process (Vue.js)   │
│  ├── Window Management      │  ├── Visual-to-Code Bridge   │
│  ├── AI Engine Integration  │  ├── Code Editor             │
│  ├── File System Access     │  ├── Project Management      │
│  └── Git Operations         │  └── UI Components           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                External AI Services                         │
│  ├── Claude API (Anthropic)                                │
│  ├── Gemini CLI (Google)                                   │
│  └── Future: GPT-4, CodeLlama                              │
└─────────────────────────────────────────────────────────────┘
```

## モノレポ構造

```
dx-engine/
├── apps/                    # メインアプリケーション
│   ├── electron/           # Electronメインプロセス
│   ├── web/               # Vue.jsレンダラープロセス
│   ├── preload/           # セキュアなプリロードスクリプト
│   └── docs/              # VitePressドキュメント
│
├── universal/             # 共有パッケージ
│   ├── vite-plugin/       # カスタムViteプラグイン
│   └── puppeteer-google-translate/  # 翻訳サービス
│
├── scripts/               # 自動化スクリプト
│   ├── translation/       # TypeScript翻訳システム
│   ├── setup-env.ts      # 環境設定
│   ├── version-bump.ts   # バージョン管理
│   └── generate-icons.ts # アイコン生成
│
└── Config Files           # プロジェクト設定
    ├── package.json       # ワークスペース設定
    ├── turbo.json         # Turborepo設定
    └── tsconfig.json      # TypeScript設定
```

## Electronプロセス

### メインプロセス (apps/electron/)

メインプロセスが管理するもの：

- **ウィンドウ管理**: アプリケーションウィンドウの作成と制御
- **AI統合**: 外部AIサービスとの通信
- **システムアクセス**: ファイルとシステム操作
- **セキュリティ**: 入力の検証とサニタイゼーション

```typescript
// apps/electron/src/index.ts
import { app, BrowserWindow } from 'electron'

class HatcherMain {
  private mainWindow: BrowserWindow | null = null

  async initialize() {
    await this.createWindow()
    this.setupAIIntegration()
    this.setupGitIntegration()
  }

  private async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    })
  }
}
```

### レンダラープロセス (apps/web/)

レンダラープロセスにはVue.js UIが含まれます：

- **ビジュアル-to-コードブリッジ**: 中核的な視覚的選択機能
- **コードエディター**: シンタックスハイライト付きの統合エディター
- **プロジェクト管理**: ファイルエクスプローラーと管理
- **UIコンポーネント**: レスポンシブなユーザーインターフェース

### プリロードスクリプト (apps/preload/)

制御されたAPIを公開するセキュアなプリロードスクリプト：

```typescript
// apps/preload/src/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // セキュアなファイル操作
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke('write-file', path, content),

  // AI統合
  callAI: (prompt: string, context: any) =>
    ipcRenderer.invoke('ai-request', prompt, context),

  // Git操作
  gitStatus: () => ipcRenderer.invoke('git-status'),
  gitDiff: () => ipcRenderer.invoke('git-diff'),
})
```

## 技術スタック

### フロントエンド (レンダラー)

- **Vue.js 3**: Composition APIを使用したリアクティブフレームワーク
- **TypeScript**: タイプセーフな開発
- **Vite**: 高速ビルドツール
- **Pinia**: モダンな状態管理
- **Vue Router**: クライアントサイドルーティング

### バックエンド (メインプロセス)

- **Electron**: デスクトップアプリケーションフレームワーク
- **Node.js**: JavaScriptランタイム
- **TypeScript**: タイプセーフな開発
- **IPC**: プロセス間通信

### 開発ツール

- **Turborepo**: モノレポ管理とキャッシュ
- **ESLint**: コードリンティング
- **Prettier**: コードフォーマット
- **Vitest**: テストフレームワーク
- **Istanbul**: コードカバレッジ

## AI統合

### エンジン抽象化

```typescript
interface AIEngine {
  name: string
  generate(prompt: string, context: Context): Promise<AIResponse>
  validateConfig(): boolean
}

class ClaudeEngine implements AIEngine {
  async generate(prompt: string, context: Context) {
    // Claude固有の実装
  }
}

class GeminiEngine implements AIEngine {
  async generate(prompt: string, context: Context) {
    // Gemini固有の実装
  }
}
```

## セキュリティ

### コンテキスト分離

- **contextIsolation: true**: レンダラーコンテキストを分離
- **nodeIntegration: false**: レンダラーでNode.jsを無効化
- **プリロードスクリプト**: 制御されたAPIのみを公開

### 入力検証

```typescript
// メインプロセスでの検証
ipcMain.handle('write-file', async (event, filepath, content) => {
  // パスの検証
  if (!isValidPath(filepath)) {
    throw new Error('Invalid file path')
  }

  // 権限の検証
  if (!hasWritePermission(filepath)) {
    throw new Error('Access denied')
  }

  // コンテンツのサニタイゼーション
  const sanitizedContent = sanitize(content)

  return await fs.writeFile(filepath, sanitizedContent)
})
```

## デプロイメント

### ビルドプロセス

```bash
# 完全ビルド
pnpm build

# 異なるプラットフォーム向けパッケージング
pnpm pack:prod  # 全プラットフォーム
pnpm pack:mac   # macOSのみ
pnpm pack:win   # Windowsのみ
pnpm pack:linux # Linuxのみ
```

### 配布

- **GitHub Releases**: 自動配布
- **自動アップデーター**: アプリ内更新
- **コード署名**: 信頼証明書
