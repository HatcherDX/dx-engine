# Hatcher Architecture

The architecture of Hatcher is deliberately designed to embody our core philosophy: **Controlled Amplification**. Every component and technology choice serves our mission to create a deterministic, powerful, and extensible development environment that keeps the developer firmly in control.

## Architectural Principles

- **Deterministic by Design:** The system is engineered to be predictable. We avoid "black boxes" in favor of clear, reviewable actions.
- **Developer in Control:** The developer is the ultimate authority. The architecture provides the tools to amplify their intent, not replace it.
- **Model-Agnostic:** While optimized for leading models, the architecture is designed to be a universal control plane, capable of integrating with multiple AI engines.
- **Open Core:** The core client-side IDE is and always will be open-source (MIT). The value for teams is built upon a separate, cloud-based service.

## Core Components

### 1. Visual-to-Code Bridge

The heart of Hatcher's innovation. This engine translates interactions on the rendered UI (clicks, drags, selections) into structural understanding of the source code via Abstract Syntax Tree (AST) analysis. It's the real-time synchronization engine between visual intent and code reality.

### 2. AI Engine Integration (Orchestration Layer)

This is the central nervous system of the application. It receives intent from the developer, gathers the appropriate context from the Playbooks System, constructs the precise prompt for the selected AI engine (like Claude or Gemini), and manages the response. It acts as a universal, model-agnostic control plane.

### 3. Playbooks System (Constitutional Context Engine)

Our solution to the context problem, and the core of our commercial "Teams" offering. This is a proprietary, cloud-based service that:

- **Provides Centralized Governance:** Stores and serves versioned "Playbooks" for teams.
- **Injects Dynamic Context:** Gives the AI the right architectural rules at the right time, solving the problems of static files like `Claude.md`.

## Technology Stack Justification

| Component         | Technology     | Why We Chose It                                                                                      |
| :---------------- | :------------- | :--------------------------------------------------------------------------------------------------- |
| **Desktop Shell** | **Electron**   | Provides the best cross-platform capabilities and deep OS integration needed for a professional IDE. |
| **UI Framework**  | **Vue.js 3**   | Its Composition API and reactivity model are ideal for building a complex, stateful interface.       |
| **Language**      | **TypeScript** | Ensures type-safety and scalability, which is non-negotiable for a project of this complexity.       |
| **Monorepo**      | **Turborepo**  | Allows us to manage our multi-package architecture (client, cloud, shared libraries) efficiently.    |

## Security & Privacy

Security and trust are foundational to Hatcher.

- **Local-First:** All your source code remains on your local machine. It is only passed to an AI engine as context for a specific, user-initiated action.
- **No Code Storage:** We do not store your code on our servers. Our cloud backend only manages the "Playbooks" and user accounts.
- **Deterministic Control:** The entire workflow is designed to be transparent. You see every change the AI proposes before it is applied, eliminating unexpected or malicious code modifications.
