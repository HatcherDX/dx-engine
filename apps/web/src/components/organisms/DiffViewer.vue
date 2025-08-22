<template>
  <div class="diff-viewer">
    <div class="diff-header">
      <div class="diff-info">
        <h4 class="diff-title">Code Changes</h4>
        <div class="diff-stats">
          <span class="additions">+{{ additionsCount }}</span>
          <span class="deletions">-{{ deletionsCount }}</span>
        </div>
      </div>

      <div class="diff-actions">
        <BaseButton
          variant="secondary"
          size="sm"
          class="discard-button"
          @click="discardChanges"
        >
          <BaseIcon name="X" size="xs" />
          <span>Discard</span>
        </BaseButton>

        <BaseButton
          variant="primary"
          size="sm"
          class="apply-button"
          @click="applyChanges"
        >
          <BaseIcon name="Eye" size="xs" />
          <span>Apply Changes</span>
        </BaseButton>
      </div>
    </div>

    <div class="diff-content">
      <div class="diff-files">
        <div v-for="file in diffFiles" :key="file.filename" class="diff-file">
          <!-- File Header -->
          <div class="file-header">
            <div class="file-info">
              <BaseIcon name="Code" size="sm" class="file-icon" />
              <span class="filename">{{ file.filename }}</span>
              <span class="file-stats">
                <span v-if="file.additions" class="file-additions"
                  >+{{ file.additions }}</span
                >
                <span v-if="file.deletions" class="file-deletions"
                  >-{{ file.deletions }}</span
                >
              </span>
            </div>

            <BaseButton
              variant="ghost"
              size="sm"
              class="expand-button"
              @click="toggleFileExpansion(file)"
            >
              <BaseIcon
                name="ArrowRight"
                size="xs"
                class="expand-icon"
                :class="{ expanded: file.expanded }"
              />
            </BaseButton>
          </div>

          <!-- File Diff Content -->
          <div v-if="file.expanded" class="file-diff">
            <div class="diff-lines">
              <div
                v-for="(chunk, chunkIndex) in file.chunks"
                :key="chunkIndex"
                class="diff-chunk"
              >
                <!-- Chunk Header -->
                <div class="chunk-header">
                  <span class="chunk-info">{{ chunk.header }}</span>
                </div>

                <!-- Diff Lines -->
                <div
                  v-for="(line, lineIndex) in chunk.lines"
                  :key="lineIndex"
                  class="diff-line"
                  :class="{
                    'line-addition': line.type === 'addition',
                    'line-deletion': line.type === 'deletion',
                    'line-context': line.type === 'context',
                  }"
                >
                  <div class="line-numbers">
                    <span class="old-line-number">{{
                      line.oldLineNumber || ''
                    }}</span>
                    <span class="new-line-number">{{
                      line.newLineNumber || ''
                    }}</span>
                  </div>

                  <div class="line-indicator">
                    <span class="line-symbol">{{
                      getLineSymbol(line.type)
                    }}</span>
                  </div>

                  <div class="line-content">
                    <code>{{ line.content }}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

