  <details>
    <summary></summary>
    <h1>Hatcher: The DX Engine</h1>
  </details>
<br><br><br>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./.github/assets/logo-light.svg">
    <img alt="Hatcher Logo" src="./.github/assets/logo-dark.svg" width="200">
  </picture>
</p>

<p align="center">
  <em>The IDE for builders who ship.</em>
</p>

<p align="center">
  <a href="#-project-status-alpha"><img src="https://img.shields.io/badge/Project%20Status-Alpha-orange" alt="Project Status: Alpha"></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/dynamic/json?label=Coverage&query=%24.total.statements.pct&suffix=%25&url=https%3A%2F%2Fraw.githubusercontent.com%2FHatcherDX%2Fdx-engine%2Fcoverage-reports%2Fcoverage-summary.json&colorB=brightgreen&colorA=gray&style=flat&cacheSeconds=300" alt="Test Coverage">
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <br />
  <a href="#supported-platforms"><img src="https://img.shields.io/badge/macOS-Nightly%20🌙-orange?style=flat&logo=apple" alt="macOS Nightly"></a>
  <a href="#supported-platforms"><img src="https://img.shields.io/badge/Linux-Nightly%20🌙-orange?style=flat&logo=linux" alt="Linux Nightly"></a>
  <a href="#supported-platforms"><img src="https://img.shields.io/badge/Windows-Nightly%20🌙-orange?style=flat&logo=windows" alt="Windows Nightly"></a>
  <br /><br />
  <a href="https://twitter.com/HatcherDX"><strong>Follow on X</strong></a>
  ·
  <a href="https://discord.gg/cZ7PZvnMk4"><strong>Join our Discord</strong></a>
  ·
  <a href="https://github.com/HatcherDX/dx-engine"><strong>Star on GitHub</strong></a>
</p>
<br>

<p align="center">
  <img src="./.github/assets/GenUI.png" alt="Hatcher GenUI Screenshot" width="800">
</p>

<br>

## The Manifesto: Amplifying, Not Replacing.

Software development is at a turning point. AI can generate code, but it operates like a chaotic junior developer, often breaking more than it fixes. The industry's answer has been to chase full automation, trying to replace the developer. We believe this is fundamentally wrong.

**Hatcher** is the counter-narrative. It's an open-source IDE designed to be the definitive **"Constitutional IDE"** for the AI era. This control interface is the heart of our intelligence layer, which we call `//hatche.rs`. It's built to compose and orchestrate powerful AI models, turning them into reliable, peer-level contributors.

Our philosophy is **"Controlled Amplification"**: the developer remains the surgeon, using Hatcher to wield AI as a high-precision scalpel.

## Core Features

🏛️ **The Constitutional IDE:** Hatcher is built on a foundation of radical transparency. With dedicated, read-only `System` and `Timeline` terminals, you have an immutable audit log of every action the IDE and Git engine perform on your behalf. No black boxes.

⚡️ **AI with Deterministic Control:** Leverage the power of state-of-the-art AI (like GPT-5 and Claude) through a rigorous and configurable **Quality Pipeline**. Every AI suggestion is linted, tested, and validated _before_ you even see it, eliminating the "panicked junior dev" problem.

‍🔬 **Enterprise-Grade Foundations:** We built our own world-class infrastructure to ensure a premium experience. Our core components—the Git Engine, the GPU-accelerated Terminal, and the Secure Storage Engine—are all architected and validated to a **10/10 enterprise-grade standard**.

## 🏛️ Project Status: Alpha

Hatcher is in active development, built on the principle of "luxury scaffolding." We have architected the full vision and are now implementing the core functionality, layer by layer.

| Mode         | Status                        | Next Steps                                                                                                   |
| :----------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Code**     | 🏗️ **Functional Foundations** | The file explorer and interactive terminal are fully functional. Next: integrating the Monaco code editor.   |
| **Timeline** | 🏗️ **Functional Foundations** | The visualization layer is operative. Next: connecting write actions (`commit`, `push`) from our Git engine. |
| **Visual**   | 🏛️ **Architectural Preview**  | The UI scaffolding is in place, ready for the Visual-to-Code bridge implementation.                          |
| **Gen**      | 🏛️ **Architectural Preview**  | The UI is ready for the integration of the first AI model.                                                   |

_For more details, see our full **[Project Roadmap](ROADMAP.md)**._

---

## Supported Platforms

Hatcher is engineered for **uncompromising cross-platform reliability.** Our sophisticated hybrid testing strategy and multi-job CI/CD pipeline guarantee that every critical component is rigorously validated on **macOS, Linux, and Windows** with every commit. We don't just hope it works everywhere; **we prove it.**

_We currently offer experimental **Nightly Builds** for all platforms. As we approach our v1.0, we will begin publishing official, stable releases._

## Our Open Core Pact

Hatcher is and always will be an open-core project. **Our commitment is simple: the core IDE, for local, individual use, will always be free and MIT-licensed.**

Our commercial strategy is focused on providing optional, premium cloud services for teams who need collaboration, governance, and security at scale. This model funds the continuous development of the free, world-class tool that everyone can use.

## Getting Started

The first alpha version of Hatcher is scheduled for release soon. The easiest way to get started will be to download the official release for your operating system from our **[GitHub Releases](https://github.com/HatcherDX/dx-engine/releases)** page. Stay tuned!

### Prerequisites

**Important:** This project requires Node.js 22 or higher and uses node-pty v1.1.0-beta34 for terminal functionality.

#### Node.js 22 Setup

##### Option 1: Using nvm (Recommended)

```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart your terminal or run:
source ~/.zshrc

# Install and use Node.js 22
nvm install 22
nvm use 22
nvm alias default 22
```

##### Option 2: Automatic Setup Script

```bash
# Run our setup script to configure Node.js 22 automatically
./scripts/setup-node.sh
```

#### Dependencies

After setting up Node.js 22, install dependencies:

```bash
pnpm install
```

**Note:** If you encounter terminal issues, the project automatically uses node-pty v1.1.0-beta34 which is compatible with modern Electron versions.

### Environment Variables

This project uses `.env` files for environment variables. After running `pnpm install`, a `postinstall` script will automatically create the necessary `.env` files from their `.env.example` counterparts. You can customize these files with your own settings, but they will be ignored by Git.

```bash
pnpm install
pnpm run dev
```

### Build

```bash
pnpm build
```

### Pack App (Dev)

```bash
pnpm pack:dev
```

### Pack App (Prod)

```bash
pnpm pack:prod
```

## Development & Branches

We use a dual-branch strategy:

- **`nightly`**: Active development branch with daily updates and experimental features
- **`main`**: Stable releases only, promoted from `nightly` after thorough testing

All development and pull requests should target the `nightly` branch.

## Contributing

We believe the future of development tools will be built by the community. If you are passionate about developer experience and the future of AI, we would love your help.

Please read our **[CONTRIBUTING.md](CONTRIBUTING.md)** to learn how you can get involved, from reporting bugs to submitting your first pull request.

## About the Author

Hatcher is created by **Chriss Mejía**, a Principal AI Systems Architect & Founder with over 22 years of experience building complex platforms for companies ranging from early-stage YC startups to large-scale enterprises.

This project is the culmination of years of R&D, born from his deep belief that the future of software lies in amplifying, not replacing, human intuition.

## License

Copyright (c) 2025 Chriss Mejía. This project is licensed under the **[MIT License](LICENSE.md)**.
