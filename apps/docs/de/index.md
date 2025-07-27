---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Hatcher | Die IDE für Kontrollierte KI-Entwicklung
description: Eine Open-Source-IDE, die professionellen Entwicklern deterministische Kontrolle über KI gibt. Visuell-zu-Code-Brücke, Team-Playbooks und Test-Auto-Korrektur für professionelle Entwicklungsteams.

hero:
  name: ''
  text: ''
  tagline: 'Kontrollierte Verstärkung für KI-Entwicklung. Eine Open-Source-IDE, die professionellen Entwicklern deterministische Kontrolle über KI gibt. Schluss mit Vermutungen. Fangen Sie an zu liefern.'
  actions:
    - theme: brand
      text: Loslegen
      link: /de/getting-started
    - theme: alt
      text: Auf GitHub ansehen
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: Philosophie
      link: /de/philosophy

features:
  - icon: 👁️
    title: 'Visuell-zu-Code-Brücke'
    details: 'Zeigen Sie auf visuelle Änderungen, anstatt sie zu beschreiben. Die direkte Manipulation Ihrer Live-Anwendung übersetzt sich in präzise, sichere und kontextbewusste Code-Änderungen.'

  - icon: 📚
    title: 'Team-Playbooks (Unternehmens-Verfassungen)'
    details: 'Ersetzen Sie statische Kontextdateien durch ein dynamisches, zentralisiertes System, das der KI die richtigen architektonischen Regeln zur richtigen Zeit liefert.'

  - icon: 🔄
    title: 'Test-Auto-Korrektur'
    details: 'Automatisierte Test-Schleifen stellen sicher, dass KI-Änderungen Ihren Qualitätsstandards entsprechen. Diese Rückkopplungsschleife ermöglicht es der KI, sich selbst zu korrigieren, bis der Code bewiesenermaßen funktional ist.'
---

## Gebaut für das KI-Zeitalter

Die Softwareentwicklung steht an einem Wendepunkt. Während KI 80% des Codes generieren kann, kämpfen Entwickler mit der "letzten Meile" der Feinabstimmung und Kontrolle.

**Hatcher eliminiert diese Reibung** und verwandelt Trial-and-Error in einen fließenden, intuitiven Workflow.

### Die Probleme, die wir lösen

<div class="problem-grid">
  <div class="problem-item">
    <h4>Hören Sie auf zu beschreiben. Fangen Sie an zu zeigen.</h4>
    <p>Überbrücken Sie die Lücke zwischen Ihrer Live-Anwendung und dem Quellcode. Die Visuell-zu-Code-Brücke übersetzt Ihre Absicht in Aktion.</p>
  </div>
  
  <div class="problem-item">
    <h4>Ihre KI vergisst. Unsere erinnert sich.</h4>
    <p>Ersetzen Sie statische Kontextdateien durch dynamische Team-Playbooks, die die richtigen architektonischen Regeln zur richtigen Zeit liefern.</p>
  </div>
  
  <div class="problem-item">
    <h4>Keine Black Boxes mehr. Nur Macht.</h4>
    <p>Behalten Sie deterministische Kontrolle über KI mit visuellen Diffs, automatisierten Tests und einem Workflow, der für Kontrolle, nicht für Vermutungen gebaut ist.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>Principal KI-System-Architekt & Gründer</h5>
    <p>
      Mit über 22 Jahren Erfahrung ist Chriss ein erfahrener System-Architekt und serieller Gründer. Seine Laufbahn war dem Aufbau komplexer, datenintensiver Plattformen für Unternehmen gewidmet, die von frühen YC-Startups bis zu großen Unternehmen reichen.
    </p>
    <p>
      Hatcher ist der Höhepunkt jahrelanger F&E, entstanden aus seiner grundlegenden Arbeit in clientseitigen Architekturen, dezentralisierten Systemen und seinem tiefen Glauben, dass die Zukunft der Software darin liegt, menschliche Intuition zu verstärken, nicht zu ersetzen.
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
