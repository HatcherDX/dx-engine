# Hatcher Mimarisi

Hatcher'ın mimarisi bilinçli olarak temel felsefemizi somutlaştıracak şekilde tasarlandı: **Kontrollü Yükseltme**. Her bileşen ve teknoloji seçimi, geliştiricinin sıkı kontrol sahibi olduğu deterministik, güçlü ve genişletilebilir bir geliştirme ortamı yaratma misyonumuza hizmet eder.

## Mimari İlkeler

- **Tasarım Gereği Deterministik:** Sistem öngörülebilir olacak şekilde mühendislik edilmiştir. Açık, gözden geçirilebilir eylemler lehine "kara kutular"dan kaçınırız.
- **Geliştirici Kontrolde:** Geliştiricin nihai otoritesi vardır. Mimari, onların niyetini değiştirmek değil, güçlendirmek için araçlar sağlar.
- **Model-Agnostik:** Önde gelen modeller için optimize edilmiş olsa da, mimari evrensel bir kontrol düzlemi olarak tasarlanmış, birden fazla AI motoru ile entegre olabilir.
- **Açık Çekirdek:** Çekirdek istemci tarafı IDE açık kaynak (MIT) ve her zaman öyle kalacaktır. Takımlar için değer, ayrı, bulut tabanlı bir hizmet üzerine inşa edilmiştir.

## Temel Bileşenler

### 1. Visual-to-Code Köprüsü

Hatcher'ın yenilik kalbi. Bu motor, render edilmiş UI'deki etkileşimleri (tıklamalar, sürüklemeler, seçimler) Abstract Syntax Tree (AST) analizi aracılığıyla kaynak kodun yapısal anlayışına çevirir. Görsel niyet ile kod gerçekliği arasındaki gerçek zamanlı senkronizasyon motorudur.

### 2. AI Motor Entegrasyonu (Orkestrasyon Katmanı)

Bu uygulamanın merkezi sinir sistemidir. Geliştiriciden niyeti alır, Playbooks Sisteminden uygun bağlamı toplar, seçilen AI motoru (Claude veya Gemini gibi) için kesin promptu oluşturur ve yanıtı yönetir. Evrensel, model-agnostik bir kontrol düzlemi olarak çalışır.

### 3. Playbooks Sistemi (Anayasal Bağlam Motoru)

Bağlam sorununa çözümümüz ve ticari "Teams" teklifimizin çekirdeği. Bu, aşağıdakileri yapan özel, bulut tabanlı bir hizmettir:

- **Merkezi Yönetişim Sağlar:** Takımlar için sürümlenmiş "Playbook'ları" saklar ve sunar.
- **Dinamik Bağlam Enjekte Eder:** AI'ya doğru zamanda doğru mimari kuralları verir, `Claude.md` gibi statik dosyaların sorunlarını çözer.

## Teknoloji Yığını Gerekçesi

| Bileşen             | Teknoloji      | Neden Seçtik                                                                                                     |
| :------------------ | :------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Masaüstü Kabuğu** | **Electron**   | Profesyönel bir IDE için gerekli en iyi platform arası yetenekleri ve derin işletim sistemi entegrasyonu sağlar. |
| **UI Çerçevesi**    | **Vue.js 3**   | Composition API'si ve reaktivite modeli karmaşık, durumlu bir arayüz oluşturmak için idealdir.                   |
| **Dil**             | **TypeScript** | Bu karmaşıklıktaki bir proje için pazarlık edilemez olan tip güvenliği ve ölçeklenebilirlik sağlar.              |
| **Monorepo**        | **Turborepo**  | Çok paketli mimarimizi (istemci, bulut, paylaşılan kütüphaneler) verimli şekilde yönetmemizi sağlar.             |

## Güvenlik ve Gizlilik

Güvenlik ve güven Hatcher için temeldir.

- **Yerel Öncelikli:** Tüm kaynak kodunuz yerel makinenizde kalır. Yalnızca kullanıcı tarafından başlatılan belirli bir eylem için bağlam olarak bir AI motoruna aktarılır.
- **Kod Depolama Yok:** Kodunuzu sunucularımızda saklamayız. Bulut arka ucumuz yalnızca "Playbook'ları" ve kullanıcı hesaplarını yönetir.
- **Deterministik Kontrol:** Tüm iş akışı şeffaf olacak şekilde tasarlanmıştır. AI'nın önerdiği her değişikliği uygulanmadan önce görürsünüz, beklenmedik veya kötü niyetli kod değişikliklerini ortadan kaldırır.
