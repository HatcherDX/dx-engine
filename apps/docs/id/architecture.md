---
title: Arsitektur | Desain Teknis & Prinsip Engineering Hatcher IDE
description: Jelajahi arsitektur teknis Hatcher yang dirancang untuk Amplifikasi Terkontrol. Pelajari tentang desain deterministik, pendekatan model-agnostic, dan prinsip engineering open-source.
---

# Arsitektur Hatcher

Arsitektur Hatcher sengaja dirancang untuk mewujudkan filosofi inti kami: **Amplifikasi Terkontrol**. Setiap komponen dan pilihan teknologi melayani misi kami untuk menciptakan lingkungan pengembangan yang deterministik, kuat, dan dapat diperluas yang menjaga developer tetap dalam kendali penuh.

## Prinsip Arsitektur

- **Deterministik berdasarkan Desain:** Sistem dirancang agar dapat diprediksi. Kami menghindari "black box" demi tindakan yang jelas dan dapat ditinjau.
- **Developer dalam Kendali:** Developer adalah otoritas tertinggi. Arsitektur menyediakan alat untuk memperkuat niat mereka, bukan menggantikannya.
- **Model-Agnostik:** Meskipun dioptimalkan untuk model terdepan, arsitektur dirancang sebagai bidang kontrol universal, mampu terintegrasi dengan multiple AI engine.
- **Open Core:** IDE inti sisi klien adalah dan akan selalu open-source (MIT). Nilai untuk tim dibangun di atas layanan terpisah berbasis cloud.

## Komponen Inti

### 1. Jembatan Visual-to-Code

Jantung inovasi Hatcher. Engine ini menerjemahkan interaksi pada UI yang dirender (klik, seret, seleksi) ke dalam pemahaman struktural kode sumber melalui analisis Abstract Syntax Tree (AST). Ini adalah engine sinkronisasi real-time antara niat visual dan realitas kode.

### 2. Integrasi AI Engine (Lapisan Orkestrasi)

Ini adalah sistem saraf pusat aplikasi. Menerima niat dari developer, mengumpulkan konteks yang sesuai dari Sistem Playbooks, membangun prompt yang tepat untuk AI engine yang dipilih (seperti Claude atau Gemini), dan mengelola respons. Bertindak sebagai bidang kontrol universal, model-agnostik.

### 3. Sistem Playbooks (Engine Konteks Konstitusional)

Solusi kami untuk masalah konteks, dan inti dari penawaran komersial "Teams" kami. Ini adalah layanan proprietari berbasis cloud yang:

- **Menyediakan Tata Kelola Terpusat:** Menyimpan dan melayani "Playbooks" berversi untuk tim.
- **Menyuntikkan Konteks Dinamis:** Memberikan AI aturan arsitektur yang tepat pada waktu yang tepat, menyelesaikan masalah file statis seperti `Claude.md`.

## Justifikasi Technology Stack

| Komponen          | Teknologi      | Mengapa Kami Memilihnya                                                                                            |
| :---------------- | :------------- | :----------------------------------------------------------------------------------------------------------------- |
| **Desktop Shell** | **Electron**   | Menyediakan kemampuan cross-platform terbaik dan integrasi OS yang mendalam yang diperlukan untuk IDE profesional. |
| **UI Framework**  | **Vue.js 3**   | Composition API dan model reaktivitasnya ideal untuk membangun antarmuka yang kompleks dan stateful.               |
| **Bahasa**        | **TypeScript** | Memastikan type-safety dan skalabilitas, yang non-negotiable untuk proyek dengan kompleksitas ini.                 |
| **Monorepo**      | **Turborepo**  | Memungkinkan kami mengelola arsitektur multi-paket (klien, cloud, pustaka bersama) secara efisien.                 |

## Keamanan & Privasi

Keamanan dan kepercayaan adalah fundamental bagi Hatcher.

- **Local-First:** Semua kode sumber Anda tetap berada di mesin lokal Anda. Hanya diteruskan ke AI engine sebagai konteks untuk tindakan spesifik yang dimulai pengguna.
- **Tidak Ada Penyimpanan Kode:** Kami tidak menyimpan kode Anda di server kami. Backend cloud kami hanya mengelola "Playbooks" dan akun pengguna.
- **Kontrol Deterministik:** Seluruh workflow dirancang untuk transparan. Anda melihat setiap perubahan yang diusulkan AI sebelum diterapkan, menghilangkan modifikasi kode yang tidak terduga atau berbahaya.
