---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Hatcher | 制御されたAI開発のためのIDE
description: 開発プロセスにおいて制御と精度を維持しながらAIの力を活用したいプロの開発者向けに設計されたオープンソース統合開発環境

hero:
  name: ''
  text: ''
  tagline: 'AI開発のための制御された増幅。プロフェッショナル開発者にAIの決定論的制御を与えるオープンソースIDE。推測をやめて、デリバリーを始めましょう。'
  actions:
    - theme: brand
      text: 始める
      link: /ja/getting-started
    - theme: alt
      text: GitHubで見る
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: 哲学
      link: /ja/philosophy

features:
  - icon: 👁️
    title: 'ビジュアル・トゥ・コード ブリッジ'
    details: 'ビジュアルな変更を説明するのではなく、指し示してください。ライブアプリケーションの直接操作が、正確で安全かつコンテキストを認識したコード変更に変換されます。'

  - icon: 📚
    title: 'チームプレイブック（企業憲法）'
    details: '静的なコンテキストファイルを、適切なタイミングでAIに適切なアーキテクチャルルールを提供する動的で集中化されたシステムに置き換えます。'

  - icon: 🔄
    title: 'テスト自動修正'
    details: '自動化されたテストループにより、AIの変更が品質基準を満たすことを保証します。この強化ループにより、AIはコードが機能的に証明されるまで自己修正できます。'
---

## AI時代のために構築

ソフトウェア開発は変曲点にあります。AIは80%のコードを生成できますが、開発者は微調整と制御の「ラストマイル」で苦労しています。

**Hatcherはこの摩擦を排除し**、試行錯誤を流動的で直感的なワークフローに変換します。

### 私たちが解決する問題

<div class="problem-grid">
  <div class="problem-item">
    <h4>説明をやめる。指し示すことを始める。</h4>
    <p>ライブアプリケーションとソースコードの間のギャップを埋めます。ビジュアル・トゥ・コード ブリッジがあなたの意図を行動に変換します。</p>
  </div>
  
  <div class="problem-item">
    <h4>あなたのAIは忘れる。私たちのAIは覚えている。</h4>
    <p>静的なコンテキストファイルを、適切なタイミングで適切なアーキテクチャルルールを提供する動的チームプレイブックに置き換えます。</p>
  </div>
  
  <div class="problem-item">
    <h4>もうブラックボックスはない。パワーだけ。</h4>
    <p>ビジュアルdiff、自動テスト、そして推測ではなく制御のために構築されたワークフローでAIの決定論的制御を維持します。</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>主席AIシステムアーキテクト＆創設者</h5>
    <p>
      22年以上の経験を持つChrissは、ベテランのシステムアーキテクトであり連続起業家です。彼のキャリアは、初期段階のYCスタートアップから大規模企業まで、企業向けの複雑でデータ集約的なプラットフォームの構築に捧げられています。
    </p>
    <p>
      Hatcherは長年のR&Dの集大成であり、クライアントサイドアーキテクチャ、分散システムでの彼の基礎的な仕事、そしてソフトウェアの未来は人間の直感を置き換えるのではなく増幅することにあるという彼の深い信念から生まれました。
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
