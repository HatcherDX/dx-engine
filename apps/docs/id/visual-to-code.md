---
title: Visual-to-Code Bridge | Manipulasi UI Langsung untuk Generasi Kode
description: Pelajari tentang Visual-to-Code Bridge revolusioner Hatcher yang mengubah manipulasi UI langsung menjadi perubahan kode yang presisi. Tunjuk daripada mendeskripsikan untuk pengembangan AI yang lebih baik.
---

# Jembatan Visual-ke-Kode

> **Transformasi langsung dari interaksi visual menjadi modifikasi kode yang tepat.**

## Gambaran Umum

Jembatan Visual-ke-Kode adalah fitur inti Hatcher yang memungkinkan developer berinteraksi dengan aplikasi mereka secara visual sambil menghasilkan modifikasi kode yang tepat dan deterministik.

## Cara Kerjanya

### 1. Mode Inspeksi Visual

Aktifkan mode inspeksi untuk mulai memilih elemen dalam aplikasi Anda:

```bash
# Mulai server pengembangan dengan inspeksi visual
hatcher dev --visual-inspect
```

### 2. Seleksi Elemen

- **Hover**: Sorot elemen untuk melihat informasi struktur
- **Klik**: Pilih elemen untuk modifikasi
- **Multi-seleksi**: Gunakan Cmd/Ctrl + klik untuk memilih beberapa elemen

### 3. Konteks Otomatis

Saat Anda memilih elemen, Hatcher secara otomatis:

- Mengidentifikasi komponen dan file terkait
- Menganalisis struktur hirarki
- Memuat Playbook yang relevan
- Menyiapkan konteks untuk AI

## Jenis Modifikasi

### Styling dan Layout

```typescript
// Sebelum: Elemen dipilih secara visual
<div className="container">
  <h1>Judul</h1>
</div>

// Perintah: "Buat judul berwarna biru dan rata tengah"
// Setelah: Kode dimodifikasi otomatis
<div className="container">
  <h1 className="text-blue-600 text-center">Judul</h1>
</div>
```

### Struktur Komponen

```typescript
// Sebelum: Komponen sederhana
function Header() {
  return <h1>Selamat Datang</h1>
}

// Perintah: "Tambahkan navigasi dengan menu beranda dan tentang"
// Setelah: Struktur diperluas
function Header() {
  return (
    <header>
      <h1>Selamat Datang</h1>
      <nav>
        <a href="/">Beranda</a>
        <a href="/about">Tentang</a>
      </nav>
    </header>
  )
}
```

### Logika Bisnis

```typescript
// Sebelum: Komponen statis
function Counter() {
  return <div>0</div>
}

// Perintah: "Buat ini menjadi counter yang bisa diklik untuk menambah"
// Setelah: Logika ditambahkan
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div onClick={() => setCount(count + 1)}>
      {count}
    </div>
  )
}
```

## Pemetaan Visual-ke-Kode

### Identifikasi Komponen

Hatcher menggunakan beberapa strategi untuk memetakan elemen visual ke kode:

1. **React DevTools Integration**: Pemanfaatan tool pengembang React
2. **Source Maps**: Pemetaan dari elemen DOM ke kode sumber
3. **AST Analysis**: Analisis pohon sintaks abstrak untuk pemahaman struktur
4. **Convention Detection**: Deteksi otomatis pola dan konvensi proyek

### Resolusi Hierarki

```typescript
// Struktur elemen yang dipilih
App
  └── Layout
      └── Content
          └── ProductCard  // ← Elemen dipilih
              ├── Image
              ├── Title
              └── Price
```

Ketika `ProductCard` dipilih, Hatcher memahami:

- Komponen parent (`Content`)
- Komponen child (`Image`, `Title`, `Price`)
- Props dan state yang tersedia
- Styling yang diterapkan

## Konfigurasi

### Pengaturan Framework

```json
// hatcher.config.json
{
  "visualBridge": {
    "framework": "react",
    "bundler": "vite",
    "sourceMapEnabled": true,
    "devtoolsIntegration": true
  }
}
```

### Pemetaan Selektori

```json
{
  "selectorMapping": {
    "components": {
      "[data-component]": "component",
      ".card": "ui-element",
      "#main": "layout"
    }
  }
}
```

## Mode Debugging

### Inspeksi Mendalam

```bash
# Mode debug dengan informasi detail
hatcher dev --visual-inspect --debug
```

Dalam mode debug, Anda dapat melihat:

- Pemetaan elemen-ke-file secara real-time
- AST nodes yang teridentifikasi
- Konteks yang dikirim ke AI
- Prediksi modifikasi sebelum diterapkan

### Overlay Informasi

Mode debug menampilkan overlay dengan:

- Path file komponen
- Props yang tersedia
- State saat ini
- Playbook yang aktif

## Best Practices

### 1. Gunakan Data Attributes

```typescript
// Membantu identifikasi komponen
<div data-component="ProductCard" data-id={product.id}>
  <img src={product.image} data-element="product-image" />
  <h3 data-element="product-title">{product.title}</h3>
</div>
```

### 2. Struktur Komponen yang Jelas

```typescript
// Struktur yang mudah diidentifikasi
function ProductCard({ product }: Props) {
  return (
    <article className="product-card">
      <ProductImage src={product.image} />
      <ProductInfo title={product.title} price={product.price} />
    </article>
  )
}
```

### 3. Konsistensi Penamaan

```typescript
// Pola penamaan yang konsisten
const ProductCard = () => {}
const ProductImage = () => {}
const ProductInfo = () => {}
```

## Troubleshooting

### Elemen Tidak Terdeteksi

```bash
# Periksa konfigurasi framework
hatcher doctor --visual-bridge

# Verifikasi source maps
hatcher dev --debug-source-maps
```

### Modifikasi Tidak Akurat

1. Periksa Playbook untuk konteks yang lebih spesifik
2. Gunakan selektori data attributes yang lebih eksplisit
3. Verifikasi struktur komponen sesuai konvensi

### Performance Issues

```json
// Optimasi untuk proyek besar
{
  "visualBridge": {
    "throttleInspection": true,
    "cacheComponentMap": true,
    "limitScanDepth": 5
  }
}
```

---

**Jembatan Visual-ke-Kode menghubungkan intuisi visual dengan implementasi kode yang tepat, menjadikan pengembangan UI lebih natural dan efisien.**
