# Playbooks: Konteks Cerdas untuk AI

> **Ajarkan AI untuk memahami proyek Anda seperti anggota tim senior.**

## Apa itu Playbooks?

Playbooks adalah sistem konteks dinamis yang memungkinkan Anda mendefinisikan dengan tepat bagaimana AI harus memahami, menginterpretasikan, dan berinteraksi dengan codebase Anda.

## Filosofi Playbooks

### Konteks Adalah Segalanya

AI yang paling canggih sekalipun hanya sebaik konteks yang diterimanya. Playbooks memastikan bahwa setiap interaksi AI dilengkapi dengan pemahaman mendalam tentang:

- Arsitektur proyek Anda
- Konvensi koding yang ditetapkan
- Pola desain yang digunakan
- Keputusan bisnis dan teknis

### Pengetahuan yang Dapat Dijalankan

Berbeda dengan dokumentasi statis, Playbooks adalah pengetahuan yang dapat dijalankan yang secara aktif membentuk perilaku AI dalam setiap interaksi.

## Struktur Playbook

### Playbook Dasar

```yaml
# .hatcher/playbooks/core.yaml
name: 'Core Project Playbook'
version: '1.0.0'
scope: 'global'

project:
  name: 'E-commerce Platform'
  framework: 'Next.js'
  architecture: 'modular-monolith'

conventions:
  naming:
    components: 'PascalCase'
    functions: 'camelCase'
    files: 'kebab-case'

  structure:
    components: 'src/components'
    pages: 'src/pages'
    utils: 'src/utils'
    types: 'src/types'

standards:
  - 'Selalu gunakan TypeScript yang ketat'
  - 'Komponen harus memiliki interface Props yang eksplisit'
  - 'Gunakan CSS Modules untuk styling'
  - 'Implementasikan error boundaries untuk komponen kompleks'
```

### Playbook Spesifik Domain

````yaml
# .hatcher/playbooks/ui-components.yaml
name: 'UI Components Playbook'
scope: 'src/components/**'
extends: 'core'

patterns:
  component_structure: |
    Setiap komponen harus mengikuti struktur:
    1. Interface Props dengan dokumentasi
    2. Komponen utama dengan forwardRef jika perlu
    3. Export default dengan displayName
    4. Export named untuk sub-komponen jika ada

  styling_approach: |
    Gunakan sistem desain dengan:
    - Tailwind CSS untuk utility classes
    - CSS Modules untuk styling kompleks
    - Variabel CSS untuk theming

examples:
  button_component: |
    ```typescript
    interface ButtonProps {
      variant: 'primary' | 'secondary' | 'outline'
      size: 'sm' | 'md' | 'lg'
      children: React.ReactNode
      onClick?: () => void
    }

    export const Button = ({ variant, size, children, ...props }: ButtonProps) => {
      return (
        <button 
          className={`btn btn-${variant} btn-${size}`}
          {...props}
        >
          {children}
        </button>
      )
    }
    ```
````

## Jenis Playbooks

### 1. Playbook Arsitektural

Mendefinisikan struktur tingkat tinggi dan keputusan desain:

```yaml
architecture:
  pattern: 'Clean Architecture'
  layers:
    - presentation: 'UI components dan pages'
    - business: 'Use cases dan domain logic'
    - data: 'Repository dan external services'

  dependencies:
    direction: 'inward' # Dependencies point inward
    external_services: 'abstractions only'
```

### 2. Playbook Framework

Konvensi khusus framework yang digunakan:

```yaml
framework_conventions:
  next_js:
    routing: 'app-directory'
    data_fetching: 'server-components-first'
    state_management: 'zustand'

  react:
    hooks_rules:
      - 'Gunakan custom hooks untuk logic kompleks'
      - 'useEffect hanya untuk side effects'
      - 'useState untuk state lokal sederhana'
```

### 3. Playbook Testing

Pola dan praktek pengujian:

```yaml
testing:
  philosophy: 'Test behavior, not implementation'

  patterns:
    unit_tests:
      - 'Test fungsi murni secara terpisah'
      - 'Mock dependencies eksternal'

    integration_tests:
      - 'Test interaksi antar komponen'
      - 'Gunakan data fixtures realistis'

    e2e_tests:
      - 'Focus pada user journeys kritis'
      - 'Test happy path dan edge cases'

  tools:
    unit: 'vitest'
    integration: 'testing-library'
    e2e: 'playwright'
```

