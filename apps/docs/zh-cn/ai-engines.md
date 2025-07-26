# AI 引擎

Hatcher 集成了多个 AI 编码助手，提供灵活性并利用不同模型的独特优势。

## 支持的引擎

### Claude Code

Anthropic 的 Claude 是我们的主要 AI 引擎，针对以下方面进行了优化：

- **代码理解**：对现有代码库的出色理解
- **模式识别**：与项目约定保持一致性
- **安全重构**：对代码修改采用保守方法
- **上下文感知**：有效处理大型代码库

**配置：**

```json
{
  "engine": "claude",
  "model": "claude-3-sonnet",
  "maxTokens": 4096,
  "temperature": 0.1
}
```

### Gemini CLI

Google 的 Gemini 提供互补功能：

- **创意解决方案**：对复杂问题的替代方法
- **性能优化**：专注于高效的代码生成
- **多语言支持**：对多样化技术栈的强力支持
- **快速迭代**：快速编辑的快速响应时间

**配置：**

```json
{
  "engine": "gemini",
  "model": "gemini-pro",
  "maxTokens": 2048,
  "temperature": 0.2
}
```

## 引擎选择策略

Hatcher 根据任务自动选择最佳引擎：

### 代码生成任务

- **新组件**：Claude 负责结构，Gemini 负责创意
- **Bug 修复**：Claude 进行仔细分析
- **性能**：Gemini 提供优化建议

### 上下文考虑

- **大型代码库**：Claude 优越的上下文处理
- **快速原型开发**：Gemini 的速度优势
- **复杂重构**：Claude 的保守方法

## 配置

### 全局设置

设置您首选的默认引擎：

```json
{
  "defaultEngine": "claude",
  "fallbackEngine": "gemini",
  "autoSwitch": true
}
```

### 项目特定覆盖

为特定项目覆盖引擎：

```json
{
  "engines": {
    "vue": "claude",
    "optimization": "gemini",
    "testing": "claude"
  }
}
```

## API 密钥设置

### Claude API 密钥

1. 访问 [Anthropic Console](https://console.anthropic.com)
2. 生成新的 API 密钥
3. 添加到 Hatcher 设置或环境变量：
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

### Gemini API 密钥

1. 访问 [Google AI Studio](https://aistudio.google.com)
2. 创建新的 API 密钥
3. 在 Hatcher 中配置：
   ```bash
   export GOOGLE_AI_API_KEY="your-key-here"
   ```

## 引擎比较

| 功能       | Claude     | Gemini     |
| ---------- | ---------- | ---------- |
| 代码质量   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| 速度       | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| 上下文大小 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| 创造力     | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| 安全性     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |

## 未来引擎

我们正在积极开发对以下的支持：

- **GitHub Copilot**：与 VS Code 工作流的直接集成
- **OpenAI GPT-4**：通用编码辅助
- **本地模型**：注重隐私的团队的自托管选项
- **自定义引擎**：专有 AI 工具的插件系统

## 最佳实践

### 提示工程

Hatcher 自动为每个引擎优化提示：

- **Claude**：详细上下文和明确指令
- **Gemini**：具有明确目标的简洁提示

### 错误处理

强大的回退系统确保连续性：

- **主引擎宕机**：自动切换到回退引擎
- **速率限制**：智能请求排队
- **网络问题**：常见模式的本地缓存

### 成本优化

- **令牌管理**：高效的上下文压缩
- **请求批处理**：合并多个小更改
- **缓存**：重用类似的代码生成结果