interface DiffLine {
  type: 'addition' | 'deletion' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface DiffChunk {
  header: string
  lines: DiffLine[]
}

interface DiffFile {
  filename: string
  additions: number
  deletions: number
  expanded: boolean
  chunks: DiffChunk[]
}

interface Props {
  changes?: string[]
}

withDefaults(defineProps<Props>(), {
  changes: () => [
    'Added new component',
    'Updated styles',
    'Fixed TypeScript errors',
  ],
})

// Sample diff data - in a real app this would come from props
const diffFiles = ref<DiffFile[]>([
  {
    filename: 'src/components/organisms/ChatPanel.vue',
    additions: 15,
    deletions: 3,
    expanded: true,
    chunks: [
      {
        header: '@@ -1,8 +1,20 @@',
        lines: [
          {
            type: 'context',
            content: '<template>',
            oldLineNumber: 1,
            newLineNumber: 1,
          },
          {
            type: 'context',
            content: '  <div class="chat-panel">',
            oldLineNumber: 2,
            newLineNumber: 2,
          },
          {
            type: 'deletion',
            content: '    <!-- Old chat header -->',
            oldLineNumber: 3,
          },
          {
            type: 'addition',
            content: '    <!-- Chat Header -->',
            newLineNumber: 3,
          },
          {
            type: 'addition',
            content: '    <div class="chat-header">',
            newLineNumber: 4,
          },
          {
            type: 'addition',
            content: '      <div class="chat-title">',
            newLineNumber: 5,
          },
          {
            type: 'addition',
            content:
              '        <BaseIcon name="Terminal" size="sm" class="chat-icon" />',
            newLineNumber: 6,
          },
          {
            type: 'addition',
            content: '        <span class="title-text">Hatcher AI</span>',
            newLineNumber: 7,
          },
          {
            type: 'addition',
            content: '      </div>',
            newLineNumber: 8,
          },
          {
            type: 'addition',
            content: '    </div>',
            newLineNumber: 9,
          },
          {
            type: 'context',
            content: '  </div>',
            oldLineNumber: 4,
            newLineNumber: 10,
          },
        ],
      },
    ],
  },
  {
    filename: 'src/styles/chat.css',
    additions: 8,
    deletions: 2,
    expanded: false,
    chunks: [
      {
        header: '@@ -10,5 +10,11 @@',
        lines: [
          {
            type: 'context',
            content: '.chat-panel {',
            oldLineNumber: 10,
            newLineNumber: 10,
          },
          {
            type: 'deletion',
            content: '  background: white;',
            oldLineNumber: 11,
          },
          {
            type: 'addition',
            content: '  background: var(--bg-primary);',
            newLineNumber: 11,
          },
          {
            type: 'addition',
            content: '  border-left: 1px solid var(--border-primary);',
            newLineNumber: 12,
          },
          {
            type: 'context',
            content: '}',
            oldLineNumber: 12,
            newLineNumber: 13,
          },
        ],
      },
    ],
  },
])

const additionsCount = computed(() => {
  return diffFiles.value.reduce((total, file) => total + file.additions, 0)
})

const deletionsCount = computed(() => {
  return diffFiles.value.reduce((total, file) => total + file.deletions, 0)
})

const toggleFileExpansion = (file: DiffFile) => {
  file.expanded = !file.expanded
}

const getLineSymbol = (type: DiffLine['type']) => {
  switch (type) {
    case 'addition':
      return '+'
    case 'deletion':
      return '-'
    case 'context':
      return ' '
    default:
      return ' '
  }
}

const applyChanges = () => {
  console.log('Applying changes...')
  // Note: Apply changes logic will be implemented with VCS integration
}

const discardChanges = () => {
  console.log('Discarding changes...')
  // Note: Discard changes logic will be implemented with VCS integration
}

// Expose properties for testing
defineExpose({
  diffFiles,
  toggleFileExpansion,
})
</script>

<style scoped>
.diff-viewer {
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-secondary);
  overflow: hidden;
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.diff-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.diff-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.diff-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.additions {
  color: #10b981;
}

.deletions {
  color: #ef4444;
}

.diff-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.discard-button,
.apply-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.diff-content {
  background: var(--bg-primary);
}

.diff-files {
  display: flex;
  flex-direction: column;
}

.diff-file {
  border-bottom: 1px solid var(--border-primary);
}

.diff-file:last-child {
  border-bottom: none;
}

.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.file-header:hover {
  background: var(--bg-tertiary);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  color: var(--accent-primary);
}

.filename {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.file-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.file-additions {
  color: #10b981;
}

.file-deletions {
  color: #ef4444;
}

.expand-button {
  padding: 4px;
}

.expand-icon {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.file-diff {
  background: var(--bg-primary);
}

.diff-lines {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.diff-chunk {
  border-bottom: 1px solid var(--border-primary);
}

.diff-chunk:last-child {
  border-bottom: none;
}

.chunk-header {
  background: var(--bg-tertiary);
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-primary);
}

.chunk-info {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.diff-line {
  display: flex;
  align-items: center;
  min-height: 20px;
  transition: background-color var(--transition-fast);
}

.diff-line:hover {
  background: var(--bg-secondary);
}

.line-addition {
  background: rgba(16, 185, 129, 0.1);
}

.line-deletion {
  background: rgba(239, 68, 68, 0.1);
}

.line-addition:hover {
  background: rgba(16, 185, 129, 0.15);
}

.line-deletion:hover {
  background: rgba(239, 68, 68, 0.15);
}

.line-numbers {
  display: flex;
  flex-direction: column;
  width: 80px;
  padding: 0 8px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.old-line-number,
.new-line-number {
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: right;
  line-height: 1.2;
  min-height: 10px;
}

.line-indicator {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.line-symbol {
  font-weight: 600;
  font-size: 12px;
}

.line-addition .line-symbol {
  color: #10b981;
}

.line-deletion .line-symbol {
  color: #ef4444;
}

.line-context .line-symbol {
  color: var(--text-tertiary);
}

.line-content {
  flex: 1;
  padding: 2px 8px;
  overflow-x: auto;
  white-space: pre;
}

.line-content code {
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  color: var(--text-primary);
}

/* Animation for diff viewer appearance */
@keyframes diff-appear {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.diff-viewer {
  animation: diff-appear 0.3s ease-out;
}

/* Scrollbar for line content */
.line-content::-webkit-scrollbar {
  height: 4px;
}

.line-content::-webkit-scrollbar-track {
  background: transparent;
}

.line-content::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 2px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .diff-header {
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .diff-actions {
    width: 100%;
    justify-content: space-between;
  }

  .file-header {
    padding: 10px 12px;
  }

  .line-numbers {
    width: 60px;
    padding: 0 6px;
  }

  .diff-lines {
    font-size: 11px;
  }

  .line-content {
    padding: 2px 6px;
  }
}
</style>
