---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Hatcher | O IDE para Desenvolvimento Controlado com IA
description: Ambiente de desenvolvimento integrado de código aberto projetado para desenvolvedores profissionais que querem aproveitar o poder da IA mantendo controle e precisão em seu processo de desenvolvimento

hero:
  name: ''
  text: ''
  tagline: 'Amplificação Controlada para Desenvolvimento com IA. Um IDE de código aberto que dá aos desenvolvedores profissionais controle determinístico sobre IA. Pare de adivinhar. Comece a entregar.'
  actions:
    - theme: brand
      text: Começar
      link: /pt/getting-started
    - theme: alt
      text: Ver no GitHub
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: Filosofia
      link: /pt/philosophy

features:
  - icon: 👁️
    title: 'Ponte Visual-para-Código'
    details: 'Aponte para mudanças visuais em vez de descrevê-las. A manipulação direta da sua aplicação ao vivo se traduz em mudanças de código precisas, seguras e conscientes do contexto.'

  - icon: 📚
    title: 'Playbooks de Equipe (Constituições Corporativas)'
    details: 'Substitua arquivos de contexto estáticos por um sistema dinâmico e centralizado que fornece à IA as regras arquiteturais certas no momento certo.'

  - icon: 🔄
    title: 'Auto-correção de Testes'
    details: 'Loops de testes automatizados garantem que as mudanças da IA atendam aos seus padrões de qualidade. Este loop de reforço permite que a IA se auto-corrija até que o código seja comprovadamente funcional.'
---

## Construído para a Era da IA

O desenvolvimento de software está em um ponto de inflexão. Embora a IA possa gerar 80% do código, os desenvolvedores lutam com a "última milha" do ajuste fino e controle.

**Hatcher elimina esse atrito**, transformando tentativa e erro em fluxo de trabalho fluido e intuitivo.

### Os Problemas que Resolvemos

<div class="problem-grid">
  <div class="problem-item">
    <h4>Pare de Descrever. Comece a Apontar.</h4>
    <p>Feche a lacuna entre sua aplicação ao vivo e o código fonte. A ponte Visual-para-Código traduz sua intenção em ação.</p>
  </div>
  
  <div class="problem-item">
    <h4>Sua IA Esquece. A Nossa Lembra.</h4>
    <p>Substitua arquivos de contexto estáticos por Playbooks de Equipe dinâmicos que fornecem as regras arquiteturais certas no momento certo.</p>
  </div>
  
  <div class="problem-item">
    <h4>Chega de Caixas Pretas. Apenas Poder.</h4>
    <p>Mantenha controle determinístico sobre IA com diffs visuais, testes automatizados e um fluxo de trabalho construído para controle, não adivinhação.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>Arquiteto Principal de Sistemas de IA e Fundador</h5>
    <p>
      Com mais de 22 anos de experiência, Chriss é um arquiteto de sistemas veterano e fundador serial. Sua carreira tem sido dedicada à construção de plataformas complexas e intensivas em dados para empresas que vão desde startups YC em estágio inicial até grandes corporações.
    </p>
    <p>
      Hatcher é o culminar de anos de P&D, nascido de seu trabalho fundamental em arquiteturas do lado do cliente, sistemas descentralizados, e sua profunda crença de que o futuro do software reside em amplificar, não substituir, a intuição humana.
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
