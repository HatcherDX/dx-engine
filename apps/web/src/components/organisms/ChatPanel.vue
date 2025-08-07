<template>
  <div
    class="chat-panel"
    :class="{ 'is-generative': isGenerativeMode, 'is-resizing': isResizing }"
    :style="isGenerativeMode ? {} : { width: effectiveWidth }"
  >
    <!-- Resize handle (hidden for generative mode) -->
    <div
      v-if="shouldShowResizeHandle"
      class="resize-handle"
      :class="{ 'is-resizing': isResizing }"
      :style="{ cursor: resizeCursor || 'col-resize' }"
      title="Drag to resize chat panel"
      @mousedown="startResize"
    />

    <!-- Minimalist Chat Container -->
    <div ref="messagesContainer" class="minimalist-chat">
      <!-- Central Greeting -->
      <div v-if="showWelcome" class="central-greeting">
        <h1 class="greeting-text">
          <span class="greeting-hello">Hello, </span>
          <span class="greeting-hatcher"><b>Hatcher</b></span>
        </h1>
      </div>

      <!-- User messages (when present) -->
      <div v-if="!showWelcome" class="messages-area">
        <div
          v-for="message in userMessages"
          :key="message.id"
          class="user-message"
        >
          {{ message.content }}
        </div>

        <!-- Simple typing indicator -->
        <div v-if="isTyping" class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>

    <!-- Minimalist Input -->
    <div class="minimalist-input-container">
      <div class="minimalist-input-wrapper">
        <BaseIcon name="Terminal" size="sm" class="input-icon" />
        <textarea
          ref="inputTextarea"
          v-model="inputMessage"
          placeholder="What are we building today?"
          class="minimalist-input"
          rows="1"
          @keydown="handleKeydown"
          @input="handleInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import type { ModeType } from '../molecules/ModeSelector.vue'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  components?: unknown[] // For Hatcher responses with code blocks, pipelines, etc.
}

interface Props {
  currentMode: ModeType
  effectiveWidth: string
  shouldShowResizeHandle: boolean
  isGenerativeMode: boolean
  isResizing: boolean
  startResize: (event: MouseEvent) => void
  resizeCursor?: string
}

defineProps<Props>()

// Chat state
const userMessages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isTyping = ref(false)
const messagesContainer = ref<HTMLElement>()
const inputTextarea = ref<HTMLTextAreaElement>()
const showWelcome = ref(true)

// Auto-resize textarea
const handleInput = () => {
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
    inputTextarea.value.style.height = inputTextarea.value.scrollHeight + 'px'
  }
}

// Handle keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// Placeholder is now fixed as "What are we building today?"

// Send message
const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isTyping.value) return

  // Add user message
  const userMessage: ChatMessage = {
    id: generateId(),
    type: 'user',
    content: message,
    timestamp: new Date(),
  }

  userMessages.value.push(userMessage)
  inputMessage.value = ''

  // Hide welcome message once user starts chatting
  showWelcome.value = false

  // Reset textarea height
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
  }

  // Scroll to bottom
  await nextTick(() => {
    scrollToBottom()
  })

  // Show typing indicator briefly
  isTyping.value = true

  setTimeout(() => {
    isTyping.value = false
  }, 1000)
}

// Scroll to bottom
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Generate unique ID
const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

// No initialization needed - welcome message is handled reactively
</script>

<style scoped>
.chat-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  border-left: 1px solid var(--border-primary);
  transition: width var(--transition-normal) ease-in-out;
  min-width: 250px;
}

.chat-panel.is-generative {
  border-left: none;
}

.chat-panel.is-resizing {
  transition: none;
}

/* Resize handle */
.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background-color: transparent;
  cursor: col-resize;
  z-index: 100;
  transition: background-color var(--transition-fast);
}

.resize-handle:hover {
  background-color: var(--resize-handle-hover);
}

.resize-handle.is-resizing {
  background-color: var(--accent-primary);
}

.resize-handle::before {
  content: '';
  position: absolute;
  top: 0;
  left: -2px;
  right: -2px;
  height: 100%;
  background-color: transparent;
}

.resize-handle:hover::before,
.resize-handle.is-resizing::before {
  background-color: var(--resize-handle-color);
  opacity: 0.3;
}

/* Header removed - minimalist design */

/* Minimalist Chat Container */
.minimalist-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow-y: auto;
}

/* Central Greeting */
.central-greeting {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.greeting-text {
  font-size: 32px;
  font-weight: 300;
  margin: 0;
  text-align: center;
  letter-spacing: 0.5px;
}

.greeting-hello {
  color: var(--text-primary);
}

.greeting-hatcher {
  color: var(--accent-primary);
}

/* Messages Area (when chat has started) */
.messages-area {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: auto;
  margin-bottom: 32px;
}

.user-message {
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-primary);
  align-self: flex-end;
  max-width: 70%;
}

/* Minimal Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
  animation: typing-pulse 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: -0.32s;
}
.typing-dot:nth-child(2) {
  animation-delay: -0.16s;
}
.typing-dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes typing-pulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Minimalist Input */
.minimalist-input-container {
  flex-shrink: 0;
  padding: 24px 32px;
  background-color: var(--bg-primary);
  display: flex;
  justify-content: center;
}

.minimalist-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 600px;
  background: var(--bg-primary);
  border: 2px solid var(--border-primary);
  border-radius: 24px;
  padding: 12px 20px;
  transition: border-color var(--transition-fast);
}

.minimalist-input-wrapper:focus-within {
  border-color: var(--accent-primary);
}

.minimalist-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.4;
  resize: none;
  outline: none;
  min-height: 24px;
  max-height: 120px;
  overflow-y: auto;
}

.minimalist-input::placeholder {
  color: var(--text-secondary);
  font-weight: 400;
}

/* Scrollbar styling */
.minimalist-chat::-webkit-scrollbar {
  width: 6px;
}

.minimalist-chat::-webkit-scrollbar-track {
  background: transparent;
}

.minimalist-chat::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 3px;
}

.minimalist-chat::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .chat-panel {
    min-width: 200px;
  }

  .minimalist-chat {
    padding: 16px;
  }

  .greeting-text {
    font-size: 24px;
  }

  .minimalist-input-container {
    padding: 16px;
  }

  .minimalist-input-wrapper {
    padding: 10px 16px;
  }

  .minimalist-input {
    font-size: 14px;
  }
}

/* Input icon styling */
.input-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
  opacity: 1;
}

/* Improve visibility in light mode */
:not(.dark) .input-icon {
  color: var(--text-primary);
}
</style>
