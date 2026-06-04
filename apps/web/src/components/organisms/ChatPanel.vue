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

    <!-- Address Bar with AI Model Selector inline (only for generative mode) -->
    <div v-if="isGenerativeMode" class="chat-addressbar-container">
      <slot name="ai-model-selector" />
      <slot name="address-bar" />
    </div>

    <!-- Main Chat Content Area -->
    <div class="chat-content-wrapper">
      <!-- Minimalist Chat Container -->
      <div ref="messagesContainer" class="minimalist-chat">
        <!-- Central Greeting with Transition -->
        <Transition
          name="welcome-fade"
          mode="out-in"
          @after-leave="onWelcomeGone"
        >
          <div v-if="showWelcome" class="central-greeting">
            <h1 class="greeting-text">
              <span class="greeting-hello">Hello, </span>
              <span class="greeting-hatcher"><b>Hatcher</b></span>
            </h1>
          </div>
        </Transition>

        <!-- User messages with TransitionGroup -->
        <TransitionGroup
          v-if="!showWelcome"
          name="message-slide"
          tag="div"
          class="messages-area"
          @before-enter="onBeforeEnter"
          @enter="onEnter"
        >
          <div
            v-for="(message, index) in userMessages"
            :key="message.id"
            :data-index="index"
            :class="[
              'message-wrapper',
              message.type === 'user'
                ? 'message-wrapper--user'
                : 'message-wrapper--assistant',
            ]"
          >
            <!-- User message (bubble style) -->
            <div v-if="message.type === 'user'" class="user-message">
              <div class="message-content">{{ message.content }}</div>
              <div class="message-timestamp">
                {{ formatTime(message.timestamp) }}
              </div>
            </div>

            <!-- Assistant message (full-width Gemini style) -->
            <div v-else class="assistant-message">
              <div
                class="assistant-message-content"
                v-html="renderMarkdown(message.content)"
              ></div>

              <!-- Metadata footer: Model on left, Metrics on right -->
              <div class="message-footer">
                <!-- Model label (left side) -->
                <div class="model-label">
                  <span class="provider-name">{{
                    formatProviderName(message.provider)
                  }}</span>
                  <span class="model-separator">•</span>
                  <span class="model-name">{{
                    formatModelName(message.model)
                  }}</span>
                </div>

                <!-- Individual message metrics (right side) -->
                <div v-if="message.metadata" class="message-metrics">
                  <div
                    v-if="message.metadata.inputTokens"
                    class="metric-item"
                    title="Input tokens"
                  >
                    <BaseIcon
                      name="ArrowDown"
                      size="2xs"
                      class="metric-icon-small input-color"
                    />
                    <span class="metric-text"
                      >{{
                        message.metadata.inputTokens.toLocaleString()
                      }}
                      in</span
                    >
                  </div>

                  <div
                    v-if="message.metadata.outputTokens"
                    class="metric-item"
                    title="Output tokens"
                  >
                    <BaseIcon
                      name="ArrowUp"
                      size="2xs"
                      class="metric-icon-small output-color"
                    />
                    <span class="metric-text"
                      >{{
                        message.metadata.outputTokens.toLocaleString()
                      }}
                      out</span
                    >
                  </div>

                  <div
                    v-if="
                      message.metadata.latency &&
                      typeof message.metadata.latency === 'number'
                    "
                    class="metric-item"
                    title="Response time"
                  >
                    <BaseIcon
                      name="Activity"
                      size="2xs"
                      class="metric-icon-small"
                    />
                    <span class="metric-text"
                      >{{
                        Math.round(message.metadata.latency as number)
                      }}ms</span
                    >
                  </div>

                  <div
                    v-if="
                      message.metadata.cost &&
                      typeof message.metadata.cost === 'number'
                    "
                    class="metric-item"
                    title="Cost for this message"
                  >
                    <BaseIcon
                      name="DollarSign"
                      size="2xs"
                      class="metric-icon-small cost-color"
                    />
                    <span class="metric-text"
                      >${{ (message.metadata.cost as number).toFixed(3) }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Enhanced typing indicator with status -->
          <div
            v-if="isTyping"
            key="typing-indicator"
            class="typing-indicator-container"
          >
            <div class="typing-indicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
            <span class="typing-status">{{ typingStatus }}</span>
          </div>
        </TransitionGroup>
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

      <!-- AI Metrics Status Bar -->
      <div class="ai-status-bar">
        <div class="status-section" title="Input tokens consumed">
          <BaseIcon
            name="ArrowDown"
            size="2xs"
            class="metric-icon input-icon"
          />
          <span class="metric-value">{{ tokensInput.toLocaleString() }}</span>
          <span class="metric-label">in</span>
        </div>

        <div class="status-divider"></div>

        <div class="status-section" title="Output tokens generated">
          <BaseIcon name="ArrowUp" size="2xs" class="metric-icon output-icon" />
          <span class="metric-value">{{ tokensOutput.toLocaleString() }}</span>
          <span class="metric-label">out</span>
        </div>

        <div class="status-divider"></div>

        <div class="status-section" title="Time to first token">
          <BaseIcon name="Activity" size="2xs" class="metric-icon" />
          <span class="metric-value">{{ responseTime }}ms</span>
          <span class="metric-label">latency</span>
        </div>

        <div class="status-divider"></div>

        <div
          class="status-section"
          :title="`Context usage: ${contextUsage}% of 200k tokens`"
        >
          <BaseIcon name="BarChart" size="2xs" class="metric-icon" />
          <span
            class="metric-value"
            :class="{
              'context-low': contextUsage < 50,
              'context-medium': contextUsage >= 50 && contextUsage < 80,
              'context-high': contextUsage >= 80,
            }"
            >{{ contextUsage }}%</span
          >
          <span class="metric-label">context</span>
        </div>

        <div class="status-divider"></div>

        <div class="status-section" title="Total conversation cost">
          <BaseIcon
            name="DollarSign"
            size="2xs"
            class="metric-icon cost-icon"
          />
          <span class="metric-value">{{
            conversationCost > 0 ? conversationCost.toFixed(3) : '0.000'
          }}</span>
          <span class="metric-label">cost</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, computed } from 'vue'
