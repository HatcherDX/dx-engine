# Prueba de Traducción

Este archivo se utiliza para probar el sistema de traducción automática de Hatcher.

## Propósito

Este documento sirve como archivo de prueba para validar que nuestro sistema de traducción TypeScript funciona correctamente en todos los idiomas soportados.

## Contenido de Prueba

### Texto Simple

Este es un párrafo simple para probar la traducción básica de texto.

### Términos Técnicos

- **IDE**: Entorno de Desarrollo Integrado
- **API**: Interfaz de Programación de Aplicaciones
- **CLI**: Interfaz de Línea de Comandos
- **TypeScript**: Superconjunto tipado de JavaScript
- **Vue.js**: Framework JavaScript progresivo

### Código

```typescript
// Este código no debe ser traducido
interface TestInterface {
  name: string
  value: number
}

const testFunction = (param: TestInterface): string => {
  return `Hello ${param.name}, your value is ${param.value}`
}
```

### Lista

1. Primer elemento de la lista
2. Segundo elemento de la lista
3. Tercer elemento de la lista

### Enlaces

- [Enlace a GitHub](https://github.com/HatcherDX/dx-engine)
- [Documentación](/es/getting-started)
- [Filosofía](/es/philosophy)

### Tabla

| Columna 1 | Columna 2 | Columna 3 |
| --------- | --------- | --------- |
| Valor A   | Valor B   | Valor C   |
| Dato 1    | Dato 2    | Dato 3    |

## Elementos Especiales

### Frontmatter YAML

El frontmatter YAML al inicio de los archivos debe preservarse exactamente:

```yaml
---
title: Título del Documento
description: Descripción del documento
layout: default
---
```

### Bloques de Código

Los bloques de código deben mantenerse intactos:

```bash
# Comandos que no deben traducirse
npm install
pnpm dev
git commit -m "mensaje"
```

### HTML Embebido

<div class="warning">
  <strong>Advertencia:</strong> Este es un bloque HTML que debe traducirse correctamente.
</div>

## Validación

Si este archivo aparece correctamente traducido en todos los idiomas soportados, el sistema de traducción está funcionando apropiadamente.

### Idiomas Soportados

- Español (es)
- Francés (fr)
- Alemán (de)
- Portugués (pt)
- Chino Simplificado (zh-cn)
- Árabe (ar)
- Hindi (hi)
- Indonesio (id)
- Japonés (ja)
- Coreano (ko)
- Persa (fa)
- Ruso (ru)
- Turco (tr)

## Resultado Esperado

Este archivo debe:

1. Traducir todo el texto natural
2. Preservar código y sintaxis
3. Mantener enlaces con prefijos de idioma correctos
4. Conservar la estructura markdown
5. Mantener el frontmatter YAML intacto