## Konteks Dinamis

### Aktivasi Berdasarkan Scope

Playbooks diaktifkan secara otomatis berdasarkan file yang sedang dikerjakan:

```yaml
# Playbook untuk API routes
scope: "src/app/api/**"
context:
  api_patterns:
    - "Gunakan zod untuk validasi request"
    - "Return consistent error format"
    - "Implement proper HTTP status codes"

# Playbook untuk komponen UI
scope: "src/components/**"
context:
  ui_patterns:
    - "Implementasikan responsive design"
    - "Gunakan semantic HTML"
    - "Ensure accessibility compliance"
```

### Inheritance dan Komposisi

```yaml
# Base playbook
name: "base"
conventions:
  typescript: "strict"
  formatting: "prettier"

# Specialized playbook
name: "react-components"
extends: "base"  # Inherit from base
conventions:
  react:
    hooks: "recommended-rules"
    props: "interface-required"
```

## Playbook Management

### Membuat Playbook Baru

```bash
# Generate playbook template
hatcher playbook create --name ui-patterns --scope "src/components/**"

# Import dari proyek lain
hatcher playbook import --from ../other-project/.hatcher/playbooks/
```

### Validasi Playbook

```bash
# Validasi syntax dan struktur
hatcher playbook validate

# Test playbook terhadap codebase
hatcher playbook test --dry-run
```

### Sharing Playbooks

```bash
# Export untuk sharing
hatcher playbook export --output team-playbooks.tar.gz

# Publish ke registry
hatcher playbook publish --registry team-registry
```

## Playbook Templates

### Template Next.js

```bash
hatcher playbook install next-js-app-router
hatcher playbook install react-typescript
hatcher playbook install tailwind-css
```

### Template Backend

```bash
hatcher playbook install express-typescript
hatcher playbook install prisma-orm
hatcher playbook install graphql-api
```

## Best Practices

### 1. Mulai Sederhana

```yaml
# Mulai dengan konvensi dasar
conventions:
  - 'Use TypeScript strict mode'
  - 'Follow ESLint recommendations'
  - 'Write self-documenting code'
```

### 2. Iterasi Berdasarkan Penggunaan

Tambahkan konteks lebih spesifik seiring proyek berkembang:

```yaml
# Version 1.0 - Basic
conventions:
  naming: "camelCase for functions"

# Version 1.1 - More specific
conventions:
  naming:
    functions: "camelCase"
    constants: "UPPER_SNAKE_CASE"
    types: "PascalCase"
```

### 3. Dokumentasikan Keputusan

```yaml
decisions:
  state_management: |
    Dipilih Zustand karena:
    - Bundle size kecil
    - TypeScript support baik
    - Tidak memerlukan boilerplate
    - Mudah untuk testing

  styling_approach: |
    Kombinasi Tailwind + CSS Modules:
    - Tailwind untuk utility classes
    - CSS Modules untuk komponen kompleks
    - Konsistensi dengan design system
```

### 4. Gunakan Examples

````yaml
examples:
  api_route: |
    ```typescript
    // src/app/api/users/route.ts
    import { NextRequest } from 'next/server'
    import { userSchema } from '@/schemas/user'

    export async function POST(request: NextRequest) {
      try {
        const body = await request.json()
        const userData = userSchema.parse(body)
        
        // Business logic here
        
        return Response.json({ success: true, data: userData })
      } catch (error) {
        return Response.json(
          { success: false, error: 'Invalid data' },
          { status: 400 }
        )
      }
    }
    ```
````

## Troubleshooting

### Playbook Tidak Diterapkan

```bash
# Debug aktivasi playbook
hatcher playbook debug --file src/components/Button.tsx

# Lihat playbook aktif
hatcher playbook list --active
```

### Konflik Antar Playbooks

```bash
# Analisis konflik
hatcher playbook conflicts

# Resolve dengan prioritas
hatcher playbook prioritize ui-components > general
```

---

**Playbooks mengubah AI dari asisten umum menjadi partner pengembangan yang memahami konteks spesifik proyek Anda.**
