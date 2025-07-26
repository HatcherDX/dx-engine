# Visual-to-Code 桥接

Visual-to-Code 桥接是 Hatcher 的标志性功能，它彻底改变了开发者与 AI 编码助手的交互方式。开发者不再需要用文字描述变更，而是直接操作应用程序的可视化界面，Hatcher 将你的操作转换为精确的代码修改。

## 工作原理

### 传统问题

```mermaid
graph LR
    A[开发者意图] --> B[文字描述]
    B --> C[AI 解释]
    C --> D[代码生成]
    D --> E[经常出错的结果]
    E --> F[手动修正]
    F --> B
```

**令人沮丧的循环示例：**

- 开发者："把标题变成蓝色并居中"
- AI：生成了让错误元素变蓝的 CSS
- 开发者："不，是主标题，不是侧边栏标题"
- AI：使用了错误的蓝色色调
- 开发者："使用 #3B82F6 并增加字体大小"
- ... 如此循环

### Hatcher 的 Visual-to-Code 方法

```mermaid
graph LR
    A[可视化选择] --> B[直接操作]
    B --> C[精确意图捕获]
    C --> D[上下文代码生成]
    D --> E[精确结果]
```

**实际工作方式：**

1. **点击选择**：指向你想要更改的元素
2. **可视化操作**：通过拖拽、调整大小或可视化修改属性
3. **意图识别**：Hatcher 准确理解发生了什么变化
4. **代码生成**：AI 生成所需的精确代码
5. **完美结果**：变更完全匹配你的可视化意图

## 核心功能

### 1. 元素选择

**智能选择系统**

- 点击任何元素来选择它
- 悬停预览选择边界
- 选择多个元素进行批量操作
- 层次选择（子元素、父元素、同级元素）

```typescript
// 示例：选择一个按钮
const selection = {
  element: 'button.submit-btn',
  properties: {
    position: { x: 120, y: 45 },
    dimensions: { width: 100, height: 36 },
    styles: {
      backgroundColor: '#3B82F6',
      borderRadius: '6px',
      fontSize: '14px',
    },
  },
  context: {
    parent: 'form.checkout-form',
    siblings: ['input.email', 'input.password'],
    framework: 'Vue 3',
    component: 'SubmitButton.vue',
  },
}
```

### 2. 可视化操作

**直接属性编辑**

- 拖拽元素到新位置
- 通过拖拽角落调整大小
- 背景和文字的颜色选择器
- 字体控制（字体、大小、粗细）
- 间距控制（外边距、内边距）

**实时预览**

- 在应用程序中立即看到变化
- 无需刷新或重新构建
- 热模块替换集成
- 实时 CSS 更新

### 3. 意图识别

Hatcher 分析你的可视化变更并理解：

**布局变更**

- 位置修改（绝对、相对、flex）
- 大小调整（宽度、高度、响应式）
- 对齐变更（居中、flex、grid）

**样式变更**

- 颜色修改（hex、RGB、HSL、CSS 变量）
- 字体更新（字体族、大小、粗细、行高）
- 视觉效果（阴影、边框、渐变）

**组件变更**

- Props 修改
- 状态更新
- 事件处理器添加

### 4. 代码生成

基于你的可视化意图，Hatcher 生成：

**框架特定代码**

```vue
<!-- Vue 3 示例 -->
<template>
  <button
    class="submit-btn"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px)`,
      backgroundColor: '#3B82F6',
    }"
    @click="handleSubmit"
  >
    提交
  </button>
</template>
```

**CSS 更新**

```css
.submit-btn {
  position: absolute;
  left: 120px;
  top: 45px;
  background-color: #3b82f6;
  width: 100px;
  height: 36px;
  border-radius: 6px;
  font-size: 14px;
}
```

**TypeScript 集成**

```typescript
interface ButtonProps {
  position: { x: number; y: number }
  variant: 'primary' | 'secondary'
  size: 'sm' | 'md' | 'lg'
}
```

## 高级功能

### 1. 响应式设计

**多断点编辑**

- 同时编辑不同屏幕尺寸
- 自动生成响应式 CSS
- 在设备间保持设计一致性

```css
/* 生成的响应式代码 */
.submit-btn {
  /* 移动端 */
  width: 100%;
  margin: 0 16px;
}

