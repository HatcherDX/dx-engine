# Architektur

Hatcher ist als moderne Electron-Anwendung mit einer Monorepo-Architektur gebaut, die Skalierbarkeit, Wartbarkeit und Performance priorisiert.

## High-Level Architektur

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

## Monorepo-Struktur

```
dx-engine/
├── apps/                    # Hauptanwendungen
│   ├── electron/           # Electron Main Process
│   ├── web/               # Vue.js Renderer Process
│   ├── preload/           # Sichere Preload Scripts
│   └── docs/              # VitePress Dokumentation
│
├── universal/             # Geteilte Packages
│   ├── vite-plugin/       # Benutzerdefinierte Vite Plugins
│   └── puppeteer-google-translate/  # Übersetzungsservice
│
├── scripts/               # Automatisierungsscripts
│   ├── translation/       # TypeScript Übersetzungssystem
│   ├── setup-env.ts      # Umgebungskonfiguration
│   ├── version-bump.ts   # Versionsverwaltung
│   └── generate-icons.ts # Icon-Generierung
│
└── Config Files           # Projektkonfiguration
    ├── package.json       # Workspace-Konfiguration
    ├── turbo.json         # Turborepo-Konfiguration
    └── tsconfig.json      # TypeScript-Konfiguration
```

## Electron Prozesse

### Main Process (apps/electron/)

Der Main Process verwaltet:

- **Fensterverwaltung**: Erstellen und Steuern von Anwendungsfenstern
- **KI-Integration**: Kommunikation mit externen KI-Services
- **Systemzugriff**: Datei- und Systemoperationen
- **Sicherheit**: Eingabevalidierung und -bereinigung

### Renderer Process (apps/web/)

Der Renderer Process enthält die Vue.js UI:

- **Visuell-zu-Code-Brücke**: Zentrale visuelle Auswahlfunktionalität
- **Code-Editor**: Integrierter Editor mit Syntax-Hervorhebung
- **Projektverwaltung**: Datei-Explorer und Management
- **UI-Komponenten**: Reaktive Benutzeroberfläche

## Technologie-Stack

### Frontend (Renderer)

- **Vue.js 3**: Reaktives Framework mit Composition API
- **TypeScript**: Typsichere Entwicklung
- **Vite**: Schnelle Build-Tools
- **Pinia**: Moderne Zustandsverwaltung
- **Vue Router**: Clientseitiges Routing

### Backend (Main Process)

- **Electron**: Desktop-Anwendungsframework
- **Node.js**: JavaScript Runtime
- **TypeScript**: Typsichere Entwicklung
- **IPC**: Inter-Process Communication

## Sicherheit

### Kontextisolation

- **contextIsolation: true**: Renderer-Kontexte isolieren
- **nodeIntegration: false**: Node.js im Renderer deaktivieren
- **Preload Scripts**: Nur kontrollierte APIs bereitstellen

## Deployment

### Build-Prozess

```bash
# Vollständiger Build
pnpm build

# Paketierung für verschiedene Plattformen
pnpm pack:prod  # Alle Plattformen
pnpm pack:mac   # Nur macOS
pnpm pack:win   # Nur Windows
pnpm pack:linux # Nur Linux
```
