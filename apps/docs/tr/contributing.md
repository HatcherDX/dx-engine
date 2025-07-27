---
title: Katkıda Bulunma | Hatcher IDE Geliştirmeye Nasıl Katkıda Bulunulur
description: Hatcher IDE'ye nasıl katkıda bulunacağınızı öğrenin. Açık kaynak projede kod katkıları, dokümantasyon, test ve topluluk katılımı için yönergeler.
---

# Hatcher'a Katkıda Bulunma

Hatcher'a katkıda bulunma ilginiz için teşekkürler! Bu rehber projeye katkıda bulunmaya başlamanızda yardımcı olacaktır.

## Davranış Kuralları

Bu projeye katılarak, [Davranış Kurallarımızı](CODE_OF_CONDUCT.md) kabul etmiş olursunuz. Katkıda bulunmadan önce lütfen okuyun.

## Başlarken

### Geliştirme Kurulumu

1. **Fork ve Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **Bağımlılıkları Yükle**

   ```bash
   pnpm install
   ```

3. **Geliştirme Sunucusunu Başlat**
   ```bash
   pnpm dev
   ```

### Proje Yapısı

```
dx-engine/
├── apps/
│   ├── electron/          # Ana Electron süreci
│   ├── web/              # Renderer süreci (Vue.js)
│   ├── preload/          # Preload scriptleri
│   └── docs/             # VitePress dokümantasyonu
├── universal/
│   ├── vite-plugin/      # Özel Vite eklentileri
│   └── puppeteer-google-translate/
└── scripts/              # Build ve geliştirme scriptleri
```

## Katkıda Bulunma Yolları

### Bug Bildirme

Bug bildirirken lütfen şunları ekleyin:

- **Açık Açıklama**: Ne oldu vs. ne beklediğiniz
- **Yeniden Üretme Adımları**: Sorunu yeniden oluşturmak için detaylı adımlar
- **Ortam**: İşletim sistemi, Node.js sürümü, pnpm sürümü
- **Ekran Görüntüleri**: Uygunsa, görsel kanıt ekleyin

Issue oluştururken [bug raporu şablonumuzu](.github/ISSUE_TEMPLATE/bug_report.md) kullanın.

### Özellik İstekleri

Özellik isteklerini memnuniyetle karşılıyoruz! Lütfen şunları ekleyin:

- **Kullanım Durumu**: Bu özellik neden gerekli?
- **Önerilen Çözüm**: Nasıl çalışmalı?
- **Alternatifler**: Hangi diğer yaklaşımları düşündünüz?

[Özellik isteği şablonumuzu](.github/ISSUE_TEMPLATE/feature_request.md) kullanın.

### Kod Katkıları

#### Başlamadan Önce

1. **Mevcut Issue'ları Kontrol Edin**: İlgili issue'ları veya özellik isteklerini arayın
2. **Büyük Değişiklikleri Tartışın**: Önemli değişiklikleri tartışmak için bir issue açın
3. **Küçük Başlayın**: Küçük, odaklanmış katkılarla başlayın

#### Geliştirme İş Akışı

1. **Branch Oluştur**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Değişiklik Yap**
   - Kodlama standartlarımızı takip edin (aşağıya bakın)
   - Yeni işlevsellik için testler yazın
   - Gerektiğinde dokümantasyonu güncelleyin

3. **Değişikliklerinizi Test Edin**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Değişikliklerinizi Commit Edin**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   [Conventional Commits](https://conventionalcommits.org/) formatını takip ediyoruz.

5. **Push ve PR Oluştur**
   ```bash
   git push origin feature/your-feature-name
   ```

## Kodlama Standartları

Hatcher, projenin tamamında tutarlılık, sürdürülebilirlik ve yüksek kaliteli kod sağlamak için katı kodlama standartlarını takip eder.

**📋 [Tam Kodlama Standartları Rehberi](./coding-standards.md)**

### Hızlı Referans

**TypeScript**

- Tüm yeni kod için strict mode etkin TypeScript kullanın
- Nesne şekilleri için type'lar yerine interface'leri tercih edin
- Değişkenler ve fonksiyonlar için anlamlı, açıklayıcı isimler kullanın
- Tüm genel API'ler için JSDoc yorumları ekleyin

**Vue.js**

- `<script setup>` sözdizimi ile Composition API kullanın
- Props ve emits'i TypeScript interface'leri ile tanımlayın
- Yeniden kullanılabilir mantık için composable'ları tercih edin
- Tek dosya bileşen yapısını takip edin: script → template → style

### Kod Kalite Araçları

Standartları uygulamak için otomatik araçlar kullanıyoruz:

```bash
# Kod stili sorunlarını lint et ve düzelt
pnpm lint:fix

# Tip kontrolü
pnpm typecheck

# Tüm testleri çalıştır
pnpm test

# Kodu formatla
pnpm format
```

## Pull Request Süreci

### Göndermeden Önce

- [ ] Kod proje standartlarını takip ediyor
- [ ] Testler yerel olarak geçiyor
- [ ] Dokümantasyon güncellendi
- [ ] Değişiklikler odaklanmış ve atomik

### PR Açıklama Şablonu

```markdown
## Açıklama

Değişikliklerin kısa açıklaması

## Değişiklik Türü

- [ ] Bug düzeltmesi
- [ ] Yeni özellik
- [ ] Kırıcı değişiklik
- [ ] Dokümantasyon güncellemesi

## Test

- [ ] Birim testleri eklendi/güncellendi
- [ ] Entegrasyon testleri eklendi/güncellendi
- [ ] Manuel test tamamlandı
```

## Topluluk

### İletişim Kanalları

- **GitHub Issues**: Bug raporları ve özellik istekleri
- **GitHub Discussions**: Genel sorular ve fikirler
- **Discord**: Toplulukla gerçek zamanlı sohbet
- **Twitter**: Güncellemeler için [@HatcherDX](https://twitter.com/HatcherDX)'i takip edin

### Topluluk Kuralları

- **Saygılı Olun**: Herkese saygıyla davranın
- **Yapıcı Olun**: Problemlere değil çözümlere odaklanın
- **Sabırlı Olun**: Hepimizin gönüllü olduğunu unutmayın
- **Yardımcı Olun**: Bilgiyi paylaşın ve diğerlerine yardım edin

## Geliştirme Kaynakları

### Faydalı Bağlantılar

- [Vue.js Dokümantasyonu](https://vuejs.org/)
- [Electron Dokümantasyonu](https://electronjs.org/)
- [TypeScript El Kitabı](https://typescriptlang.org/)
- [Vite Dokümantasyonu](https://vitejs.dev/)

## Sorular?

Katkıda bulunma hakkında sorularınız varsa:

1. Mevcut [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions)'ı kontrol edin
2. [Discord topluluğumuza](https://discord.gg/hatcher) katılın
3. Yeni bir tartışma veya issue oluşturun

Hatcher'a katkıda bulunduğunuz için teşekkürler! Birlikte, AI destekli geliştirmenin geleceğini inşa ediyoruz.