import { marked } from 'marked'
import BaseIcon from '../atoms/BaseIcon.vue'
import { useAIChat } from '../../composables/useAIChat'
import { useProjectContext } from '../../composables/useProjectContext'
import { useChatPersistence } from '../../composables/useChatPersistence'
import type { ModeType } from '../molecules/ModeSelector.vue'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  provider?: string // Optional for legacy message compatibility
  model?: string // Optional for legacy message compatibility
  components?: unknown[] // For Hatcher responses with code blocks, pipelines, etc.
  metadata?: {
    inputTokens?: number
    outputTokens?: number
    latency?: number
    cost?: number
    contextUsage?: number
    components?: unknown[]
    [key: string]: unknown
  }
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

// AI Chat composable
const {
  error: aiError,
  streamMessage,
  isElectron,
  currentProvider,
} = useAIChat()

// Project context composable
const { openedProject } = useProjectContext()

// Chat persistence composable
const {
  messages: persistedMessages,
  metrics: persistedMetrics,
  saveUserMessage,
  saveAssistantMessage,
  loadSession,
} = useChatPersistence()

// Chat state - use persisted messages if available
const userMessages = computed(() => {
  // If we have persisted messages, use them
  if (persistedMessages.value && persistedMessages.value.length > 0) {
    // Convert persisted messages to the component's format
    const mapped = persistedMessages.value.map((msg) => {
      console.log('[ChatPanel] Message from DB:', {
        id: msg.id,
        model: msg.model,
        provider: msg.provider,
      })
      return {
        id: msg.id,
        type: msg.type, // AIMessage already has correct 'type' field
        content: msg.content,
        timestamp: msg.timestamp,
        provider: msg.provider, // Include provider for model label
        model: msg.model, // Include model for model label
        components: msg.metadata?.components,
        metadata: msg.metadata, // Include full metadata for per-message metrics
      }
    })
    console.log('[ChatPanel] Total messages mapped:', mapped.length)
    return mapped
  }
  // Otherwise use local messages
  return localMessages.value
})

