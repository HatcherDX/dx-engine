---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Hatcher | The IDE for Controlled AI Development
description: An open-source IDE that gives professional developers deterministic control over AI. Visual-to-code bridge, team playbooks, and test auto-correction for professional development teams.

hero:
  name: ''
  text: ''
  tagline: 'Controlled Amplification for AI Development. An open-source IDE that gives professional developers deterministic control over AI. Stop the guesswork. Start shipping.'
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: Philosophy
      link: /philosophy

features:
  - icon: 👁️
    title: 'Visual-to-Code Bridge'
    details: 'Point to visual changes instead of describing them. Direct manipulation of your live application translates into precise, safe, and context-aware code changes.'

  - icon: 📚
    title: 'Team Playbooks (Corporate Constitutions)'
    details: 'Replace static context files with a dynamic, centralized system that provides AI with the right architectural rules at the right time.'

  - icon: 🔄
    title: 'Test Auto-correction'
    details: 'Automated test loops ensure AI changes meet your quality standards. This reinforcement loop allows the AI to self-correct until the code is proven functional.'
---

## Built for the AI Era

Software development is at an inflection point. While AI can generate 80% of code, developers struggle with the "last mile" of fine-tuning and control.

**Hatcher eliminates this friction**, transforming trial-and-error into fluid, intuitive workflow.

### The Problems We Solve

<div class="problem-grid">
  <div class="problem-item">
    <h4>Stop Describing. Start Pointing.</h4>
    <p>Bridge the gap between your live application and source code. The Visual-to-Code bridge translates your intent into action.</p>
  </div>
  
  <div class="problem-item">
    <h4>Your AI Forgets. Ours Remembers.</h4>
    <p>Replace static context files with dynamic Team Playbooks that provide the right architectural rules at the right time.</p>
  </div>
  
  <div class="problem-item">
    <h4>No More Black Boxes. Just Power.</h4>
    <p>Maintain deterministic command over AI with visual diffs, automated testing, and a workflow built for control, not guesswork.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>Principal AI Systems Architect & Founder</h5>
    <p>
      With over 22 years of experience, Chriss is a veteran systems architect and serial founder. His career has been dedicated to building complex, data-intensive platforms for companies ranging from early-stage YC startups to large-scale enterprises.
    </p>
    <p>
      Hatcher is the culmination of years of R&D, born from his foundational work in client-side architectures, decentralized systems, and his deep belief that the future of software lies in amplifying, not replacing, human intuition.
    </p>
  </div>
</div>

<style>
.problem-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.problem-item {
  padding: 1.5rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.problem-item h4 {
  margin: 0 0 1rem 0;
  color: var(--vp-c-brand-1);
}

.problem-item p {
  margin: 0;
  color: var(--vp-c-text-2);
}

.architect-card {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  margin: 2rem 0;
}

.architect-photo {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.architect-photo img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.architect-bio h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--vp-c-brand-1);
}

.architect-bio h5 {
  margin: 0 0 1rem 0;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.architect-bio p {
  margin: 0;
}

@media (max-width: 768px) {
  .architect-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
