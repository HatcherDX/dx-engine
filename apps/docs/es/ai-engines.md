---
title: Motores de IA | Integra Claude Code, Gemini CLI y más con Hatcher
description: Configura e integra múltiples asistentes de programación con IA en Hatcher IDE. Soporte para Claude Code, Gemini CLI y otros motores de IA para flujos de desarrollo flexibles y potentes.
---

# Motores de IA

Hatcher se integra con múltiples asistentes de codificación IA para proporcionar flexibilidad y aprovechar las fortalezas únicas de diferentes modelos.

## Motores Soportados

### Claude Code

Claude de Anthropic es nuestro motor de IA principal, optimizado para:

- **Comprensión de Código**: Excelente comprensión de bases de código existentes
- **Reconocimiento de Patrones**: Mantiene consistencia con convenciones del proyecto
- **Refactorización Segura**: Enfoque conservador para modificaciones de código
- **Conciencia de Contexto**: Maneja bases de código grandes efectivamente

**Configuración:**

```json
{
  "engine": "claude",
  "model": "claude-3-sonnet",
  "maxTokens": 4096,
  "temperature": 0.1
}
```

### Gemini CLI

Gemini de Google proporciona capacidades complementarias:

- **Soluciones Creativas**: Enfoques alternativos para problemas complejos
- **Optimización de Rendimiento**: Enfoque en generación de código eficiente
- **Soporte Multi-lenguaje**: Fuerte soporte para stacks tecnológicos diversos
- **Iteración Rápida**: Tiempos de respuesta rápidos para ediciones rápidas

**Configuración:**

```json
{
  "engine": "gemini",
  "model": "gemini-pro",
  "maxTokens": 2048,
  "temperature": 0.2
}
```

## Configuración de Motores

### Instalación Claude

```bash
# Instalar Claude CLI
npm install -g @anthropic/claude-cli

# Autenticar
claude auth login

# Verificar configuración
claude --version
```

### Instalación Gemini

```bash
# Instalar Gemini CLI
npm install -g @google/gemini-cli

# Configurar clave API
gemini config set-key YOUR_API_KEY

# Verificar configuración
gemini --version
```

## Configuración en Hatcher

### Configuración Básica

En las configuraciones de Hatcher, especifica tu motor preferido:

```json
{
  "defaultEngine": "claude",
  "engines": {
    "claude": {
      "enabled": true,
      "priority": 1
    },
    "gemini": {
      "enabled": true,
      "priority": 2
    }
  }
}
```

### Configuración Avanzada

Personaliza el comportamiento del motor para diferentes tipos de tareas:

```json
{
  "engineRules": [
    {
      "task": "refactoring",
      "preferredEngine": "claude",
      "reason": "Better at maintaining patterns"
    },
    {
      "task": "optimization",
      "preferredEngine": "gemini",
      "reason": "Better at performance improvements"
    }
  ]
}
```

## Mejores Prácticas

### Selección de Motor

- **Claude**: Para refactorización, mantenimiento de patrones, trabajo con bases de código grandes
- **Gemini**: Para optimización, soluciones creativas, prototipado rápido

### Configuración de Contexto

```json
{
  "contextSettings": {
    "maxContextLines": 100,
    "includeImports": true,
    "includeTypes": true,
    "includeComments": false
  }
}
```

### Límites de Rate

```json
{
  "rateLimits": {
    "claude": {
      "requestsPerMinute": 50,
      "tokensPerHour": 100000
    },
    "gemini": {
      "requestsPerMinute": 60,
      "tokensPerHour": 120000
    }
  }
}
```

## Comparación de Motores

| Característica        | Claude     | Gemini     |
| --------------------- | ---------- | ---------- |
| Comprensión de Código | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| Velocidad             | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ |
| Creatividad           | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ |
| Consistencia          | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Contexto Largo        | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |

## Solución de Problemas

### Problemas Comunes

**Error de Autenticación:**

```bash
# Re-autenticar con Claude
claude auth logout
claude auth login

# Verificar clave API de Gemini
gemini config check
```

**Respuesta Lenta:**

- Reducir tamaño de contexto
- Usar temperatura más baja
- Verificar límites de rate

**Calidad de Código Inconsistente:**

- Actualizar Playbooks del proyecto
- Ajustar configuración de temperatura
- Proporcionar más contexto específico

## Futuras Integraciones

### Motores Planificados

- **GPT-4**: Para capacidades de razonamiento avanzadas
- **CodeLlama**: Para especialización en código
- **Copilot**: Para compatibilidad con flujos existentes

### Características Futuras

- Switching automático de motores basado en tarea
- Ensemble voting para decisiones críticas
- Métricas de calidad por motor
- Configuración personalizada por proyecto