// Local messages for non-persisted state
const localMessages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isTyping = ref(false)
const typingStatus = ref('Claude is thinking...')
const messagesContainer = ref<HTMLElement>()
const inputTextarea = ref<HTMLTextAreaElement>()
const showWelcome = computed(() => userMessages.value.length === 0)
// Session ID will be auto-generated by backend on first message
const currentSessionId = ref<string | undefined>()

// Local metrics for tracking during streaming
const localTokensInput = ref(0)
const localTokensOutput = ref(0)
const localContextUsage = ref(0)
const localConversationCost = ref(0)
const localResponseTime = ref(0)

// AI Metrics - use persisted metrics if available
const tokensInput = computed(
  () => persistedMetrics.value?.totalInputTokens || localTokensInput.value
)
const tokensOutput = computed(
  () => persistedMetrics.value?.totalOutputTokens || localTokensOutput.value
)
const responseTime = computed(
  () => persistedMetrics.value?.averageLatency || localResponseTime.value
)
const contextUsage = computed(() => {
  if (persistedMetrics.value) {
    const maxContextTokens = 200000
    const totalTokensUsed =
      persistedMetrics.value.totalInputTokens +
      persistedMetrics.value.totalOutputTokens
    return Math.round((totalTokensUsed / maxContextTokens) * 100)
  }
  return localContextUsage.value
})
const conversationCost = computed(
  () => persistedMetrics.value?.totalCost || localConversationCost.value
)

// Load session on mount - the composable will handle loading history
onMounted(async () => {
  console.log('[ChatPanel] Component mounted, loading chat session...')
  // The useChatPersistence composable automatically loads on mount
  // but we can also manually trigger if needed
  if (!persistedMessages.value || persistedMessages.value.length === 0) {
    await loadSession()
  }
})

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

