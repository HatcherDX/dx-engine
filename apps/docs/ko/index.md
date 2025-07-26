---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: ''
  text: ''
  tagline: 'AI 개발을 위한 제어된 증폭. 전문 개발자에게 AI에 대한 결정론적 제어를 제공하는 오픈소스 IDE. 추측을 멈추고 제공을 시작하세요.'
  actions:
    - theme: brand
      text: 시작하기
      link: /ko/getting-started
    - theme: alt
      text: GitHub에서 보기
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: 철학
      link: /ko/philosophy

features:
  - icon: 👁️
    title: '비주얼-투-코드 브릿지'
    details: '시각적 변경사항을 설명하는 대신 지시하세요. 라이브 애플리케이션의 직접 조작이 정확하고 안전하며 컨텍스트를 인식하는 코드 변경으로 변환됩니다.'

  - icon: 📚
    title: '팀 플레이북 (기업 헌법)'
    details: '정적 컨텍스트 파일을 적절한 시간에 AI에게 올바른 아키텍처 규칙을 제공하는 동적이고 중앙화된 시스템으로 대체합니다.'

  - icon: 🔄
    title: '테스트 자동 수정'
    details: '자동화된 테스트 루프는 AI 변경사항이 품질 기준을 충족하도록 보장합니다. 이 강화 루프를 통해 AI는 코드가 기능적으로 증명될 때까지 자체 수정할 수 있습니다.'
---

## AI 시대를 위해 구축됨

소프트웨어 개발은 변곡점에 있습니다. AI가 80%의 코드를 생성할 수 있지만, 개발자들은 미세 조정과 제어의 "마지막 마일"에서 고군분투하고 있습니다.

**Hatcher는 이러한 마찰을 제거하여** 시행착오를 유동적이고 직관적인 워크플로우로 변환합니다.

### 우리가 해결하는 문제들

<div class="problem-grid">
  <div class="problem-item">
    <h4>설명을 멈추세요. 지시를 시작하세요.</h4>
    <p>라이브 애플리케이션과 소스 코드 사이의 격차를 해소합니다. 비주얼-투-코드 브릿지가 당신의 의도를 행동으로 변환합니다.</p>
  </div>
  
  <div class="problem-item">
    <h4>당신의 AI는 잊어버립니다. 우리 것은 기억합니다.</h4>
    <p>정적 컨텍스트 파일을 적절한 시간에 올바른 아키텍처 규칙을 제공하는 동적 팀 플레이북으로 대체합니다.</p>
  </div>
  
  <div class="problem-item">
    <h4>더 이상 블랙박스는 없습니다. 오직 파워만.</h4>
    <p>시각적 diff, 자동화된 테스트, 추측이 아닌 제어를 위해 구축된 워크플로우로 AI에 대한 결정론적 제어를 유지합니다.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>수석 AI 시스템 아키텍트 및 창립자</h5>
    <p>
      22년 이상의 경험을 가진 Chriss는 베테랑 시스템 아키텍트이자 연쇄 창업가입니다. 그의 경력은 초기 단계 YC 스타트업부터 대규모 기업에 이르기까지 복잡하고 데이터 집약적인 플랫폼을 구축하는 데 전념해왔습니다.
    </p>
    <p>
      Hatcher는 수년간의 R&D의 정점이며, 클라이언트 사이드 아키텍처, 분산 시스템에서의 그의 기초적인 작업과 소프트웨어의 미래가 인간의 직관을 대체하는 것이 아니라 증폭하는 데 있다는 그의 깊은 신념에서 탄생했습니다.
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
