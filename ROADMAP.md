# Hatcher Go-to-Market Roadmap

This document outlines our strategic priorities for bringing Hatcher to market. It is a living document that translates the mission laid out in our main [**README.md**](README.md) into a concrete, commercially-focused plan.

Our development is currently laser-focused on the shortest path to proving our core value proposition and building a sustainable open-source business.

---

### ✅ Phase 0: The Foundation (v0.4.0 - Completed)

**Objective:** Build and validate the "luxury scaffolding"—the enterprise-grade architectural pillars required to support our ambitious vision.

- Status: Completed. We shipped a world-class foundation including our custom Git Engine, a Secure Storage Engine (with AES-256 vault), and a GPU-accelerated Professional Terminal.

- Key Outcome: Achieved ~90% test coverage and a robust, multi-platform CI/CD pipeline. This proves our commitment to the engineering excellence required for a mission-critical tool.

### 🟡 Phase 1: Validating the Core Value (v0.5.0 - In Progress)

**Objective:** Validate our core "Controlled Amplification" philosophy by delivering a focused and impressive experience within the **Gen HAT**.

#### Strategic Focus:

Our entire team is dedicated to perfecting a single, "magical" workflow: `Prompt -> Constitutional Validation -> Time Graph Review -> Commit.`

#### Strategic Note:

The successful completion of Phase 1 will culminate in our application to Y Combinator. Our goal is to present a validated MVP, a strong design partner testimonial, and a clear vision for market leadership.

#### Key Results:

- **[✅ Completed] AI Integration Layer:** Successfully implemented a multi-provider AI engine with Claude Code CLI as the first provider. Features include real-time streaming, automatic provider detection, CLI warm-up optimization, and project-context awareness. The architecture is extensible for future providers (Gemini, GPT-5, etc.).

- **[In Progress] End-to-End Generative Workflow:** The Gen HAT UI is connected to Claude Code CLI with full streaming support. Next: implementing system prompt configuration, Playbook execution, and output parsing into the Time Graph.

- **[To Do] The Immutable Diff Panel:** The Time Machine must provide a clear, deterministic review process for all AI-generated code. This is the non-negotiable heart of our promise of governance.

- **[To Do] A Focused Experience:** Aggressively hide or disable all other incomplete modes and features. The goal is to present a stable and awe-inspiring experience centered exclusively on the core generative loop.

### 🚀 Phase 2: Igniting the Flywheel (v0.6.0 - Next)

**Objective:** Launch the free tier of **Gen HAT** to the public, initiating our Product-Led Growth (PLG) and community flywheel.

**Strategic Focus:** Drive mass adoption, gather critical user feedback, and cultivate our initial cohort of community champions.

**Key Results:**

- **Launch:** Release a polished, publicly available version of the **Hatcher IDE**, with the **Gen HAT** as the core experience, for free, local use.
- **Activation:** Achieve a strong activation rate, measured by the percentage of users who successfully execute their first AI-powered code generation and review it in the Time Graph.

- **Community:** Foster the creation and sharing of the first public Playbooks, kickstarting the viral loop.

### 💰 Phase 3: Monetization & The EGG Platform (v1.0.0 and Beyond)

**Objective:** Launch our commercial tiers and execute on our full platform strategy by offering two distinct EGG configurations to solve specific enterprise challenges.

#### Track 1: Core Product Evolution (Free Tier)

- **Mission:** Continue to build the most powerful free, local-use IDE for AI-powered development.

- **Roadmap:**
  - **Local LLM Support:** Integrate with local models via Ollama to fulfill our promise of AI Sovereignty.

  - **Expanded Playbook Library:** Grow the public marketplace of Playbooks with community contributions.

  - **Performance Enhancements:** Continuously improve the speed and efficiency of the core IDE.

#### Track 2: The EGG Platform

- **Mission:** Provide a unified platform for building mission-critical software, allowing teams to choose the optimal configuration for their needs.

- **Roadmap:**
  - **Teams Tier (v1.0.0):** Introduce our first paid feature: Private Playbook Marketplaces. This allows teams to codify, share, and enforce their internal standards and best practices.

  - **Enterprise Tier (v1.1.0):** Launch Hatcher EGGs (Enforced Governance Guardrails) Platform, featuring:
    - **EGG "Compatibility":** The solution for large-scale enterprise deployment where 100% visual and functional consistency is the **highest priority.** This configuration leverages **Tauri with an embedded CEF (Chromium) engine** to guarantee identical behavior across all environments.

    - **EGG "Performance":** The solution for environments where **efficiency, a minimal footprint, and the highest level of security are paramount.** This configuration uses **Tauri's native OS WebView** for a lightweight, fast, and secure runtime.

  - **Auditability & Compliance:** Ship advanced Time Machine features for compliance officers and introduce robust audit logging.

  - **Hatcher BaaS:** Launch our integrated Backend-as-a-Service to provide a zero-friction, end-to-end deployment solution for Hatcher EGGs.

#### Track 3: The Future: Community & Core

- **Mission:** Fulfill our long-term architectural vision by empowering the community and forging our core in Rust.

- **Roadmap:**
  - **Community-Powered Performance:** Actively work with the open-source community to perfect the cross-platform consistency of our EGG "Performance" (Tauri Native) components.

  - **The Path to Rust:** Begin the strategic migration of the **Hatcher IDE** itself from our proven Electron prototype to a next-generation engine forged in Rust.

## Our Guiding Principle

This roadmap reflects our commitment to a deliberate, phased approach. We are balancing foundational stability with ambitious innovation to establish Hatcher as the definitive Constitutional IDE for the AI era by providing clear, powerful solutions for every stage of the development lifecycle.