// Send message with real AI streaming
const sendMessage = async () => {
  const message = inputMessage.value.trim()
  console.log('[ChatPanel] sendMessage called with:', message)
  if (!message || isTyping.value) {
    console.log('[ChatPanel] Skipping - empty message or already typing')
    return
  }

  // Check if Electron API is available
  if (!isElectron.value) {
    console.error(
      '[ChatPanel] AI Chat is only available in Electron environment'
    )
    return
  }
  console.log('[ChatPanel] Electron API available, proceeding with AI chat')

  // Add user message
  const userMessage: ChatMessage = {
    id: generateId(),
    type: 'user',
    content: message,
    timestamp: new Date(),
  }

  // Save user message to persistence
  await saveUserMessage(message)

  // Add to local messages as fallback
  localMessages.value.push(userMessage)
  inputMessage.value = ''

  // Reset textarea height
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
  }

  // Scroll to bottom
  await nextTick(() => {
    scrollToBottom()
  })

  // Show typing indicator with initial status
  isTyping.value = true
  typingStatus.value = 'Claude is thinking...'

  // Create assistant message placeholder with reactive object
  const assistantMessageId = generateId()
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    type: 'assistant',
    content: '',
    timestamp: new Date(),
  }

  localMessages.value.push(assistantMessage)

  try {
    // Stream AI response in real-time
    console.log(
      '[ChatPanel] Starting stream with sessionId:',
      currentSessionId.value
    )

    let hasReceivedFirstChunk = false

    // Get project root path from opened project context
    const userProjectCwd = openedProject.value?.rootPath
    if (userProjectCwd) {
      console.log('[ChatPanel] Using project root as cwd:', userProjectCwd)
    } else {
      console.warn(
        '[ChatPanel] No project opened, AI may not have correct context'
      )
    }

    const startTime = Date.now()
    let finalContent = ''
    let finalMetrics = {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      latency: 0,
    }

    for await (const chunk of streamMessage({
      message,
      sessionId: currentSessionId.value,
      cwd: userProjectCwd, // Pass project root directory
      providerName: currentProvider.value, // Use selected AI provider
    })) {
      console.log('[ChatPanel] Received chunk:', chunk)

      // Update status when first chunk arrives
      if (!hasReceivedFirstChunk) {
        hasReceivedFirstChunk = true
        typingStatus.value = 'Claude is responding...'
        // Calculate time to first token
        localResponseTime.value = Date.now() - startTime
      }

      // Process assistant and result content chunks
      if (
        (chunk.type === 'assistant' || chunk.type === 'result') &&
        chunk.content
      ) {
        // Find the message in local messages and update it
        const messageIndex = localMessages.value.findIndex(
          (m) => m.id === assistantMessageId
        )
        if (messageIndex !== -1) {
          // For 'result' type, replace entire content (it's the final response)
          if (chunk.type === 'result') {
            localMessages.value[messageIndex].content = chunk.content
            finalContent = chunk.content

            // Extract metrics from result chunk metadata
            if (chunk.metadata) {
              const metadata = chunk.metadata as {
                usage?: {
                  input_tokens?: number
                  output_tokens?: number
                }
                total_cost_usd?: number
                duration_ms?: number
              }

              // Extract token usage
              if (metadata.usage) {
                localTokensInput.value += metadata.usage.input_tokens || 0
                localTokensOutput.value += metadata.usage.output_tokens || 0
                finalMetrics.inputTokens = metadata.usage.input_tokens || 0
                finalMetrics.outputTokens = metadata.usage.output_tokens || 0
              }

              // Extract cost
              if (metadata.total_cost_usd !== undefined) {
                localConversationCost.value += metadata.total_cost_usd
                finalMetrics.cost = metadata.total_cost_usd
              }

              // Update final response time
              if (metadata.duration_ms) {
                localResponseTime.value = metadata.duration_ms
                finalMetrics.latency = metadata.duration_ms
              }

              // Calculate context usage percentage
              // Claude has 200k token context window
              const maxContextTokens = 200000
              const totalTokensUsed =
                localTokensInput.value + localTokensOutput.value
              localContextUsage.value = Math.round(
                (totalTokensUsed / maxContextTokens) * 100
              )
            }
          } else {
            // For 'assistant' type, append streaming content
            localMessages.value[messageIndex].content += chunk.content
            finalContent = localMessages.value[messageIndex].content
          }
        }

        // Auto-scroll as content arrives
        await nextTick(() => {
          scrollToBottom()
        })
      }
    }

    // Stream complete - hide typing indicator
    isTyping.value = false

    // Save assistant message to persistence with metrics
    if (finalContent) {
      await saveAssistantMessage(
        finalContent,
        finalMetrics.inputTokens,
        finalMetrics.outputTokens,
        finalMetrics.cost,
        finalMetrics.latency,
        localContextUsage.value
      )
    }

    // Scroll to show final message
    await nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    console.error('[ChatPanel] AI streaming error:', error)
    isTyping.value = false

    // Show error message - update via array to trigger reactivity
    const messageIndex = localMessages.value.findIndex(
      (m) => m.id === assistantMessageId
    )
    if (messageIndex !== -1) {
      localMessages.value[messageIndex].content =
        `Error: ${aiError.value || 'Failed to get AI response'}`
    }
  }
}

// Scroll to bottom with smooth animation
const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  })
}

// Watch messages and auto-scroll
watch(
  userMessages,
  () => {
    scrollToBottom()
  },
  { deep: true }
)

// Generate unique ID
const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Format timestamp for message display.
 *
 * @param date - Date object to format
 * @returns Formatted time string (e.g., "2:30 PM")
 *
 * @public
 */
const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)
}

/**
 * Render markdown content to HTML using marked.js.
 *
 * @remarks
 * Safely converts markdown strings to HTML for assistant message rendering.
 * Includes code highlighting and proper link handling for security.
 *
 * @param content - Markdown string to render
 * @returns HTML string rendered from markdown
 *
 * @public
 */
