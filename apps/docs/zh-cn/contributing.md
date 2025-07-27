---
title: 贡献 | 如何为 Hatcher IDE 开发做贡献
description: 了解如何为 Hatcher IDE 做贡献。开源项目中代码贡献、文档、测试和社区参与的指南。
---

# 为 Hatcher 贡献

感谢您对为 Hatcher 做出贡献的兴趣！本指南将帮助您开始为项目做出贡献。

## 行为准则

通过参与此项目，您同意遵守我们的[行为准则](CODE_OF_CONDUCT.md)。在贡献之前请阅读它。

## 入门

### 开发设置

1. **Fork 和 Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **启动开发服务器**
   ```bash
   pnpm dev
   ```

### 项目结构

```
dx-engine/
├── apps/
│   ├── electron/          # 主 Electron 进程
│   ├── web/              # 渲染进程 (Vue.js)
│   ├── preload/          # 预加载脚本
│   └── docs/             # VitePress 文档
├── universal/
│   ├── vite-plugin/      # 自定义 Vite 插件
│   └── puppeteer-google-translate/
└── scripts/              # 构建和开发脚本
```

## 贡献方式

### 报告 Bug

报告 bug 时，请包含：

- **清楚的描述**：发生了什么 vs. 您期望的
- **重现步骤**：重现问题的详细步骤
- **环境**：操作系统、Node.js 版本、pnpm 版本
- **截图**：如果适用，包含视觉证据

创建 issue 时使用我们的[bug 报告模板](.github/ISSUE_TEMPLATE/bug_report.md)。

### 功能请求

我们欢迎功能请求！请包含：

- **用例**：为什么需要这个功能？
- **建议的解决方案**：它应该如何工作？
- **替代方案**：您考虑了哪些其他方法？

使用我们的[功能请求模板](.github/ISSUE_TEMPLATE/feature_request.md)。

### 代码贡献

#### 开始之前

1. **检查现有 Issues**：查找相关 issue 或功能请求
2. **讨论重大更改**：打开 issue 讨论重大更改
3. **从小开始**：从小的、专注的贡献开始

#### 开发工作流

1. **创建分支**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **进行更改**
   - 遵循我们的编码标准（见下文）
   - 为新功能编写测试
   - 根据需要更新文档

3. **测试您的更改**

   ```bash
   pnpm build
   pnpm test
   ```

4. **提交您的更改**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   我们遵循 [Conventional Commits](https://conventionalcommits.org/) 格式。

5. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 编码标准

Hatcher 遵循严格的编码标准，以确保整个项目的一致性、可维护性和高质量代码。

**📋 [完整编码标准指南](./coding-standards.md)**

### 快速参考

**TypeScript**

- 对所有新代码使用启用严格模式的 TypeScript
- 对对象形状优先使用接口而不是类型
- 为变量和函数使用有意义的描述性名称
- 为所有公共 API 包含 JSDoc 注释

**Vue.js**

- 使用带有 `<script setup>` 语法的 Composition API
- 使用 TypeScript 接口定义 props 和 emits
- 优先使用 composables 处理可重用逻辑
- 遵循单文件组件结构：script → template → style

**样式**

- 对组件特定的 CSS 使用作用域样式
- 遵循 BEM 方法论进行类命名
- 使用 CSS 自定义属性进行主题化
- 优先使用 flexbox 和 CSS Grid 进行布局

**Git 约定**

- 遵循 [Conventional Commits](https://conventionalcommits.org/) 格式
- 使用描述性分支名称：`feature/`、`fix/`、`docs/`、`refactor/`
- 保持提交原子化并专注于单一更改

### 代码质量工具

我们使用自动化工具来强制执行标准：

```bash
# Lint 并修复代码样式问题
pnpm lint:fix

# 类型检查
pnpm typecheck

# 运行所有测试
pnpm test

# 格式化代码
pnpm format
```

有关详细指南、示例和最佳实践，请参阅我们的[编码标准](./coding-standards.md)文档。

## 拉取请求流程

### 提交前

- [ ] 代码遵循项目标准
- [ ] 本地测试通过
- [ ] 文档已更新
- [ ] 更改集中且原子化

### PR 描述模板

```markdown
## 描述

更改的简要描述

## 更改类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] 破坏性更改
- [ ] 文档更新

## 测试

- [ ] 单元测试已添加/更新
- [ ] 集成测试已添加/更新
- [ ] 手动测试已完成
```

## 发布流程

### 版本控制

我们遵循[语义版本控制](https://semver.org/)：

- **MAJOR**：破坏性更改
- **MINOR**：新功能（向后兼容）
- **PATCH**：错误修复（向后兼容）

## 社区

### 沟通渠道

- **GitHub Issues**：错误报告和功能请求
- **GitHub Discussions**：一般问题和想法
- **Discord**：与社区实时聊天
- **Twitter**：关注 [@HatcherDX](https://twitter.com/HatcherDX) 获取更新

### 社区指南

- **保持尊重**：尊重对待每个人
- **保持建设性**：专注于解决方案，而不是问题
- **保持耐心**：记住我们都是志愿者
- **乐于助人**：分享知识并帮助他人

## 认可

我们感谢所有贡献！贡献者在以下方面得到认可：

- **CONTRIBUTORS.md**：所有项目贡献者列表
- **发布说明**：重要贡献突出显示
- **社交媒体**：展示社区贡献

## 开发资源

### 有用的链接

- [Vue.js 文档](https://vuejs.org/)
- [Electron 文档](https://electronjs.org/)
- [TypeScript 手册](https://typescriptlang.org/)
- [Vite 文档](https://vitejs.dev/)

## 问题？

如果您对贡献有疑问：

1. 检查现有的 [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions)
2. 加入我们的 [Discord 社区](https://discord.gg/hatcher)
3. 创建新的讨论或 issue

感谢您为 Hatcher 做出贡献！我们正在共同构建 AI 辅助开发的未来。
