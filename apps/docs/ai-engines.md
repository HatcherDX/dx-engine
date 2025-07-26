# AI Engines

Hatcher integrates with multiple AI coding assistants to provide flexibility and leverage the unique strengths of different models.

## Supported Engines

### Claude Code

Anthropic's Claude is our primary AI engine, optimized for:

- **Code Understanding**: Excellent comprehension of existing codebases
- **Pattern Recognition**: Maintains consistency with project conventions
- **Safe Refactoring**: Conservative approach to code modifications
- **Context Awareness**: Handles large codebases effectively

**Configuration:**

```json
{
  "engine": "claude",
  "model": "claude-3-sonnet",
  "maxTokens": 4096,
  "temperature": 0.1
}
```

### Gemini CLI

Google's Gemini provides complementary capabilities:

- **Creative Solutions**: Alternative approaches to complex problems
- **Performance Optimization**: Focus on efficient code generation
- **Multi-language Support**: Strong support for diverse tech stacks
- **Rapid Iteration**: Fast response times for quick edits

**Configuration:**

```json
{
  "engine": "gemini",
  "model": "gemini-pro",
  "maxTokens": 2048,
  "temperature": 0.2
}
```

## Engine Selection Strategy

Hatcher automatically selects the best engine based on the task:

### Code Generation Tasks

- **New Components**: Claude for structure, Gemini for creativity
- **Bug Fixes**: Claude for careful analysis
- **Performance**: Gemini for optimization suggestions

### Context Considerations

- **Large Codebases**: Claude's superior context handling
- **Rapid Prototyping**: Gemini's speed advantage
- **Complex Refactoring**: Claude's conservative approach

## Configuration

### Global Settings

Set your preferred default engine:

```json
{
  "defaultEngine": "claude",
  "fallbackEngine": "gemini",
  "autoSwitch": true
}
```

### Project-Specific Overrides

Override engines for specific projects:

```json
{
  "engines": {
    "vue": "claude",
    "optimization": "gemini",
    "testing": "claude"
  }
}
```

## API Keys Setup

### Claude API Key

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Generate a new API key
3. Add to Hatcher settings or environment variable:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

### Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com)
2. Create a new API key
3. Configure in Hatcher:
   ```bash
   export GOOGLE_AI_API_KEY="your-key-here"
   ```

## Engine Comparison

| Feature      | Claude     | Gemini     |
| ------------ | ---------- | ---------- |
| Code Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| Speed        | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Context Size | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Creativity   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Safety       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |

## Future Engines

We're actively working on support for:

- **GitHub Copilot**: Direct integration with VS Code workflows
- **OpenAI GPT-4**: General-purpose coding assistance
- **Local Models**: Self-hosted options for privacy-conscious teams
- **Custom Engines**: Plugin system for proprietary AI tools

## Best Practices

### Prompt Engineering

Hatcher automatically optimizes prompts for each engine:

- **Claude**: Detailed context and explicit instructions
- **Gemini**: Concise prompts with clear objectives

### Error Handling

Robust fallback systems ensure continuity:

- **Primary Engine Down**: Automatic switch to fallback
- **Rate Limiting**: Intelligent request queuing
- **Network Issues**: Local caching of common patterns

### Cost Optimization

- **Token Management**: Efficient context compression
- **Request Batching**: Combine multiple small changes
- **Caching**: Reuse similar code generation results