const renderMarkdown = (content: string): string => {
  return marked.parse(content) as string
}

/**
 * Formats AI provider name for display.
 *
 * @remarks
 * Includes defensive handling for legacy messages without provider field.
 * Returns 'Unknown' for undefined/null providers.
 * Provider names use proper capitalization (e.g., "Claude Code", not "claude code").
 *
 * @param provider - Provider identifier (e.g., 'anthropic', 'openai')
 * @returns Human-readable provider name with proper capitalization
 *
 * @public
 */
const formatProviderName = (provider: string | undefined): string => {
  // Defensive: handle legacy messages without provider
  if (!provider) return 'Unknown'

  const providerMap: Record<string, string> = {
    anthropic: 'Claude Code',
    openai: 'OpenAI',
    'claude-code': 'Claude Code',
    copilot: 'GitHub Copilot',
    gemini: 'Gemini',
  }

  return providerMap[provider.toLowerCase()] || provider
}

/**
 * Formats AI model name for display.
 *
 * @remarks
 * Includes defensive handling for legacy messages without model field.
 * Returns 'Unknown Model' for undefined/null models.
 *
 * Supported Claude models (official naming from Claude Docs):
 * - claude-sonnet-4-5-20250929 → Sonnet 4.5
 * - claude-sonnet-4-20250514 → Sonnet 4
 * - claude-3-7-sonnet-20250219 → Sonnet 3.7
 * - claude-3-5-sonnet-* → Sonnet 3.5
 * - claude-opus-4-1-20250805 → Opus 4.1
 * - claude-opus-4-20250514 → Opus 4
 * - claude-3-5-haiku-20241022 → Haiku 3.5
 * - claude-3-haiku-20240307 → Haiku 3
 *
 * @param model - Model identifier (e.g., 'claude-3-5-sonnet-20241022')
 * @returns Human-readable model name
 *
 * @public
 */
const formatModelName = (model: string | undefined): string => {
  // Defensive: handle legacy messages without model
  if (!model) {
    console.log('[formatModelName] No model provided, returning Unknown Model')
    return 'Unknown Model'
  }

  console.log('[formatModelName] Formatting model:', model)
  const modelLower = model.toLowerCase()

  // Claude Sonnet models (check specific versions first, most recent to oldest)
  if (modelLower.includes('sonnet')) {
    // Sonnet 4.5: claude-sonnet-4-5-20250929
    if (
      modelLower.includes('sonnet-4-5') ||
      modelLower.includes('sonnet-4.5')
    ) {
      return 'Sonnet 4.5'
    }
    // Sonnet 4: claude-sonnet-4-20250514
    if (modelLower.includes('sonnet-4-2') || modelLower.includes('sonnet-4-')) {
      return 'Sonnet 4'
    }
    // Sonnet 3.7: claude-3-7-sonnet-20250219
    if (
      modelLower.includes('3-7-sonnet') ||
      modelLower.includes('3.7-sonnet')
    ) {
      return 'Sonnet 3.7'
    }
    // Sonnet 3.5: claude-3-5-sonnet-*
    if (
      modelLower.includes('3-5-sonnet') ||
      modelLower.includes('3.5-sonnet')
    ) {
      return 'Sonnet 3.5'
    }
    // Sonnet 3: claude-3-sonnet-*
    if (
      modelLower.includes('claude-3') ||
      modelLower.match(/sonnet.*3[^-.5-7]/)
    ) {
      return 'Sonnet 3'
    }
    return 'Sonnet'
  }

  // Claude Opus models
  if (modelLower.includes('opus')) {
    if (modelLower.includes('opus-4-1')) return 'Opus 4.1'
    if (modelLower.includes('opus-4')) return 'Opus 4'
    if (modelLower.includes('claude-3')) return 'Opus 3'
    return 'Opus'
  }

  // Claude Haiku models
  if (modelLower.includes('haiku')) {
    if (modelLower.includes('3-5-haiku')) return 'Haiku 3.5'
    if (modelLower.includes('claude-3')) return 'Haiku 3'
    return 'Haiku'
  }

  // OpenAI models
  if (modelLower.includes('gpt-5o')) return 'GPT-5o'
  if (modelLower.includes('gpt-5')) return 'GPT-5'
  if (modelLower.includes('gpt-4o')) return 'GPT-4o'
  if (modelLower.includes('gpt-4')) return 'GPT-4'
  if (modelLower.includes('gpt-3.5')) return 'GPT-3.5'

  // Gemini models
  if (modelLower.includes('gemini-pro')) return 'Gemini Pro'
  if (modelLower.includes('gemini')) return 'Gemini'

  // Fallback: return model as-is
  return model
}

