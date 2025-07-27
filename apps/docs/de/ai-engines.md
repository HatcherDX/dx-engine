---
title: KI-Engines | Claude Code, Gemini CLI und mehr mit Hatcher integrieren
description: Konfigurieren und integrieren Sie mehrere KI-Coding-Assistenten mit Hatcher IDE. Unterstützung für Claude Code, Gemini CLI und andere KI-Engines für flexible, leistungsstarke Entwicklungsworkflows.
---

# KI-Engine Integration

Hatcher ist mit einer flexiblen KI-Engine-Architektur entworfen, die es Ihnen ermöglicht, verschiedene KI-Anbieter je nach Ihren Bedürfnissen, Präferenzen und Projektanforderungen zu wählen und zwischen ihnen zu wechseln.

## Unterstützte KI-Engines

### Claude (Anthropic)

**Status**: ✅ Vollständig Unterstützt

Claude zeichnet sich durch Code-Verständnis und die Generierung nuancierter, kontextueller Antworten aus.

#### Konfiguration

```typescript
// .hatcher/config/ai-engines.yml
claude:
  enabled: true
  api_key: ${ANTHROPIC_API_KEY}
  model: "claude-3-sonnet-20240229"
  max_tokens: 4096
  temperature: 0.3

preferences:
  code_generation: "precise"
  documentation_style: "comprehensive"
  error_handling: "detailed"
```

#### Stärken

- **Code-Verständnis**: Exzellente Analyse komplexer Codebasen
- **Kontextuelles Reasoning**: Versteht architektonische Nuancen
- **Sicherheit**: Sichere Coding-Praktiken standardmäßig
- **Lange Gespräche**: Hält Kontext über erweiterte Interaktionen

#### Ideale Anwendungsfälle

- Komplexe Code-Refaktorierung
- Architektur-Review
- Debugging nuancierter Probleme
- Dokumentationsgenerierung

### Gemini (Google)

**Status**: ✅ Vollständig Unterstützt

Gemini bringt starke multimodale Fähigkeiten und zeichnet sich durch schnelle Code-Generierung aus.

#### Konfiguration

```typescript
// .hatcher/config/ai-engines.yml
gemini:
  enabled: true
  api_key: ${GOOGLE_AI_API_KEY}
  model: "gemini-1.5-pro"
  max_tokens: 2048
  temperature: 0.2

preferences:
  code_generation: "fast"
  optimization_focus: "performance"
  style_preference: "concise"
```

#### Stärken

- **Schnelle Generierung**: Ultra-schnelle Code-Antworten
- **Performance-Optimierung**: Fokus auf Code-Effizienz
- **Multimodale Fähigkeiten**: Kann Bilder und Diagramme verarbeiten
- **Google-Integration**: Funktioniert gut mit Google-Ökosystem

#### Ideale Anwendungsfälle

- Schnelles Prototyping
- Performance-Optimierung
- Generierung einfacher Komponenten
- Verarbeitung von Bildern/Diagrammen

## Zukünftige Engines

### GPT-4 (OpenAI)

**Status**: 🚧 In Entwicklung

```typescript
// Zukünftige Konfiguration
gpt4:
  enabled: false  # Bald verfügbar
  model: "gpt-4-turbo-preview"
  strengths: ["creative_solutions", "broad_knowledge"]
```

### CodeLlama (Meta)

**Status**: 📅 Geplant

```typescript
// Zukünftige Konfiguration
codellama:
  enabled: false  # Geplant für v2.0
  model: "codellama-34b-instruct"
  strengths: ["code_completion", "local_execution"]
```

## Engine-Auswahl

### Automatische Auswahl

Hatcher kann automatisch die beste Engine basierend auf dem Kontext wählen:

```typescript
// .hatcher/config/engine-selection.yml
auto_selection:
  enabled: true
  rules:
    - condition: "task_type === 'refactoring'"
      engine: "claude"
      reason: "Besseres Verständnis komplexen Codes"

    - condition: "task_type === 'quick_generation'"
      engine: "gemini"
      reason: "Schnellere Code-Generierung"

    - condition: "file_size > 1000 && complexity === 'high'"
      engine: "claude"
      reason: "Bessere Handhabung großer Kontexte"

    - condition: "performance_critical === true"
      engine: "gemini"
      reason: "Fokus auf Optimierung"
```

### Manuelle Auswahl

Sie können auch manuell wählen:

```typescript
// In der Hatcher-Oberfläche
const engines = [
  {
    name: 'Claude',
    status: 'active',
    bestFor: ['Refactoring', 'Architektur', 'Komplexer Code'],
  },
  {
    name: 'Gemini',
    status: 'active',
    bestFor: ['Prototyping', 'Performance', 'Schnelle Generierung'],
  },
]
```

## Erweiterte Konfiguration

### Engine-Profile

Erstellen Sie benutzerdefinierte Profile für verschiedene Anwendungsfälle:

```yaml
# .hatcher/profiles/ai-profiles.yml
profiles:
  development:
    claude:
      temperature: 0.1 # Deterministischer
      max_tokens: 2048
    gemini:
      temperature: 0.2
      max_tokens: 1024

  experimentation:
    claude:
      temperature: 0.7 # Kreativer
      max_tokens: 4096
    gemini:
      temperature: 0.5
      max_tokens: 2048
```

### Engines nach Projekttyp

Konfigurieren Sie bevorzugte Engines nach Framework:

```yaml
project_preferences:
  vue_projects:
    primary: 'claude'
    secondary: 'gemini'
    reason: 'Claude versteht Composition API besser'

  react_projects:
    primary: 'gemini'
    secondary: 'claude'
    reason: 'Gemini excelliert mit React Hooks'

  node_projects:
    primary: 'claude'
    secondary: 'gemini'
    reason: 'Claude besser für Backend-Architektur'
```

## Fallback und Zuverlässigkeit

### Fallback-Strategie

```typescript
// Automatische Fallback-Konfiguration
fallback_strategy:
  enabled: true
  max_retries: 3
  retry_delay: 1000ms

  fallback_chain:
    - primary: "claude"
      fallback: "gemini"
      triggers: ["timeout", "rate_limit", "api_error"]

    - primary: "gemini"
      fallback: "claude"
      triggers: ["timeout", "rate_limit", "api_error"]
```

## Best Practices

### Engine-Wahl nach Aufgabe

| Aufgabe                 | Empfohlene Engine | Grund                              |
| ----------------------- | ----------------- | ---------------------------------- |
| Komplexes Refactoring   | Claude            | Besseres kontextuelles Verständnis |
| Schnelle Generierung    | Gemini            | Überlegene Antwortgeschwindigkeit  |
| Architektur-Review      | Claude            | Tiefes architektonisches Reasoning |
| Performance-Optimierung | Gemini            | Spezialisierter Performance-Fokus  |
| Debugging               | Claude            | Nuanciertere Fehleranalyse         |
| Prototyping             | Gemini            | Schnelle Ideengenerierung          |

### Sicherheitskonfiguration

```yaml
security:
  api_keys:
    storage: 'encrypted'
    rotation: 'monthly'
    validation: 'startup'

  request_filtering:
    enabled: true
    block_sensitive_data: true
    sanitize_prompts: true

  rate_limiting:
    enabled: true
    max_requests_per_minute: 60
    burst_allowance: 10
```

---

Hatchers flexible KI-Engine-Integration stellt sicher, dass Sie immer Zugang zu den besten KI-Fähigkeiten für jede Aufgabe haben, mit der Zuverlässigkeit und Performance, die Sie benötigen.
