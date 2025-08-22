<template>
  <div class="test-syntax-view">
    <h1>Syntax Highlighting Test</h1>

    <div class="test-section">
      <h2>JavaScript Test</h2>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="code-display" v-html="jsHighlighted"></div>
    </div>

    <div class="test-section">
      <h2>TypeScript Test</h2>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="code-display" v-html="tsHighlighted"></div>
    </div>

    <div class="test-section">
      <h2>Vue Test</h2>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="code-display" v-html="vueHighlighted"></div>
    </div>

    <div class="test-section">
      <h2>CSS Test</h2>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="code-display" v-html="cssHighlighted"></div>
    </div>

    <button @click="runTest">Run Highlighting Test</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { highlightCode } from '../utils/prismHighlighter'

const jsHighlighted = ref('')
const tsHighlighted = ref('')
const vueHighlighted = ref('')
const cssHighlighted = ref('')

const jsCode = `// JavaScript example
const greeting = "Hello World";
function sayHello(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}`

const tsCode = `// TypeScript example
interface User {
  id: number;
  name: string;
  email?: string;
}

const getUser = async (id: number): Promise<User> => {
  return { id, name: 'John Doe' };
}`

const vueCode =
  `<template>
  <div class="component">
    <h1>{{ title }}</h1>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const title = ref('Hello Vue')
</` + `script>`

const cssCode = `/* CSS example */
.container {
  display: flex;
  padding: 20px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
}

.container:hover {
  background-color: #e0e0e0;
}`

const runTest = () => {
  console.log('Running syntax highlighting test...')

  try {
    jsHighlighted.value = highlightCode(jsCode, 'javascript')
    console.log('JS highlighted:', jsHighlighted.value)
    console.log('JS has styles:', jsHighlighted.value.includes('style='))

    tsHighlighted.value = highlightCode(tsCode, 'typescript')
    console.log('TS highlighted:', tsHighlighted.value)
    console.log('TS has styles:', tsHighlighted.value.includes('style='))

    vueHighlighted.value = highlightCode(vueCode, 'vue')
    console.log('Vue highlighted:', vueHighlighted.value)
    console.log('Vue has styles:', vueHighlighted.value.includes('style='))

    cssHighlighted.value = highlightCode(cssCode, 'css')
    console.log('CSS highlighted:', cssHighlighted.value)
    console.log('CSS has styles:', cssHighlighted.value.includes('style='))

    console.log('✅ All tests completed')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

onMounted(() => {
  runTest()
})
</script>

<style scoped>
.test-syntax-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: var(--text-primary);
  margin-bottom: 20px;
}

h2 {
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.test-section {
  margin-bottom: 30px;
}

.code-display {
  background: #1e1e1e;
  padding: 15px;
  border-radius: 8px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  color: #d4d4d4;
}

/* Ensure Shiki styles are preserved */
.code-display :deep(span) {
  /* Allow inline styles to take precedence */
}

button {
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  opacity: 0.9;
}
</style>