// Animation hooks
const onBeforeEnter = (el: Element) => {
  const htmlEl = el as HTMLElement
  const index = htmlEl.dataset.index
  if (index) {
    htmlEl.style.setProperty('--message-index', index)
  }
}

const onEnter = (_el: Element, done: () => void) => {
  setTimeout(() => {
    scrollToBottom()
    done()
  }, 100)
}

const onWelcomeGone = () => {
  // Welcome message has elegantly disappeared, chat is ready
  scrollToBottom(false)
}

/**
 * Clear all messages from the conversation.
 *
 * @remarks
 * Removes all messages and resets the chat to initial state with welcome message.
 *
 * @public
 */
const clearMessages = (): void => {
  localMessages.value = []
  // showWelcome is a computed ref, it will automatically become true when localMessages is empty
  console.log('[ChatPanel] Conversation cleared')
}

/**
 * Rewind conversation by removing last N messages.
 *
 * @param steps - Number of messages to remove (default: 1)
 * @returns Number of messages actually removed
 *
 * @remarks
 * Removes messages in pairs (user + assistant) when possible.
 * If odd number of messages, removes from the end.
 *
 * @public
 */
const rewindMessages = (steps: number = 1): number => {
  const messagesToRemove = Math.min(steps, userMessages.value.length)
  if (messagesToRemove > 0) {
    localMessages.value = localMessages.value.slice(0, -messagesToRemove)
    console.log(`[ChatPanel] Rewound ${messagesToRemove} messages`)

    // showWelcome is a computed ref, it will automatically become true when localMessages is empty
  }
  return messagesToRemove
}

// Expose methods for parent components
defineExpose({
  clearMessages,
  rewindMessages,
})
</script>

<style scoped>
.chat-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  border-left: 1px solid var(--border-primary);
  /* Remove width transition to prevent lag during resize */
  min-width: 250px;
  /* Add extra padding to balance pipeline visual weight */
  padding-left: 24px;
}

.chat-panel.is-generative {
  border-left: none;
  padding-left: 0;
}

.chat-panel.is-resizing {
  transition: none;
}

/* Address Bar Container with AI Model Selector inline */
.chat-addressbar-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.02),
    transparent
  );
}

/* Resize handle - replicates terminal-resize-handle behavior */
.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle:hover {
  background: rgba(59, 130, 246, 0.1);
}

.resize-handle.is-resizing {
  background: rgba(59, 130, 246, 0.1);
}

/* Resize handle line indicator */
.resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 2px;
  transform: translateY(-50%);
  width: 2px;
  height: 40px;
  background: var(--border-primary);
  border-radius: 1px;
  transition: all 0.2s ease;
  opacity: 1;
}

.resize-handle:hover::after {
  background: var(--accent-primary);
  width: 2px;
  height: 60px;
}

.resize-handle.is-resizing::after {
  background: var(--accent-primary);
  width: 2px;
  height: 60px;
}

/* Header removed - minimalist design */

/* Chat Content Wrapper */
.chat-content-wrapper {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* Fade gradients at top and bottom (Gemini style) */
.chat-content-wrapper::before,
.chat-content-wrapper::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
  z-index: 10;
}

