---
title: 架构 | Hatcher IDE 技术设计与工程原则
description: 探索 Hatcher 为受控放大而设计的技术架构。了解确定性设计、模型无关方法和开源工程原则。
---

# 架构

Hatcher 是一个现代的 Electron 应用程序，采用 Monorepo 架构，优先考虑可扩展性、可维护性和性能。

## 高级架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Hatcher Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)     │  Renderer Process (Vue.js)   │
│  ├── Window Management      │  ├── Visual-to-Code Bridge   │
│  ├── AI Engine Integration  │  ├── Code Editor             │
│  ├── File System Access     │  ├── Project Management      │
│  └── Git Operations         │  └── UI Components           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                External AI Services                         │
│  ├── Claude API (Anthropic)                                │
│  ├── Gemini CLI (Google)                                   │
│  └── Future: GPT-4, CodeLlama                              │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo 结构

```
dx-engine/
├── apps/                    # 主要应用程序
│   ├── electron/           # Electron 主进程
│   ├── web/               # Vue.js 渲染进程
│   ├── preload/           # 安全预加载脚本
│   └── docs/              # VitePress 文档
│
├── universal/             # 共享包
│   ├── vite-plugin/       # 自定义 Vite 插件
│   └── puppeteer-google-translate/  # 翻译服务
│
├── scripts/               # 自动化脚本
│   ├── translation/       # TypeScript 翻译系统
│   ├── setup-env.ts      # 环境配置
│   ├── version-bump.ts   # 版本管理
│   └── generate-icons.ts # 图标生成
│
└── Config Files           # 项目配置
    ├── package.json       # 工作区配置
    ├── turbo.json         # Turborepo 配置
    └── tsconfig.json      # TypeScript 配置
```

## Electron 进程

### 主进程 (apps/electron/)

主进程管理：

- **窗口管理**：创建和控制应用程序窗口
- **AI 集成**：与外部 AI 服务通信
- **系统访问**：文件和系统操作
- **安全性**：输入验证和清理

### 渲染进程 (apps/web/)

渲染进程包含 Vue.js UI：

- **可视化到代码桥梁**：核心可视选择功能
- **代码编辑器**：带语法高亮的集成编辑器
- **项目管理**：文件浏览器和管理
- **UI 组件**：响应式用户界面

## 技术栈

### 前端 (渲染器)

- **Vue.js 3**：带 Composition API 的响应式框架
- **TypeScript**：类型安全开发
- **Vite**：快速构建工具
- **Pinia**：现代状态管理
- **Vue Router**：客户端路由

### 后端 (主进程)

- **Electron**：桌面应用程序框架
- **Node.js**：JavaScript 运行时
- **TypeScript**：类型安全开发
- **IPC**：进程间通信

## 安全性

### 上下文隔离

- **contextIsolation: true**：隔离渲染器上下文
- **nodeIntegration: false**：在渲染器中禁用 Node.js
- **预加载脚本**：仅公开受控的 API

## 部署

### 构建过程

```bash
# 完整构建
pnpm build

# 为不同平台打包
pnpm pack:prod  # 所有平台
pnpm pack:mac   # 仅 macOS
pnpm pack:win   # 仅 Windows
pnpm pack:linux # 仅 Linux
```
