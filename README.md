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
  <strong>The IDE for builders who ship.</strong>
  <br /><br />
  <a href="ROADMAP.md"><img src="https://img.shields.io/badge/Project%20Status-Alpha-orange" alt="Project Status: Alpha"></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/dynamic/json?label=Coverage&query=%24.total.statements.pct&suffix=%25&url=https%3A%2F%2Fraw.githubusercontent.com%2FHatcherDX%2Fdx-engine%2Fcoverage-reports%2Fcoverage-summary.json&colorB=brightgreen&colorA=gray&style=flat" alt="Test Coverage">
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="https://twitter.com/HatcherDX"><img src="https://img.shields.io/twitter/follow/HatcherDX?style=social" alt="Follow on Twitter"></a>
</p>
<br><br><br>

## The Vision: Controlled Amplification

Software development is at an inflection point. While AI can generate 80% of an application's code, developers are left frustrated in the "last mile" of fine-tuning, debugging, and aligning the output with existing patterns. This is due to a fundamental loss of deterministic control.

**Hatcher** is an open-source IDE designed to conquer the full "0-to-100" workflow. It acts as the definitive **deterministic control interface** for powerful AI engines like Claude Code and Gemini CLI. We call our philosophy "Controlled Amplification": the developer remains the surgeon, using Hatcher to wield AI as a high-precision scalpel.

## The Problem We Solve

Hatcher is built to eliminate the friction that AI introduces, transforming a frustrating cycle of trial-and-error into a fluid, intuitive workflow.

- **Stop Describing. Start Pointing:** Bridge the gap between your live application and source code with the Visual-to-Code bridge.
- **Your AI Forgets. Ours Remembers:** Replace static context files with dynamic Team Playbooks that provide the right architectural rules at the right time.
- **No More Black Boxes. Just Power:** Maintain deterministic command over AI with visual diffs, **configurable quality pipelines**, and automated testing.

## Project Status: Alpha

Hatcher is currently in a very early stage of development. The core `Visual-to-Code` technology has been validated in a private proof-of-concept, and we are now building the foundational MVP.

We are building in public and welcome the community to join us on this journey. Expect bugs, rapid changes, and an open conversation about the future of development.

Uses:

- Vue.js
- Typescript
- Turborepo
- Vite (for Electron builds)

## More Than an IDE: Your Productivity Anchor

Hatcher isn't just another AI-powered editor. It's designed as your **productivity anchor** – a command center that protects your flow state from the relentless stream of digital distractions that plague modern development.

Every design choice, from our intentionally bold interface to our focused feature set, serves a single purpose: **minimizing cognitive friction**. When Slack notifications pull your attention, when emails demand immediate response, when the chaos of modern work threatens to fragment your focus – Hatcher acts as a visual beacon, instantly reconnecting you to your code and your flow.

We believe that in an attention-fractured world, the most revolutionary IDE isn't the one with the most features – it's the one that helps you remember what truly matters: **the code, the problem, and the elegant solution waiting to emerge**.

## Getting Started

The first alpha version of Hatcher is scheduled for release soon. The easiest way to get started will be to download the official release for your operating system from our **[GitHub Releases](https://github.com/HatcherDX/dx-engine/releases)** page. Stay tuned!

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

## Roadmap

Our vision is ambitious. We're starting with the core "fine-tuning" workflow, but our roadmap includes building a full "0-to-100" experience.

- ✅ **Core Innovation:** Visual-to-Code Sync (AST-based)
- ➡️ **Next Up:** Integrated Git & Automated Test-Correction Loops
- 🚀 **Future: The "Corporate Constitutions" / Team Playbooks System** This is more than a feature; it's our strategic solution to the context problem. It will allow teams to create versionable, governable sets of rules and context for the AI.
- 🌌 **Long Term: The Open-Source Workflow Marketplace** Our long-term vision is to evolve the Playbooks system into a marketplace where experts can build, share, and sell high-quality, trusted workflows, creating a defensible ecosystem built on safety and reliability.

_For more details on each item and future plans, see our full **[Project Roadmap](ROADMAP.md)**._

## Contributing

We believe the future of development tools will be built by the community. If you are passionate about developer experience and the future of AI, we would love your help.

Please read our **[CONTRIBUTING.md](CONTRIBUTING.md)** to learn how you can get involved, from reporting bugs to submitting your first pull request.

## About the Author

Hatcher is created by **Chriss Mejía**, a Principal AI Systems Architect & Founder with over 22 years of experience building complex platforms for companies ranging from early-stage YC startups to large-scale enterprises.

This project is the culmination of years of R&D, born from his deep belief that the future of software lies in amplifying, not replacing, human intuition.

## License

Copyright (c) 2025 Chriss Mejía. This project is licensed under the **[MIT License](LICENSE.md)**.
