---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: ''
  text: ''
  tagline: '为AI开发提供受控放大。一个开源IDE，为专业开发者提供对AI的确定性控制。停止猜测。开始交付。'
  actions:
    - theme: brand
      text: 开始使用
      link: /zh-cn/getting-started
    - theme: alt
      text: 在GitHub查看
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: 理念
      link: /zh-cn/philosophy

features:
  - icon: 👁️
    title: '视觉到代码桥梁'
    details: '指向视觉变化而不是描述它们。直接操作您的实时应用程序转化为精确、安全和上下文感知的代码更改。'

  - icon: 📚
    title: '团队手册（企业宪法）'
    details: '用动态的集中式系统替换静态上下文文件，在正确的时间为AI提供正确的架构规则。'

  - icon: 🔄
    title: '测试自动纠错'
    details: '自动化测试循环确保AI更改符合您的质量标准。这个强化循环允许AI自我纠正，直到代码被证明是功能性的。'
---

## 为AI时代而构建

软件开发正处于拐点。虽然AI可以生成80%的代码，但开发者在微调和控制的"最后一英里"上苦苦挣扎。

**Hatcher消除了这种摩擦**，将试错转化为流畅、直观的工作流程。

### 我们解决的问题

<div class="problem-grid">
  <div class="problem-item">
    <h4>停止描述。开始指向。</h4>
    <p>弥合您的实时应用程序和源代码之间的差距。视觉到代码桥梁将您的意图转化为行动。</p>
  </div>
  
  <div class="problem-item">
    <h4>您的AI会忘记。我们的会记住。</h4>
    <p>用动态团队手册替换静态上下文文件，在正确的时间提供正确的架构规则。</p>
  </div>
  
  <div class="problem-item">
    <h4>不再有黑盒。只有力量。</h4>
    <p>通过视觉差异、自动化测试和为控制而非猜测构建的工作流程，保持对AI的确定性控制。</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>首席AI系统架构师和创始人</h5>
    <p>
      拥有超过22年的经验，Chriss是一位资深系统架构师和连续创业者。他的职业生涯致力于为从早期YC初创公司到大型企业的公司构建复杂的数据密集型平台。
    </p>
    <p>
      Hatcher是多年研发的成果，源于他在客户端架构、去中心化系统方面的基础工作，以及他对软件未来在于放大而非替代人类直觉的深刻信念。
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