@media (min-width: 768px) {
  /* 平板 */
  .submit-btn {
    width: 200px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  /* 桌面端 */
  .submit-btn {
    width: 150px;
    position: absolute;
    left: 120px;
  }
}
```

### 2. 组件感知变更

**智能组件检测**

- 识别 Vue、React、Svelte 组件
- 理解组件 props 和状态
- 维护组件边界

**示例：修改 Vue 组件**

```vue
<!-- 修改前 -->
<UserCard :user="currentUser" size="medium" />

<!-- 可视化修改后 -->
<UserCard
  :user="currentUser"
  size="large"
  :style="{ marginTop: '24px' }"
  show-avatar
/>
```

### 3. 设计系统集成

**自动令牌使用**

- 识别设计系统令牌
- 建议适当的值
- 保持一致性

```css
/* 而不是任意值 */
color: #3b82f6;
padding: 12px;

/* 使用设计令牌 */
color: var(--color-primary-500);
padding: var(--spacing-3);
```

## 工作流程示例

### 示例 1：布局调整

**目标**：将侧边栏从左侧移到右侧

1. **选择**：点击侧边栏组件
2. **拖拽**：将其拖到屏幕右侧
3. **审查**：查看生成的 flex/grid 变化
4. **应用**：接受 CSS 修改

**生成的代码**：

```css
.layout-container {
  display: flex;
  flex-direction: row; /* 从 row-reverse 改变 */
}

.sidebar {
  order: 2; /* 从 1 改变 */
  margin-left: auto; /* 添加 */
}
```

### 示例 2：组件样式

**目标**：更改按钮外观以匹配设计

1. **选择**：点击按钮
2. **样式**：使用颜色选择器，调整大小，修改边框
3. **预览**：在应用程序中实时查看变化
4. **生成**：获取组件 prop 更新

**生成的代码**：

```vue
<script setup>
const buttonStyle = {
  variant: 'primary',
  size: 'lg',
  rounded: true,
}
</script>

<template>
  <AppButton v-bind="buttonStyle"> 提交订单 </AppButton>
</template>
```

### 示例 3：响应式调整

**目标**：使网格响应式

1. **选择**：选择网格容器
2. **调整**：为不同断点调整列数
3. **测试**：在移动/平板/桌面上预览
4. **应用**：生成响应式 CSS Grid

**生成的代码**：

```css
.product-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr; /* 移动端 */
}

@media (min-width: 640px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr); /* 平板 */
  }
}

@media (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr); /* 桌面端 */
  }
}
```

## 与 AI 引擎集成

Visual-to-Code 桥接与支持的 AI 引擎无缝配合：

### Claude Code 集成

```typescript
const visualIntent = captureVisualChange(selection, modification)
const codeChange = await claudeCode.generateChange({
  intent: visualIntent,
  context: projectContext,
  playbook: teamPlaybook,
})
```

### Gemini CLI 集成

```typescript
const prompt = buildVisualPrompt(visualIntent, codeContext)
const suggestion = await geminiCLI.complete(prompt)
const refinedCode = refineWithPlaybook(suggestion)
```

## 最佳实践

### 1. 从小开始

- 进行增量式可视化变更
- 在进行下一个修改之前测试每个修改
- 通过较小的步骤构建复杂的变更

### 2. 使用 Playbooks

- 在 playbooks 中定义组件模式
- 建立一致的样式规则
- 记录常见的设计模式

### 3. 审查生成的代码

- 在应用之前始终审查代码差异
- 确保生成的代码遵循你的标准
- 如需要更好的结果，改进提示

### 4. 彻底测试

- 使用自动化测试来验证变更
- 检查响应式行为
- 验证可访问性合规性

---

Visual-to-Code 桥接代表了我们与 AI 进行开发交互方式的根本转变。通过消除意图和实现之间的转换层，它创造了更加直观、精确和高效的开发体验。
