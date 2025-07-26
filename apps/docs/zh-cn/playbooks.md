# Playbooks 系统

Playbooks 系统是 Hatcher 对 AI 开发中上下文问题的第二代解决方案。相比于像 `Claude.md` 这样的静态文件提供起点，Playbooks 提供了一个动态、集中化和可治理的系统，作为你的 AI 代理的真正企业宪法。

## 什么是 Playbooks？

Playbooks 是结构化的配置文件，用于捕获团队的：

- **编码标准**：格式化、命名约定和风格偏好
- **架构决策**：组件模式、状态管理方法
- **框架特定规范**：特定库的最佳实践和模式
- **业务规则**：领域特定逻辑和约束

## Playbook 结构

基本的 Playbook 遵循以下结构：

```json
{
  "name": "Vue 3 组件标准",
  "version": "1.0.0",
  "framework": "vue",
  "rules": [
    {
      "category": "components",
      "type": "naming",
      "pattern": "PascalCase",
      "description": "所有 Vue 组件必须使用 PascalCase 命名"
    },
    {
      "category": "composition",
      "type": "api",
      "preference": "composition-api",
      "description": "优先使用 Composition API 而不是 Options API"
    }
  ],
  "examples": [
    {
      "title": "标准组件结构",
      "code": "..."
    }
  ]
}
```

## 内置 Playbooks

Hatcher 提供了为流行框架精心策划的 Playbooks：

### Vue.js Playbooks

- **Vue 3 + TypeScript**：现代组合模式
- **Nuxt.js**：SSR 和基于文件的路由约定
- **Pinia**：状态管理最佳实践

### React Playbooks

- **React + TypeScript**：函数组件和 hooks
- **Next.js**：App Router 和服务器组件
- **Zustand**：轻量级状态管理

### 通用 Playbooks

- **TypeScript 标准**：类型定义和泛型
- **CSS-in-JS**：Styled-components 和 emotion 模式
- **测试**：Jest 和 Cypress 约定

## 创建自定义 Playbooks

### 团队特定规则

创建捕获团队独特约定的 Playbooks：

```json
{
  "name": "Acme 公司标准",
  "extends": ["vue3-typescript"],
  "rules": [
    {
      "category": "api",
      "type": "structure",
      "pattern": "services/api/*.service.ts",
      "description": "所有 API 调用必须通过服务层"
    },
    {
      "category": "components",
      "type": "props",
      "requirement": "interfaces",
      "description": "组件 props 必须使用 TypeScript 接口"
    }
  ]
}
```

### 项目特定上下文

添加项目特定知识：

```json
{
  "name": "电商仪表板",
  "extends": ["acme-corp-standards"],
  "context": {
    "domain": "e-commerce",
    "entities": ["Product", "Order", "Customer"],
    "apis": [
      {
        "name": "OrdersAPI",
        "baseUrl": "/api/orders",
        "methods": ["GET", "POST", "PUT", "DELETE"]
      }
    ]
  }
}
```

## Playbook 继承

Playbooks 支持继承以实现可扩展的配置：

```
通用 TypeScript
    ↓
Vue 3 + TypeScript
    ↓
Acme 公司标准
    ↓
项目特定规则
```

## AI 集成

Hatcher 自动将相关的 Playbook 上下文注入到 AI 提示中：

### 上下文选择

- **自动**：基于文件类型和项目结构
- **手动**：明确指定要使用的 Playbooks
- **智能**：随时间学习你的偏好

### 提示增强

AI 引擎接收结构化上下文如：

```
上下文：Vue 3 组件创建
PLAYBOOK：vue3-typescript, acme-corp-standards
规则：
- 使用带有 <script setup> 的 Composition API
- Props 必须使用 TypeScript 接口
- 组件必须是 PascalCase
- API 调用通过服务层
```

## 市场和分享

### 社区 Playbooks

浏览和安装社区创建的 Playbooks：

- **框架特定**：为流行库优化的模式
- **行业特定**：不同行业的领域知识
- **团队测试**：来自成功项目的真实世界约定

### 发布你的 Playbooks

分享团队的专业知识：

```bash
hatcher playbook publish acme-corp-standards
```

### 版本管理

- **语义版本控制**：跟踪变化和兼容性
- **更新通知**：与社区改进保持同步
- **回滚支持**：安全地回退有问题的更新

## 配置

### 全局 Playbooks

为所有项目设置默认 Playbooks：

```json
{
  "globalPlaybooks": ["typescript-standards", "git-conventions"]
}
```

### 项目覆盖

在 `hatcher.config.json` 中指定项目特定的 Playbooks：

```json
{
  "playbooks": ["vue3-typescript", "team-standards", "./custom-playbook.json"]
}
```

### 条件加载

基于上下文加载不同的 Playbooks：

```json
{
  "conditional": {
    "**/*.test.ts": ["testing-standards"],
    "src/components/**": ["component-standards"],
    "src/api/**": ["api-standards"]
  }
}
```

## 最佳实践

### 从简单开始

从框架基础开始，逐步添加团队特定规则：

1. **安装框架 Playbook**：立即获得 80% 的覆盖
2. **添加团队规则**：捕获独特约定
3. **随时间完善**：基于实际使用更新

### 保持更新

- **定期审查**：随着模式演进更新 Playbooks
- **团队反馈**：让整个团队参与 Playbook 维护
- **版本控制**：与代码一起跟踪 Playbook 变化

### 衡量影响

- **一致性指标**：跟踪对定义模式的遵守情况
- **速度改进**：衡量开发速度提升
- **质量指标**：监控减少的代码审查反馈

## 未来功能

### AI 生成的 Playbooks

通过分析现有代码库自动生成 Playbooks。

### 实时验证

编码时提供实时反馈，确保 Playbook 合规性。

### 团队协作

Playbook 更新的协作编辑和批准工作流。

Playbooks 系统将 AI 从通用代码生成器转变为了解你确切要求和约定的团队专业成员。
