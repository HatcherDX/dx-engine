---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: ''
  text: ''
  tagline: "Amplification Contrôlée pour le Développement IA. Un IDE open-source qui donne aux développeurs professionnels un contrôle déterministe sur l'IA. Fini les suppositions. Commencez à livrer."
  actions:
    - theme: brand
      text: Commencer
      link: /fr/getting-started
    - theme: alt
      text: Voir sur GitHub
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: Philosophie
      link: /fr/philosophy

features:
  - icon: 👁️
    title: 'Pont Visuel-vers-Code'
    details: 'Pointez vers les changements visuels au lieu de les décrire. La manipulation directe de votre application en direct se traduit en changements de code précis, sûrs et conscients du contexte.'

  - icon: 📚
    title: "Playbooks d'Équipe (Constitutions Corporatives)"
    details: "Remplacez les fichiers de contexte statiques par un système dynamique et centralisé qui fournit à l'IA les bonnes règles architecturales au bon moment."

  - icon: 🔄
    title: 'Auto-correction des Tests'
    details: "Les boucles de tests automatisées garantissent que les changements IA répondent à vos standards de qualité. Cette boucle de renforcement permet à l'IA de s'auto-corriger jusqu'à ce que le code soit prouvé fonctionnel."
---

## Construit pour l'Ère de l'IA

Le développement logiciel est à un point d'inflexion. Bien que l'IA puisse générer 80% du code, les développeurs luttent avec le "dernier kilomètre" du réglage fin et du contrôle.

**Hatcher élimine cette friction**, transformant les tâtonnements en flux de travail fluide et intuitif.

### Les Problèmes que Nous Résolvons

<div class="problem-grid">
  <div class="problem-item">
    <h4>Arrêtez de Décrire. Commencez à Pointer.</h4>
    <p>Comblez le fossé entre votre application en direct et le code source. Le pont Visuel-vers-Code traduit votre intention en action.</p>
  </div>
  
  <div class="problem-item">
    <h4>Votre IA Oublie. La Nôtre Se Souvient.</h4>
    <p>Remplacez les fichiers de contexte statiques par des Playbooks d'Équipe dynamiques qui fournissent les bonnes règles architecturales au bon moment.</p>
  </div>
  
  <div class="problem-item">
    <h4>Plus de Boîtes Noires. Juste du Pouvoir.</h4>
    <p>Maintenez un contrôle déterministe sur l'IA avec des diffs visuels, des tests automatisés, et un flux de travail construit pour le contrôle, pas les suppositions.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>Architecte Principal des Systèmes IA et Fondateur</h5>
    <p>
      Avec plus de 22 ans d'expérience, Chriss est un architecte de systèmes vétéran et fondateur en série. Sa carrière a été dédiée à la construction de plateformes complexes et intensives en données pour des entreprises allant des startups YC en phase précoce aux grandes entreprises.
    </p>
    <p>
      Hatcher est l'aboutissement d'années de R&D, né de son travail fondamental dans les architectures côté client, les systèmes décentralisés, et sa profonde conviction que l'avenir du logiciel réside dans l'amplification, non le remplacement, de l'intuition humaine.
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
