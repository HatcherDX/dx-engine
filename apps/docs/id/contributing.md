---
title: Berkontribusi | Cara Berkontribusi pada Pengembangan Hatcher IDE
description: Pelajari cara berkontribusi pada Hatcher IDE. Panduan untuk kontribusi kode, dokumentasi, testing, dan partisipasi komunitas dalam proyek open-source.
---

# Berkontribusi ke Hatcher

Terima kasih atas minat Anda untuk berkontribusi ke Hatcher! Panduan ini akan membantu Anda memulai berkontribusi ke proyek.

## Kode Etik

Dengan berpartisipasi dalam proyek ini, Anda setuju untuk mematuhi [Kode Etik](CODE_OF_CONDUCT.md) kami. Mohon baca sebelum berkontribusi.

## Memulai

### Setup Pengembangan

1. **Fork dan Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Jalankan Development Server**
   ```bash
   pnpm dev
   ```

### Struktur Proyek

```
dx-engine/
├── apps/
│   ├── electron/          # Proses utama Electron
│   ├── web/              # Proses renderer (Vue.js)
│   ├── preload/          # Script preload
│   └── docs/             # Dokumentasi VitePress
├── universal/
│   ├── vite-plugin/      # Plugin Vite kustom
│   └── puppeteer-google-translate/
└── scripts/              # Script build dan pengembangan
```

## Cara Berkontribusi

### Melaporkan Bug

Saat melaporkan bug, mohon sertakan:

- **Deskripsi Jelas**: Apa yang terjadi vs. apa yang Anda harapkan
- **Langkah Reproduksi**: Langkah detail untuk membuat ulang masalah
- **Environment**: OS, versi Node.js, versi pnpm
- **Screenshot**: Jika ada, sertakan bukti visual

Gunakan [template laporan bug](.github/ISSUE_TEMPLATE/bug_report.md) kami saat membuat issue.

### Permintaan Fitur

Kami menyambut permintaan fitur! Mohon sertakan:

- **Use Case**: Mengapa fitur ini diperlukan?
- **Solusi yang Diusulkan**: Bagaimana seharusnya bekerja?
- **Alternatif**: Pendekatan lain apa yang Anda pertimbangkan?

Gunakan [template permintaan fitur](.github/ISSUE_TEMPLATE/feature_request.md) kami.

### Kontribusi Kode

#### Sebelum Memulai

1. **Periksa Issue yang Ada**: Cari issue terkait atau permintaan fitur
2. **Diskusikan Perubahan Besar**: Buka issue untuk mendiskusikan perubahan signifikan
3. **Mulai Kecil**: Mulai dengan kontribusi kecil dan terfokus

#### Workflow Pengembangan

1. **Buat Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Buat Perubahan**
   - Ikuti standar coding kami (lihat di bawah)
   - Tulis test untuk fungsionalitas baru
   - Update dokumentasi sesuai kebutuhan

3. **Test Perubahan Anda**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Commit Perubahan Anda**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   Kami mengikuti format [Conventional Commits](https://conventionalcommits.org/).

5. **Push dan Buat PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Standar Coding

Hatcher mengikuti standar coding yang ketat untuk memastikan konsistensi, maintainability, dan kode berkualitas tinggi di seluruh proyek.

**📋 [Panduan Lengkap Standar Coding](./coding-standards.md)**

### Referensi Cepat

**TypeScript**

- Gunakan TypeScript untuk semua kode baru dengan strict mode diaktifkan
- Utamakan interfaces dibanding types untuk bentuk objek
- Gunakan nama yang bermakna dan deskriptif untuk variabel dan fungsi
- Sertakan komentar JSDoc untuk semua API publik

**Vue.js**

- Gunakan Composition API dengan sintaks `<script setup>`
- Definisikan props dan emits dengan interface TypeScript
- Utamakan composables untuk logika yang dapat digunakan ulang
- Ikuti struktur single-file component: script → template → style

### Tools Kualitas Kode

Kami menggunakan tools otomatis untuk menegakkan standar:

```bash
# Lint dan perbaiki masalah gaya kode
pnpm lint:fix

# Type checking
pnpm typecheck

# Jalankan semua test
pnpm test

# Format kode
pnpm format
```

## Proses Pull Request

### Sebelum Submit

- [ ] Kode mengikuti standar proyek
- [ ] Test berhasil secara lokal
- [ ] Dokumentasi diperbarui
- [ ] Perubahan terfokus dan atomik

### Template Deskripsi PR

```markdown
## Deskripsi

Deskripsi singkat perubahan

## Jenis Perubahan

- [ ] Bug fix
- [ ] Fitur baru
- [ ] Breaking change
- [ ] Update dokumentasi

## Testing

- [ ] Unit test ditambah/diperbarui
- [ ] Integration test ditambah/diperbarui
- [ ] Manual testing selesai
```

## Komunitas

### Saluran Komunikasi

- **GitHub Issues**: Laporan bug dan permintaan fitur
- **GitHub Discussions**: Pertanyaan umum dan ide
- **Discord**: Chat real-time dengan komunitas
- **Twitter**: Ikuti [@HatcherDX](https://twitter.com/HatcherDX) untuk update

### Pedoman Komunitas

- **Bersikap Hormat**: Perlakukan semua orang dengan hormat
- **Bersikap Konstruktif**: Fokus pada solusi, bukan masalah
- **Bersabar**: Ingat kita semua relawan
- **Membantu**: Bagikan pengetahuan dan bantu orang lain

## Sumber Daya Pengembangan

### Link Berguna

- [Dokumentasi Vue.js](https://vuejs.org/)
- [Dokumentasi Electron](https://electronjs.org/)
- [Handbook TypeScript](https://typescriptlang.org/)
- [Dokumentasi Vite](https://vitejs.dev/)

## Pertanyaan?

Jika Anda memiliki pertanyaan tentang berkontribusi:

1. Periksa [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions) yang ada
2. Bergabung dengan [komunitas Discord](https://discord.gg/hatcher) kami
3. Buat diskusi atau issue baru

Terima kasih telah berkontribusi ke Hatcher! Bersama-sama, kita membangun masa depan pengembangan yang dibantu AI.
