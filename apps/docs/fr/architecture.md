---
title: Architecture | Conception Technique et Principes d'Ingénierie de Hatcher IDE
description: Explorez l'architecture technique de Hatcher conçue pour l'Amplification Contrôlée. Découvrez la conception déterministe, l'approche agnostique des modèles et les principes d'ingénierie open source.
---

# Architecture

Hatcher est construit comme une application Electron moderne avec une architecture monorepo qui privilégie la scalabilité, la maintenabilité et les performances.

## Architecture de Haut Niveau

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

## Structure du Monorepo

```
dx-engine/
├── apps/                    # Applications principales
│   ├── electron/           # Processus principal Electron
│   ├── web/               # Processus renderer Vue.js
│   ├── preload/           # Scripts preload sécurisés
│   └── docs/              # Documentation VitePress
│
├── universal/             # Packages partagés
│   ├── vite-plugin/       # Plugins Vite personnalisés
│   └── puppeteer-google-translate/  # Service de traduction
│
├── scripts/               # Scripts d'automatisation
│   ├── translation/       # Système de traduction TypeScript
│   ├── setup-env.ts      # Configuration d'environnement
│   ├── version-bump.ts   # Gestion des versions
│   └── generate-icons.ts # Génération d'icônes
│
└── Config Files           # Configuration du projet
    ├── package.json       # Configuration du workspace
    ├── turbo.json         # Configuration Turborepo
    └── tsconfig.json      # Configuration TypeScript
```

## Processus Electron

### Main Process (apps/electron/)

Le processus principal gère :

- **Gestion des Fenêtres** : Créer et contrôler les fenêtres d'application
- **Intégration IA** : Communication avec les services IA externes
- **Accès Système** : Opérations de fichiers et système
- **Sécurité** : Validation et assainissement des entrées

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

### Renderer Process (apps/web/)

Le processus renderer contient l'UI Vue.js :

- **Pont Visuel-vers-Code** : Fonctionnalité centrale de sélection visuelle
- **Éditeur de Code** : Éditeur intégré avec coloration syntaxique
- **Gestion de Projets** : Explorateur de fichiers et gestion
- **Composants UI** : Interface utilisateur réactive

### Scripts Preload (apps/preload/)

Scripts preload sécurisés qui exposent des APIs contrôlées :

```typescript
// apps/preload/src/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Opérations de fichiers sécurisées
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke('write-file', path, content),

  // Intégration IA
  callAI: (prompt: string, context: any) =>
    ipcRenderer.invoke('ai-request', prompt, context),

  // Opérations Git
  gitStatus: () => ipcRenderer.invoke('git-status'),
  gitDiff: () => ipcRenderer.invoke('git-diff'),
})
```

## Stack Technologique

### Frontend (Renderer)

- **Vue.js 3** : Framework réactif avec Composition API
- **TypeScript** : Développement avec sûreté de types
- **Vite** : Outils de build rapides
- **Pinia** : Gestion d'état moderne
- **Vue Router** : Routage côté client

### Backend (Main Process)

- **Electron** : Framework d'application desktop
- **Node.js** : Runtime JavaScript
- **TypeScript** : Développement avec sûreté de types
- **IPC** : Communication inter-processus

### Outils de Développement

- **Turborepo** : Gestion monorepo et cache
- **ESLint** : Linting de code
- **Prettier** : Formatage de code
- **Vitest** : Framework de test
- **Istanbul** : Couverture de code

## Intégration IA

### Abstraction des Moteurs

```typescript
interface AIEngine {
  name: string
  generate(prompt: string, context: Context): Promise<AIResponse>
  validateConfig(): boolean
}

class ClaudeEngine implements AIEngine {
  async generate(prompt: string, context: Context) {
    // Implémentation spécifique Claude
  }
}

class GeminiEngine implements AIEngine {
  async generate(prompt: string, context: Context) {
    // Implémentation spécifique Gemini
  }
}
```

### Gestion du Contexte

```typescript
class ContextManager {
  buildContext(element: DOMElement, project: Project): Context {
    return {
      element: this.serializeElement(element),
      componentTree: this.getComponentTree(element),
      projectRules: project.playbooks,
      codeStyle: project.eslintConfig,
    }
  }
}
```

## Sécurité

### Isolation de Contexte

- **contextIsolation: true** : Isoler les contextes renderer
- **nodeIntegration: false** : Désactiver Node.js dans renderer
- **Scripts Preload** : Exposer uniquement des APIs contrôlées

### Validation d'Entrée

```typescript
// Validation dans Main Process
ipcMain.handle('write-file', async (event, filepath, content) => {
  // Valider le chemin
  if (!isValidPath(filepath)) {
    throw new Error('Invalid file path')
  }

  // Valider les permissions
  if (!hasWritePermission(filepath)) {
    throw new Error('Access denied')
  }

  // Assainir le contenu
  const sanitizedContent = sanitize(content)

  return await fs.writeFile(filepath, sanitizedContent)
})
```

## Déploiement

### Processus de Build

```bash
# Build complet
pnpm build

# Empaquetage pour différentes plateformes
pnpm pack:prod  # Toutes les plateformes
pnpm pack:mac   # macOS seulement
pnpm pack:win   # Windows seulement
pnpm pack:linux # Linux seulement
```

### Distribution

- **GitHub Releases** : Distribution automatique
- **Auto-updater** : Mises à jour dans l'app
- **Code Signing** : Certificats de confiance
