---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: ''
  text: ''
  tagline: 'Amplifikasi Terkendali untuk Pengembangan AI. IDE open-source yang memberikan developer profesional kontrol deterministik atas AI. Berhenti menebak. Mulai berkarya.'
  actions:
    - theme: brand
      text: Mulai
      link: /id/getting-started
    - theme: alt
      text: Lihat di GitHub
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: Filosofi
      link: /id/philosophy

features:
  - icon: 👁️
    title: 'Jembatan Visual-ke-Kode'
    details: 'Tunjuk perubahan visual alih-alih mendeskripsikannya. Manipulasi langsung aplikasi live Anda diterjemahkan menjadi perubahan kode yang presisi, aman, dan sadar konteks.'

  - icon: 📚
    title: 'Playbook Tim (Konstitusi Korporat)'
    details: 'Ganti file konteks statis dengan sistem dinamis dan terpusat yang memberikan AI aturan arsitektural yang tepat pada waktu yang tepat.'

  - icon: 🔄
    title: 'Koreksi Otomatis Tes'
    details: 'Loop tes otomatis memastikan perubahan AI memenuhi standar kualitas Anda. Loop penguatan ini memungkinkan AI untuk mengoreksi diri sendiri hingga kode terbukti fungsional.'
---

## Dibangun untuk Era AI

Pengembangan perangkat lunak berada di titik belok. Meskipun AI dapat menghasilkan 80% kode, developer berjuang dengan "mil terakhir" dari fine-tuning dan kontrol.

**Hatcher menghilangkan gesekan ini**, mengubah coba-coba menjadi alur kerja yang lancar dan intuitif.

### Masalah yang Kami Selesaikan

<div class="problem-grid">
  <div class="problem-item">
    <h4>Berhenti Mendeskripsikan. Mulai Menunjuk.</h4>
    <p>Jembatani kesenjangan antara aplikasi live Anda dan kode sumber. Jembatan Visual-ke-Kode menerjemahkan niat Anda menjadi tindakan.</p>
  </div>
  
  <div class="problem-item">
    <h4>AI Anda Lupa. Milik Kami Ingat.</h4>
    <p>Ganti file konteks statis dengan Playbook Tim dinamis yang memberikan aturan arsitektural yang tepat pada waktu yang tepat.</p>
  </div>
  
  <div class="problem-item">
    <h4>Tidak Ada Lagi Kotak Hitam. Hanya Kekuatan.</h4>
    <p>Pertahankan kontrol deterministik atas AI dengan diff visual, pengujian otomatis, dan alur kerja yang dibangun untuk kontrol, bukan tebakan.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>Arsitek Sistem AI Utama & Pendiri</h5>
    <p>
      Dengan lebih dari 22 tahun pengalaman, Chriss adalah arsitek sistem veteran dan pendiri serial. Kariernya telah didedikasikan untuk membangun platform kompleks dan data-intensif untuk perusahaan mulai dari startup YC tahap awal hingga perusahaan besar.
    </p>
    <p>
      Hatcher adalah puncak dari bertahun-tahun R&D, lahir dari karyanya yang fundamental dalam arsitektur sisi klien, sistem terdesentralisasi, dan keyakinan mendalam bahwa masa depan perangkat lunak terletak pada memperkuat, bukan menggantikan, intuisi manusia.
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
