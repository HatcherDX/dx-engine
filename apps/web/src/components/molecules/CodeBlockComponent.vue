<template>
  <div class="code-block-container">
    <div class="code-header">
      <div class="code-info">
        <BaseIcon
          :name="getLanguageIcon(language)"
          size="sm"
          class="language-icon"
        />
        <span class="language-name">{{ getLanguageName(language) }}</span>
        <span v-if="filename" class="filename">{{ filename }}</span>
      </div>
      <div class="code-actions">
        <BaseButton
          variant="ghost"
          size="sm"
          :aria-label="'Copy code'"
          class="copy-button"
          @click="copyCode"
        >
          <BaseIcon :name="copyIcon" size="sm" />
          <span class="copy-text">{{ copyText }}</span>
        </BaseButton>
      </div>
    </div>

    <div class="code-content">
      <pre class="code-pre">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <code :class="`language-${language}`" v-html="highlightedCode"></code>
      </pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

interface Props {
  content: string
  language?: string
  filename?: string
}

const props = withDefaults(defineProps<Props>(), {
  language: 'javascript',
  filename: '',
})

const copyIcon = ref('Code')
const copyText = ref('Copy')

// Simple syntax highlighting (basic implementation)
const highlightedCode = computed(() => {
  // In a real application, you would use a library like Prism.js or highlight.js
  let code = props.content

  // Basic highlighting for common patterns
  if (props.language === 'vue' || props.language === 'html') {
    code = code
      .replace(
        /(&lt;\/?)([a-zA-Z-]+)(?=[\s&gt;])/g,
        '$1<span class="tag">$2</span>'
      )
      .replace(/(\w+)(?==)/g, '<span class="attr">$1</span>')
      .replace(/(["'])(.*?)\1/g, '<span class="string">$1$2$1</span>')
  } else if (
    props.language === 'javascript' ||
    props.language === 'typescript'
  ) {
    code = code
      .replace(
        /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|default)\b/g,
        '<span class="keyword">$1</span>'
      )
      .replace(/(["'`])(.*?)\1/g, '<span class="string">$1$2$1</span>')
      .replace(/\/\/(.*$)/gm, '<span class="comment">//$1</span>')
      .replace(/\/\*(.*?)\*\//gs, '<span class="comment">/*$1*/</span>')
  } else if (props.language === 'css') {
    code = code
      .replace(/([.#]?[a-zA-Z-]+)(?=\s*{)/g, '<span class="selector">$1</span>')
      .replace(/([a-zA-Z-]+)(?=:)/g, '<span class="property">$1</span>')
      .replace(/(["'])(.*?)\1/g, '<span class="string">$1$2$1</span>')
  }

  return code
})

const getLanguageIcon = (lang: string) => {
  const iconMap: Record<string, string> = {
    vue: 'Eye',
    javascript: 'Code',
    typescript: 'Code',
    html: 'Terminal',
    css: 'Menu',
    json: 'GitBranch',
    bash: 'Terminal',
    shell: 'Terminal',
  }

  return iconMap[lang] || 'Code'
}

const getLanguageName = (lang: string) => {
  const nameMap: Record<string, string> = {
    vue: 'Vue',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    bash: 'Bash',
    shell: 'Shell',
  }

  return nameMap[lang] || lang.toUpperCase()
}

const copyCode = async () => {
  try {
    await window.navigator.clipboard.writeText(props.content)
    copyIcon.value = 'Eye'
    copyText.value = 'Copied!'

    setTimeout(() => {
      copyIcon.value = 'Code'
      copyText.value = 'Copy'
    }, 2000)
  } catch (error) {
    console.error('Failed to copy code:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = props.content
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)

    copyIcon.value = 'Eye'
    copyText.value = 'Copied!'

    setTimeout(() => {
      copyIcon.value = 'Code'
      copyText.value = 'Copy'
    }, 2000)
  }
}
</script>

<style scoped>
.code-block-container {
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.code-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.language-icon {
  color: var(--accent-primary);
}

.language-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.filename {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.code-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}

.copy-text {
  font-size: 11px;
  font-weight: 500;
}

.code-content {
  overflow-x: auto;
  background: var(--bg-primary);
}

.code-pre {
  margin: 0;
  padding: 16px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
  white-space: pre;
  overflow-x: auto;
}

/* Syntax highlighting styles */
:deep(.keyword) {
  color: #d73a49;
  font-weight: 600;
}

:deep(.string) {
  color: #032f62;
}

:deep(.comment) {
  color: #6a737d;
  font-style: italic;
}

:deep(.tag) {
  color: #22863a;
  font-weight: 600;
}

:deep(.attr) {
  color: #6f42c1;
}

:deep(.selector) {
  color: #6f42c1;
  font-weight: 600;
}

:deep(.property) {
  color: #005cc5;
}

/* Dark theme syntax highlighting */
.dark :deep(.keyword) {
  color: #ff7b72;
}

.dark :deep(.string) {
  color: #a5d6ff;
}

.dark :deep(.comment) {
  color: #8b949e;
}

.dark :deep(.tag) {
  color: #7ee787;
}

.dark :deep(.attr) {
  color: #d2a8ff;
}

.dark :deep(.selector) {
  color: #d2a8ff;
}

.dark :deep(.property) {
  color: #79c0ff;
}

/* Scrollbar for code content */
.code-content::-webkit-scrollbar {
  height: 8px;
}

.code-content::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.code-content::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 4px;
}

.code-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Animation for code block appearance */
@keyframes code-block-appear {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.code-block-container {
  animation: code-block-appear 0.3s ease-out;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .code-header {
    padding: 6px 10px;
  }

  .code-pre {
    padding: 12px;
    font-size: 12px;
  }

  .language-name {
    font-size: 11px;
  }

  .copy-text {
    display: none;
  }
}
</style>
