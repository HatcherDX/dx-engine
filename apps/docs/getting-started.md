---
title: Getting Started | Hatcher IDE for AI Development
description: Get up and running with Hatcher IDE. Download, install, and start building with controlled AI development. Complete setup guide for the open-source IDE that gives developers deterministic control over AI.
---

# Getting Started with Hatcher

Welcome to Hatcher, the IDE designed for controlled amplification in the AI era. This guide will help you get up and running quickly.

## Prerequisites

Before installing Hatcher, make sure you have:

- **Node.js** 22.0.0 or higher
- **pnpm** 10.6.0 or higher (recommended package manager)
- **Git** for version control

## Installation

### Option 1: Download Release (Recommended)

1. Visit our [GitHub Releases](https://github.com/HatcherDX/dx-engine/releases)
2. Download the latest version for your platform:
   - macOS: `Hatcher-v0.1.0-mac.dmg`
   - Windows: `Hatcher-v0.1.0-win.exe`
   - Linux: `Hatcher-v0.1.0-linux.AppImage`

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/HatcherDX/dx-engine.git
cd dx-engine

# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Or build for production
pnpm build
pnpm pack:prod
```

## First Steps

### 1. Launch Hatcher

Open the Hatcher application. You'll see the main interface with:

- **Project Explorer**: Manage your projects
- **Visual Canvas**: See your application live
- **Code Editor**: Edit source code with AI assistance
- **Playbooks Panel**: Manage AI context and rules

### 2. Create Your First Project

1. Click **"New Project"** or press `Cmd+N` (Mac) / `Ctrl+N` (Windows/Linux)
2. Choose a template:
   - **Vue + TypeScript**: Modern web application
   - **React + TypeScript**: Popular framework choice
   - **Electron App**: Desktop application
   - **Empty Project**: Start from scratch

3. Configure your project settings:
   - Project name
   - Location
   - AI engine preference (Claude Code, Gemini CLI)

### 3. Configure AI Integration

Hatcher works with several AI engines. Set up your preferred one:

#### Claude Code (Recommended)

```bash
# Install Claude CLI
npm install -g @anthropic/claude-cli

# Authenticate with your API key
claude auth login
```

#### Gemini CLI

```bash
# Install Gemini CLI
npm install -g @google/gemini-cli

# Configure with your API key
gemini config set-key YOUR_API_KEY
```

### 4. Your First AI-Assisted Change

1. **Visual Selection**: Click on any element in your live preview
2. **Describe Change**: Use natural language to describe what you want
3. **Review Code**: See the generated code changes in the diff panel
4. **Apply or Refine**: Accept the changes or iterate with feedback

## Key Concepts

### Controlled Amplification

Unlike traditional AI coding assistants, Hatcher maintains **deterministic control**:

- You point to what you want changed (visual selection)
- AI generates precise code changes
- You review and approve before applying
- Automated tests validate the changes

### Playbooks

Playbooks are dynamic context files that help AI understand your project:

- **Team Rules**: Coding standards and patterns
- **Architecture Guidelines**: How your app is structured
- **Component Library**: Reusable components and their usage
- **API Patterns**: How to interact with your backend

## Next Steps

- [Understanding the Philosophy](/philosophy) - Learn about Controlled Amplification
- [Visual-to-Code Bridge](/visual-to-code) - Master the core feature
- [Setting up Playbooks](/playbooks) - Optimize AI performance
- [Contributing](/contributing) - Join our community

## Need Help?

- **Documentation**: Browse our complete docs
- **GitHub Issues**: Report bugs or request features
- **Discord**: Join our community chat
- **Twitter**: Follow [@HatcherDX](https://twitter.com/HatcherDX) for updates

Welcome to the future of development! 🚀