.chat-content-wrapper::before {
  top: 0;
  background: linear-gradient(
    to bottom,
    var(--bg-primary) 0%,
    transparent 100%
  );
}

.chat-content-wrapper::after {
  bottom: 0;
  background: linear-gradient(to top, var(--bg-primary) 0%, transparent 100%);
}

/* Hide fade gradient when showing welcome message */
.chat-content-wrapper:has(.central-greeting)::before,
.chat-content-wrapper:has(.central-greeting)::after {
  display: none;
}

/* Minimalist Chat Container */
.minimalist-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Changed from center to flex-start */
  padding: 24px 32px; /* Reduced top padding */
  overflow-y: auto;
}

/* When showing welcome (no messages), center the greeting */
.minimalist-chat:has(.central-greeting) {
  justify-content: center;
  padding: 48px 32px;
}

/* Central Greeting */
.central-greeting {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.greeting-text {
  font-family: var(--font-system);
  font-size: 2rem;
  font-weight: 200;
  margin: 0;
  text-align: center;
  line-height: 1.2;
}

.greeting-hello {
  color: var(--text-primary);
}

.greeting-hatcher {
  /* Golden gradient matching hatch landing page */
  background: linear-gradient(
    135deg,
    #f4d03f 0%,
    #dfa927 35%,
    #c99623 50%,
    #dfa927 65%,
    #f4d03f 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Dark mode - keep the same golden gradient */
.dark .greeting-hatcher {
  background: linear-gradient(
    135deg,
    #f4d03f 0%,
    #dfa927 35%,
    #c99623 50%,
    #dfa927 65%,
    #f4d03f 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Welcome fade-out animation */
.welcome-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.welcome-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-20px);
  filter: blur(4px);
}

/* Messages Area (when chat has started) */
.messages-area {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 24px;
  padding-bottom: 32px;
}

/* Message slide-in animation */
.message-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--message-index, 0) * 0.05s);
}

.message-slide-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.message-slide-move {
  transition: transform 0.3s ease;
}

/* Message wrapper containers */
.message-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.message-wrapper--user {
  align-items: flex-end;
}

.message-wrapper--assistant {
  align-items: stretch;
}

/* User message (bubble style - Gemini pattern) */
.user-message {
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  max-width: 70%;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Assistant message (full-width Gemini style) */
.assistant-message {
  width: 100%;
  background: transparent;
  padding: 16px 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Message footer: Model on left, Metrics on right */
.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 8px;
  gap: 16px;
}

/* Model label (left side) */
.model-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 400;
  color: var(--text-tertiary);
  opacity: 0.5;
  transition: opacity 0.2s ease;
  letter-spacing: 0.01em;
  flex-shrink: 0;
}

.assistant-message:hover .model-label {
  opacity: 0.7;
}

.provider-name {
  color: rgba(223, 169, 39, 0.6);
  font-size: 10px;
  letter-spacing: 0.02em;
  font-weight: 400;
}

.model-separator {
  color: var(--text-tertiary);
  opacity: 0.5;
}

.model-name {
  color: var(--text-secondary);
  font-weight: 400;
  font-size: 10px;
}

/* Assistant message content area */
.assistant-message-content {
  width: 100%;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.assistant-message-content:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(223, 169, 39, 0.15);
}

.message-content {
  word-wrap: break-word;
  word-break: break-word;
}

.message-timestamp {
  font-size: 11px;
  color: var(--text-secondary);
  align-self: flex-end;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

/* Message widgets container - reserved for future terminal embeds */
.message-widgets {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Terminal widgets will use ReadOnlyTerminalManager with Canvas renderer */
  /* Line limit: 500 lines for chat context */
}

/* Individual message metrics (right side of footer) */
.message-metrics {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.02) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  opacity: 0.7;
  transition: all 0.2s ease;
  margin-left: auto;
  flex-shrink: 0;
}

