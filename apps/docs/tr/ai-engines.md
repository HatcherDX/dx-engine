# AI Motorları

Hatcher, esneklik sağlamak ve farklı modellerin benzersiz güçlü yanlarından yararlanmak için birden fazla AI kodlama asistanı ile entegre olur.

## Desteklenen Motorlar

### Claude Code

Anthropic'in Claude'u ana AI motorumuz ve şunlar için optimize edilmiştir:

- **Kod Anlayışı**: Mevcut kod tabanlarının mükemmel anlaşılması
- **Desen Tanıma**: Proje konvansiyonları ile tutarlılığı korur
- **Güvenli Refaktoring**: Kod değişiklikleri için konservatif yaklaşım
- **Bağlam Farkındalığı**: Büyük kod tabanlarını etkili şekilde işler

**Yapılandırma:**

```json
{
  "engine": "claude",
  "model": "claude-3-sonnet",
  "maxTokens": 4096,
  "temperature": 0.1
}
```

### Gemini CLI

Google'ın Gemini'si tamamlayıcı yetenekler sağlar:

- **Yaratıcı Çözümler**: Karmaşık sorunlara alternatif yaklaşımlar
- **Performans Optimizasyonu**: Verimli kod üretimine odaklanma
- **Çoklu Dil Desteği**: Çeşitli teknoloji yığınları için güçlü destek
- **Hızlı İterasyon**: Hızlı düzenlemeler için hızlı yanıt süreleri

### Motor Seçimi Stratejisi

Hatcher, göreve göre en iyi motoru otomatik olarak seçer:

- **Yeni Bileşenler**: Yapı için Claude, yaratıcılık için Gemini
- **Bug Düzeltmeleri**: Dikkatli analiz için Claude
- **Performans**: Optimizasyon önerileri için Gemini

## Yapılandırma

### API Anahtarı Kurulumu

#### Claude API Anahtarı

1. [Anthropic Console](https://console.anthropic.com)'u ziyaret edin
2. Yeni bir API anahtarı oluşturun
3. Hatcher ayarlarına veya ortam değişkenine ekleyin:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

#### Gemini API Anahtarı

1. [Google AI Studio](https://aistudio.google.com)'yu ziyaret edin
2. Yeni bir API anahtarı oluşturun
3. Hatcher'da yapılandırın:
   ```bash
   export GOOGLE_AI_API_KEY="your-key-here"
   ```

## Motor Karşılaştırması

| Özellik       | Claude     | Gemini     |
| ------------- | ---------- | ---------- |
| Kod Kalitesi  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| Hız           | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Bağlam Boyutu | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Yaratıcılık   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Güvenlik      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |

## Gelecekteki Motorlar

Aktif olarak şunlar için destek üzerinde çalışıyoruz:

- **GitHub Copilot**: VS Code iş akışları ile doğrudan entegrasyon
- **OpenAI GPT-4**: Genel amaçlı kodlama yardımı
- **Yerel Modeller**: Gizlilik bilincine sahip ekipler için kendi kendine barındırılan seçenekler
- **Özel Motorlar**: Özel AI araçları için eklenti sistemi

## En İyi Uygulamalar

### Prompt Mühendisliği

Hatcher her motor için promptları otomatik olarak optimize eder:

- **Claude**: Detaylı bağlam ve açık talimatlar
- **Gemini**: Net hedeflerle kısa promptlar

### Hata İşleme

Güçlü yedek sistemler sürekliliği sağlar:

- **Ana Motor Kapalı**: Yedek motora otomatik geçiş
- **Hız Sınırlaması**: Akıllı istek sıralama
- **Ağ Sorunları**: Yaygın kalıpların yerel önbelleği

### Maliyet Optimizasyonu

- **Token Yönetimi**: Verimli bağlam sıkıştırma
- **İstek Gruplaması**: Birden fazla küçük değişikliği birleştirme
- **Önbellekleme**: Benzer kod üretim sonuçlarını yeniden kullanma
