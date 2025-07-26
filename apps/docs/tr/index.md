---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: ''
  text: ''
  tagline: 'AI Geliştirme için Kontrollü Güçlendirme. Profesyonel geliştiricilere AI üzerinde deterministik kontrol sağlayan açık kaynak IDE. Tahmin etmeyi bırakın. Teslim etmeye başlayın.'
  actions:
    - theme: brand
      text: Başlayın
      link: /tr/getting-started
    - theme: alt
      text: GitHub\'da Görüntüle
      link: https://github.com/HatcherDX/dx-engine
    - theme: alt
      text: Felsefe
      link: /tr/philosophy

features:
  - icon: 👁️
    title: 'Görsel-Kod Köprüsü'
    details: 'Görsel değişiklikleri tanımlamak yerine işaret edin. Canlı uygulamanızın doğrudan manipülasyonu kesin, güvenli ve bağlam bilinçli kod değişikliklerine çevrilir.'

  - icon: 📚
    title: "Takım Playbook'ları (Kurumsal Anayasalar)"
    details: "Statik bağlam dosyalarını, doğru zamanda AI'ya doğru mimari kuralları sağlayan dinamik, merkezi bir sistemle değiştirin."

  - icon: 🔄
    title: 'Test Otomatik Düzeltme'
    details: "Otomatik test döngüleri AI değişikliklerinin kalite standartlarınızı karşılamasını sağlar. Bu pekiştirme döngüsü AI'nın kod işlevsel olarak kanıtlanana kadar kendini düzeltmesine olanak tanır."
---

## AI Çağı için İnşa Edildi

Yazılım geliştirme bir dönüm noktasında. AI kodun %80\'ini üretebilirken, geliştiriciler ince ayar ve kontrolün "son milinde" mücadele ediyor.

**Hatcher bu sürtünmeyi ortadan kaldırır**, deneme yanılmayı akıcı, sezgisel iş akışına dönüştürür.

### Çözdüğümüz Sorunlar

<div class="problem-grid">
  <div class="problem-item">
    <h4>Tanımlamayı Bırakın. İşaret Etmeye Başlayın.</h4>
    <p>Canlı uygulamanız ile kaynak kod arasındaki boşluğu kapatın. Görsel-Kod Köprüsü niyetinizi eyleme çevirir.</p>
  </div>
  
  <div class="problem-item">
    <h4>Sizin AI\'nız Unutur. Bizimki Hatırlar.</h4>
    <p>Statik bağlam dosyalarını doğru zamanda doğru mimari kuralları sağlayan dinamik Takım Playbook\'larıyla değiştirin.</p>
  </div>
  
  <div class="problem-item">
    <h4>Artık Kara Kutu Yok. Sadece Güç.</h4>
    <p>Görsel diff\'ler, otomatik testler ve tahmin için değil kontrol için inşa edilmiş iş akışıyla AI üzerinde deterministik kontrol sürdürün.</p>
  </div>
</div>

<div class="architect-card">
  <div class="architect-photo">
    <img src="/chriss.jpg" alt="Chriss Mejía">
  </div>
  <div class="architect-bio">
    <h4>Chriss Mejía</h4>
    <h5>Baş AI Sistem Mimarı ve Kurucu</h5>
    <p>
      22 yıldan fazla deneyimi olan Chriss, deneyimli bir sistem mimarı ve seri girişimcidir. Kariyeri erken aşama YC startup\'larından büyük ölçekli işletmelere kadar şirketler için karmaşık, veri yoğun platformlar inşa etmeye adanmıştır.
    </p>
    <p>
      Hatcher yıllarca süren Ar-Ge\'nin doruk noktasıdır, istemci tarafı mimariler, merkezi olmayan sistemlerdeki temel çalışmasından ve yazılımın geleceğinin insan sezgisini değiştirmede değil güçlendirmede yattığına dair derin inancından doğmuştur.
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
