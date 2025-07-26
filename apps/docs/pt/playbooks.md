# Sistema Playbooks

**Playbooks** são o cérebro contextual do Hatcher - um sistema de arquivos de contexto dinâmicos e evolutivos que ensinam a IA como entender, navegar e modificar seu projeto de acordo com seus padrões exatos.

## O que é um Playbook?

Um Playbook é um documento vivo que captura:

- **Regras Arquiteturais**: Padrões e convenções do seu projeto
- **Padrões de Código**: Estilo, nomenclatura e melhores práticas
- **Contexto de Negócio**: Lógica de domínio e requisitos específicos
- **Aprendizado Adaptativo**: Melhoria contínua baseada em suas interações

## Tipos de Playbooks

### 1. Playbooks do Sistema (Automáticos)

Gerados automaticamente pela análise da sua base de código:

```typescript
// Exemplo: Detecção automática de padrões
{
  "pattern_type": "component_structure",
  "detected_at": "2024-01-15T10:30:00Z",
  "pattern": {
    "file_naming": "PascalCase",
    "props_interface": "Props",
    "styling_approach": "tailwind_classes",
    "state_management": "pinia"
  },
  "confidence": 0.95,
  "examples": [
    "src/components/UserProfile.vue",
    "src/components/ProjectCard.vue"
  ]
}
```

### 2. Playbooks de Projeto (Configurados)

Definidos explicitamente para seu projeto:

```yaml
# .hatcher/playbooks/component-standards.yml
name: 'Padrões de Componentes'
version: '1.0'
scope: 'components'

rules:
  naming:
    files: 'PascalCase'
    props: 'camelCase'
    events: 'kebab-case'

  structure:
    template_order: ['template', 'script', 'style']
    composition_api_required: true

  styling:
    framework: 'tailwindcss'
    custom_classes_prefix: 'app-'
    responsive_breakpoints: ['sm', 'md', 'lg', 'xl']
```

### 3. Playbooks de Equipe (Compartilhados)

Sincronizados entre membros da equipe:

```json
{
  "team_standards": {
    "commit_messages": {
      "format": "conventional_commits",
      "scopes": ["ui", "api", "docs", "test"]
    },
    "code_review": {
      "required_approvals": 2,
      "automated_checks": ["lint", "test", "build"]
    },
    "documentation": {
      "jsdoc_required": true,
      "readme_sections": ["installation", "usage", "api"]
    }
  }
}
```

## Como os Playbooks Funcionam

### 1. Descoberta Automática

Hatcher analisa seu projeto para descobrir:

```typescript
// Análise de padrões de arquivo
const patterns = await analyzeProject({
  paths: ['src/**/*.vue', 'src/**/*.ts'],
  exclude: ['node_modules', 'dist'],
})

// Detecção de convenções
const conventions = {
  componentNaming: detectNamingPattern(patterns.components),
  stateManagement: detectStatePattern(patterns.stores),
  routingStructure: detectRoutingPattern(patterns.routes),
}
```

### 2. Geração de Contexto

Durante uma interação de IA, os Playbooks geram contexto rico:

```typescript
interface AIContext {
  currentFile: FileContext
  relevantRules: PlaybookRule[]
  similarExamples: CodeExample[]
  architecturalConstraints: Constraint[]
  teamStandards: TeamStandard[]
}
```

### 3. Aplicação Inteligente

A IA usa este contexto para:

- **Gerar código consistente** com seus padrões existentes
- **Respeitar suas convenções** de nomenclatura e estrutura
- **Seguir seus padrões** de qualidade e segurança
- **Manter consistência** arquitetural

## Configuração de Playbooks

### Estrutura de Diretório

```
.hatcher/
├── playbooks/
│   ├── component-standards.yml
│   ├── api-patterns.yml
│   ├── testing-rules.yml
│   └── deployment-config.yml
├── patterns/
│   ├── detected/           # Padrões auto-detectados
│   └── custom/            # Padrões personalizados
└── config/
    └── playbook-config.yml # Configuração global
```

### Exemplo de Configuração

```yaml
# .hatcher/config/playbook-config.yml
playbook_discovery:
  auto_scan: true
  scan_interval: '24h'
  include_patterns:
    - 'src/**/*.{vue,ts,js}'
    - 'docs/**/*.md'
  exclude_patterns:
    - 'node_modules/**'
    - 'dist/**'

ai_integration:
  context_depth: 'full'
  example_count: 3
  confidence_threshold: 0.8

team_sync:
  enabled: true
  repository: 'github'
  auto_commit: false
```

## Melhores Práticas

### 1. Estrutura Progressiva

- Comece simples com regras básicas
- Adicione complexidade gradualmente
- documente decisões importantes

### 2. Colaboração de Equipe

- Versione Playbooks com Git
- Revise mudanças em equipe
- Mantenha consistência entre projetos

### 3. Manutenção Contínua

- Revise regras periodicamente
- Limpe padrões obsoletos
- Atualize com evolução do projeto

---

Playbooks transformam a IA de um assistente genérico em um membro da equipe que realmente entende seu projeto, seus padrões e sua visão arquitetural.
