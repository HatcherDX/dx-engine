# AI Engine

Hatcher terintegrasi dengan beberapa asisten coding AI untuk memberikan fleksibilitas dan memanfaatkan kekuatan unik dari model yang berbeda.

## Engine yang Didukung

### Claude Code

Claude dari Anthropic adalah engine AI utama kami, dioptimalkan untuk:

- **Pemahaman Kode**: Pemahaman yang sangat baik terhadap codebase yang ada
- **Pengenalan Pola**: Mempertahankan konsistensi dengan konvensi proyek
- **Refactoring Aman**: Pendekatan konservatif terhadap modifikasi kode
- **Kesadaran Konteks**: Menangani codebase besar secara efektif

**Konfigurasi:**

```json
{
  "engine": "claude",
  "model": "claude-3-sonnet",
  "maxTokens": 4096,
  "temperature": 0.1
}
```

### Gemini CLI

Gemini dari Google menyediakan kemampuan komplementer:

- **Solusi Kreatif**: Pendekatan alternatif untuk masalah kompleks
- **Optimasi Performa**: Fokus pada generasi kode yang efisien
- **Dukungan Multi-bahasa**: Dukungan kuat untuk tech stack yang beragam
- **Iterasi Cepat**: Waktu respons cepat untuk edit cepat

## Strategi Pemilihan Engine

Hatcher secara otomatis memilih engine terbaik berdasarkan tugas:

- **Komponen Baru**: Claude untuk struktur, Gemini untuk kreativitas
- **Perbaikan Bug**: Claude untuk analisis yang hati-hati
- **Performa**: Gemini untuk saran optimasi

## Setup API Keys

### Claude API Key

1. Kunjungi [Anthropic Console](https://console.anthropic.com)
2. Generate API key baru
3. Tambahkan ke pengaturan Hatcher atau environment variable:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

### Gemini API Key

1. Kunjungi [Google AI Studio](https://aistudio.google.com)
2. Buat API key baru
3. Konfigurasi di Hatcher:
   ```bash
   export GOOGLE_AI_API_KEY="your-key-here"
   ```

## Perbandingan Engine

| Fitur          | Claude     | Gemini     |
| -------------- | ---------- | ---------- |
| Kualitas Kode  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| Kecepatan      | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Ukuran Konteks | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Kreativitas    | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Keamanan       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |

## Engine Masa Depan

Kami sedang aktif mengerjakan dukungan untuk:

- **GitHub Copilot**: Integrasi langsung dengan workflow VS Code
- **OpenAI GPT-4**: Bantuan coding tujuan umum
- **Model Lokal**: Opsi self-hosted untuk tim yang sadar privasi
- **Engine Kustom**: Sistem plugin untuk tool AI proprietary

## Best Practices

### Prompt Engineering

Hatcher secara otomatis mengoptimalkan prompt untuk setiap engine:

- **Claude**: Konteks detail dan instruksi eksplisit
- **Gemini**: Prompt ringkas dengan tujuan yang jelas

### Error Handling

Sistem fallback yang kuat memastikan kontinuitas:

- **Engine Utama Down**: Switch otomatis ke fallback
- **Rate Limiting**: Antrian request yang cerdas
- **Masalah Jaringan**: Caching lokal pola umum

### Optimasi Biaya

- **Manajemen Token**: Kompresi konteks yang efisien
- **Batching Request**: Gabungkan beberapa perubahan kecil
- **Caching**: Gunakan ulang hasil generasi kode yang serupa
