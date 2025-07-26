# Motores de IA

O Hatcher integra-se com múltiplos assistentes de codificação IA para fornecer flexibilidade e aproveitar os pontos fortes únicos de diferentes modelos.

## Motores Suportados

### Claude Code

O Claude da Anthropic é nosso motor de IA principal, otimizado para:

- **Compreensão de Código**: Excelente compreensão de bases de código existentes
- **Reconhecimento de Padrões**: Mantém consistência com convenções do projeto
- **Refatoração Segura**: Abordagem conservadora para modificações de código
- **Consciência de Contexto**: Lida efetivamente com bases de código grandes

**Configuração:**

```json
{
  "engine": "claude",
  "model": "claude-3-sonnet",
  "maxTokens": 4096,
  "temperature": 0.1
}
```

### Gemini CLI

O Gemini do Google fornece capacidades complementares:

- **Soluções Criativas**: Abordagens alternativas para problemas complexos
- **Otimização de Performance**: Foco na geração eficiente de código
- **Suporte Multi-linguagem**: Forte suporte para pilhas tecnológicas diversas
- **Iteração Rápida**: Tempos de resposta rápidos para edições rápidas

**Configuração:**

```json
{
  "engine": "gemini",
  "model": "gemini-pro",
  "maxTokens": 2048,
  "temperature": 0.2
}
```

## Estratégia de Seleção de Motor

O Hatcher seleciona automaticamente o melhor motor baseado na tarefa:

### Tarefas de Geração de Código

- **Novos Componentes**: Claude para estrutura, Gemini para criatividade
- **Correção de Bugs**: Claude para análise cuidadosa
- **Performance**: Gemini para sugestões de otimização

### Considerações de Contexto

- **Bases de Código Grandes**: Manipulação superior de contexto do Claude
- **Prototipagem Rápida**: Vantagem de velocidade do Gemini
- **Refatoração Complexa**: Abordagem conservadora do Claude

## Configuração

### Configurações Globais

Defina seu motor padrão preferido:

```json
{
  "defaultEngine": "claude",
  "fallbackEngine": "gemini",
  "autoSwitch": true
}
```

### Substituições Específicas do Projeto

Substitua motores para projetos específicos:

```json
{
  "engines": {
    "vue": "claude",
    "optimization": "gemini",
    "testing": "claude"
  }
}
```

## Configuração de Chaves API

### Chave API Claude

1. Visite [Anthropic Console](https://console.anthropic.com)
2. Gere uma nova chave API
3. Adicione às configurações do Hatcher ou variável de ambiente:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

### Chave API Gemini

1. Visite [Google AI Studio](https://aistudio.google.com)
2. Crie uma nova chave API
3. Configure no Hatcher:
   ```bash
   export GOOGLE_AI_API_KEY="your-key-here"
   ```

## Comparação de Motores

| Recurso          | Claude     | Gemini     |
| ---------------- | ---------- | ---------- |
| Qualidade Código | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| Velocidade       | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Tamanho Contexto | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Criatividade     | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Segurança        | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |

## Motores Futuros

Estamos trabalhando ativamente no suporte para:

- **GitHub Copilot**: Integração direta com fluxos de trabalho do VS Code
- **OpenAI GPT-4**: Assistência de codificação de propósito geral
- **Modelos Locais**: Opções auto-hospedadas para equipes conscientes da privacidade
- **Motores Personalizados**: Sistema de plugins para ferramentas IA proprietárias

## Melhores Práticas

### Engenharia de Prompt

O Hatcher otimiza automaticamente prompts para cada motor:

- **Claude**: Contexto detalhado e instruções explícitas
- **Gemini**: Prompts concisos com objetivos claros

### Tratamento de Erros

Sistemas robustos de fallback garantem continuidade:

- **Motor Principal Inativo**: Mudança automática para fallback
- **Limitação de Taxa**: Enfileiramento inteligente de solicitações
- **Problemas de Rede**: Cache local de padrões comuns

### Otimização de Custos

- **Gerenciamento de Tokens**: Compressão eficiente de contexto
- **Loteamento de Solicitações**: Combinar múltiplas pequenas mudanças
- **Cache**: Reutilizar resultados similares de geração de código
