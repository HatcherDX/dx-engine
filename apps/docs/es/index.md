---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Hatcher | El IDE para Desarrollo con IA Controlada
description: Un IDE de código abierto que brinda a los desarrolladores profesionales control determinístico sobre la IA. Puente visual-a-código, playbooks de equipo y auto-corrección de pruebas para equipos de desarrollo profesional.

hero:
  name: ''
  text: ''
  tagline: 'Amplificación Controlada para el Desarrollo con IA. Un IDE de código abierto que brinda a los desarrolladores profesionales control determinístico sobre la IA. Acaba con las conjeturas. Comienza a entregar.'
  actions:
    - theme: brand
      text: Comenzar
      link: /es/getting-started
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: Filosofía
      link: /es/philosophy

features:
  - icon: 👁️
    title: 'Puente Visual-a-Código'
    details: 'Señala cambios visuales en lugar de describirlos. La manipulación directa de tu aplicación en vivo se traduce en cambios de código precisos, seguros y conscientes del contexto.'

  - icon: 📚
    title: 'Playbooks de Equipo (Constituciones Corporativas)'
    details: 'Reemplaza archivos de contexto estáticos con un sistema dinámico y centralizado que proporciona a la IA las reglas arquitectónicas correctas en el momento correcto.'

  - icon: 🔄
    title: 'Auto-corrección de Pruebas'
    details: 'Los bucles de pruebas automatizados aseguran que los cambios de IA cumplan con tus estándares de calidad. Este bucle de refuerzo permite que la IA se auto-corrija hasta que el código sea funcionalmente probado.'
---

## Construido para la Era de la IA

El desarrollo de software está en un punto de inflexión. Aunque la IA puede generar el 80% del código, los desarrolladores luchan con la "última milla" del ajuste fino y control.

**Hatcher elimina esta fricción**, transformando el ensayo y error en un flujo de trabajo fluido e intuitivo.

### Los Problemas que Resolvemos

<div class="problem-grid">
  <div class="problem-item">
    <h4>Deja de Describir. Comienza a Señalar.</h4>
    <p>Cierra la brecha entre tu aplicación en vivo y el código fuente. El puente Visual-a-Código traduce tu intención en acción.</p>
  </div>
  
  <div class="problem-item">
    <h4>Tu IA Olvida. La Nuestra Recuerda.</h4>
    <p>Reemplaza archivos de contexto estáticos con Playbooks de Equipo dinámicos que proporcionan las reglas arquitectónicas correctas en el momento correcto.</p>
  </div>
  
  <div class="problem-item">
    <h4>No Más Cajas Negras. Solo Poder.</h4>
    <p>Mantén control determinístico sobre la IA con diffs visuales, pruebas automatizadas, y un flujo de trabajo construido para el control, no para conjeturas.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>Arquitecto Principal de Sistemas de IA y Fundador</h5>
    <p>
      Con más de 22 años de experiencia, Chriss es un arquitecto de sistemas veterano y fundador serial. Su carrera ha estado dedicada a construir plataformas complejas e intensivas en datos para empresas que van desde startups de YC en etapa temprana hasta grandes empresas.
    </p>
    <p>
      Hatcher es la culminación de años de I+D, nacido de su trabajo fundamental en arquitecturas del lado del cliente, sistemas descentralizados, y su profunda creencia de que el futuro del software radica en amplificar, no reemplazar, la intuición humana.
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
