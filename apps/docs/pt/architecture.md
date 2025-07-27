---
title: Arquitetura | Design Técnico e Princípios de Engenharia do Hatcher IDE
description: Explore a arquitetura técnica do Hatcher projetada para Amplificação Controlada. Aprenda sobre o design determinístico, abordagem agnóstica de modelo e princípios de engenharia de código aberto.
---

# Arquitetura

Hatcher é construído como uma aplicação Electron moderna com uma arquitetura monorepo que prioriza escalabilidade, manutenibilidade e performance.

## Arquitetura de Alto Nível

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

## Estrutura do Monorepo

```
dx-engine/
├── apps/                    # Aplicações principais
│   ├── electron/           # Processo principal Electron
│   ├── web/               # Processo renderer Vue.js
│   ├── preload/           # Scripts preload seguros
│   └── docs/              # Documentação VitePress
│
├── universal/             # Pacotes compartilhados
│   ├── vite-plugin/       # Plugins Vite personalizados
│   └── puppeteer-google-translate/  # Serviço de tradução
│
├── scripts/               # Scripts de automação
│   ├── translation/       # Sistema de tradução TypeScript
│   ├── setup-env.ts      # Configuração de ambiente
│   ├── version-bump.ts   # Gestão de versões
│   └── generate-icons.ts # Geração de ícones
│
└── Config Files           # Configuração do projeto
    ├── package.json       # Configuração do workspace
    ├── turbo.json         # Configuração Turborepo
    └── tsconfig.json      # Configuração TypeScript
```

## Processos Electron

### Main Process (apps/electron/)

O processo principal gerencia:

- **Gestão de Janelas**: Criar e controlar janelas da aplicação
- **Integração IA**: Comunicação com serviços IA externos
- **Acesso ao Sistema**: Operações de arquivo e sistema
- **Segurança**: Validação e sanitização de entrada

### Renderer Process (apps/web/)

O processo renderer contém a UI Vue.js:

- **Ponte Visual-para-Código**: Funcionalidade central de seleção visual
- **Editor de Código**: Editor integrado com destaque de sintaxe
- **Gestão de Projetos**: Explorador de arquivos e gestão
- **Componentes UI**: Interface de usuário reativa

## Stack Tecnológico

### Frontend (Renderer)

- **Vue.js 3**: Framework reativo com Composition API
- **TypeScript**: Desenvolvimento com segurança de tipos
- **Vite**: Ferramentas de build rápidas
- **Pinia**: Gestão de estado moderna
- **Vue Router**: Roteamento do lado do cliente

### Backend (Main Process)

- **Electron**: Framework de aplicação desktop
- **Node.js**: Runtime JavaScript
- **TypeScript**: Desenvolvimento com segurança de tipos
- **IPC**: Comunicação inter-processos

## Segurança

### Isolamento de Contexto

- **contextIsolation: true**: Isolar contextos do renderer
- **nodeIntegration: false**: Desabilitar Node.js no renderer
- **Scripts Preload**: Expor apenas APIs controladas

## Implantação

### Processo de Build

```bash
# Build completo
pnpm build

# Empacotamento para diferentes plataformas
pnpm pack:prod  # Todas as plataformas
pnpm pack:mac   # Apenas macOS
pnpm pack:win   # Apenas Windows
pnpm pack:linux # Apenas Linux
```