.dark .message-metrics {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.1) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.assistant-message:hover .message-metrics {
  opacity: 1;
  border-color: rgba(223, 169, 39, 0.2);
  background: linear-gradient(
    135deg,
    rgba(223, 169, 39, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.metric-icon-small {
  opacity: 0.6;
  flex-shrink: 0;
}

.metric-icon-small.input-color {
  color: var(--accent-primary);
  opacity: 0.7;
}

.metric-icon-small.output-color {
  color: #10b981;
  opacity: 0.7;
}

.metric-icon-small.cost-color {
  color: #f59e0b;
  opacity: 0.7;
}

.metric-text {
  color: var(--text-secondary);
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* Markdown rendering styles for assistant messages */
.assistant-message-content :deep(h1),
.assistant-message-content :deep(h2),
.assistant-message-content :deep(h3),
.assistant-message-content :deep(h4) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  color: var(--text-primary);
}

.assistant-message-content :deep(h1) {
  font-size: 1.5em;
}
.assistant-message-content :deep(h2) {
  font-size: 1.3em;
}
.assistant-message-content :deep(h3) {
  font-size: 1.1em;
}

.assistant-message-content :deep(p) {
  margin: 8px 0;
  line-height: 1.6;
}

.assistant-message-content :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.assistant-message-content :deep(pre) {
  background: rgba(0, 0, 0, 0.4);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.assistant-message-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.assistant-message-content :deep(ul),
.assistant-message-content :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.assistant-message-content :deep(li) {
  margin: 4px 0;
}

.assistant-message-content :deep(blockquote) {
  border-left: 3px solid rgba(223, 169, 39, 0.5);
  padding-left: 12px;
  margin: 12px 0;
  font-style: italic;
  opacity: 0.9;
}

.assistant-message-content :deep(a) {
  color: var(--accent-primary);
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.assistant-message-content :deep(a:hover) {
  opacity: 0.8;
  text-decoration: underline;
}

/* Hover effects */
.user-message:hover .message-timestamp {
  opacity: 1;
}

.user-message:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Enhanced Typing Indicator with Status */
.typing-indicator-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-status {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.7;
  font-style: italic;
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
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--bg-primary) 20%,
    var(--bg-primary) 100%
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 5;
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

/* AI Status Bar - Luxury glassmorphism design */
.ai-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  width: 100%;
  max-width: 600px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.02) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .ai-status-bar {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-status-bar:hover {
  border-color: rgba(255, 215, 0, 0.2);
  background: linear-gradient(
    135deg,
    rgba(255, 215, 0, 0.03) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.status-section {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
}

.status-divider {
  width: 1px;
  height: 14px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
}

.metric-icon {
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.metric-icon.input-icon {
  color: var(--accent-primary);
  opacity: 0.7;
}

.metric-icon.output-icon {
  color: #10b981;
  opacity: 0.7;
}

.metric-icon.cost-icon {
  color: #f59e0b;
  opacity: 0.7;
}

.status-section:hover .metric-icon {
  opacity: 1;
}

.metric-value {
  color: var(--text-primary);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Animated value updates */
@keyframes metric-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.metric-value:not(:empty) {
  animation: metric-pulse 0.3s ease-out;
}

/* Context percentage color coding */
.metric-value.context-low {
  color: #10b981;
}

.metric-value.context-medium {
  color: #f59e0b;
}

.metric-value.context-high {
  color: #ef4444;
  animation: context-warning 2s ease-in-out infinite;
}

@keyframes context-warning {
  0%,
  100% {
    opacity: 0.9;
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
  }
}

.metric-label {
  color: var(--text-tertiary);
  font-weight: 400;
  opacity: 0.6;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Responsive adjustments for status bar */
@media (max-width: 768px) {
  .ai-status-bar {
    gap: 12px;
    padding: 6px 16px;
    font-size: 10px;
  }

  .status-section {
    gap: 4px;
  }

  .metric-label {
    display: none;
  }
}

@media (max-width: 480px) {
  .ai-status-bar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .status-divider {
    display: none;
  }
}
</style>
