<template>
  <div class="onboarding-transition">
    <div class="transition-container">
      <div class="transition-content">
        <!-- Loading Animation -->
        <div class="loading-section">
          <div class="loading-animation">
            <div class="loading-ring">
              <div class="ring-segment"></div>
              <div class="ring-segment"></div>
              <div class="ring-segment"></div>
            </div>
            <BaseLogo size="md" variant="egg-white" class="loading-logo" />
          </div>
        </div>

        <!-- Text Content -->
        <div class="text-section">
          <h1 class="transition-title">Preparing Your Experience</h1>
          <p class="transition-subtitle">
            Setting up Hatcher for your {{ taskDisplayName }} journey
          </p>

          <!-- Selected Task Summary -->
          <div v-if="selectedTaskData" class="task-summary">
            <div class="task-summary-header">
              <BaseIcon :name="selectedTaskData.icon" size="md" />
              <span class="task-name">{{ selectedTaskData.title }}</span>
            </div>
            <p class="task-context">{{ contextMessage }}</p>
          </div>

          <!-- Progress Messages -->
          <div class="progress-messages">
            <div
              v-for="(message, index) in progressMessages"
              :key="index"
              class="progress-message"
              :class="{
                'message-active': currentMessageIndex >= index,
                'message-completed': currentMessageIndex > index,
              }"
            >
              <BaseIcon
                :name="currentMessageIndex > index ? 'Eye' : 'Circle'"
                size="xs"
                class="message-icon"
              />
              <span>{{ message }}</span>
            </div>
          </div>
        </div>

        <!-- Skip Button -->
        <div class="skip-section">
          <BaseButton
            variant="ghost"
            size="sm"
            class="skip-button"
            @click="handleComplete"
          >
            Skip animation
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import BaseLogo from '../atoms/BaseLogo.vue'
import BaseButton from '../atoms/BaseButton.vue'
import BaseIcon from '../atoms/BaseIcon.vue'

const { getSelectedTask, completeOnboarding } = useOnboarding()

const currentMessageIndex = ref(0)
let progressInterval: ReturnType<typeof setInterval> | null = null

const selectedTaskData = computed(() => getSelectedTask.value)

const taskDisplayName = computed(() => {
  switch (selectedTaskData.value?.id) {
    case 'create-feature':
      return 'feature creation'
    case 'fix-bug':
      return 'bug fixing'
    case 'improve-documentation':
      return 'documentation'
    case 'perform-maintenance':
      return 'maintenance'
    case 'refactor-code':
      return 'refactoring'
    default:
      return 'development'
  }
})

const contextMessage = computed(() => {
  switch (selectedTaskData.value?.id) {
    case 'create-feature':
      return 'Hatcher will help you build new features with AI assistance, from design to implementation and testing.'
    case 'fix-bug':
      return 'Hatcher will help you identify, debug, and resolve issues in your codebase efficiently.'
    case 'improve-documentation':
      return 'Hatcher will help you create comprehensive documentation, from README files to detailed API references.'
    case 'perform-maintenance':
      return 'Hatcher will help you maintain your project by updating dependencies, optimizing configurations, and ensuring project health.'
    case 'refactor-code':
      return 'Hatcher will help you improve your code structure, optimize performance, and enhance maintainability.'
    default:
      return 'Hatcher will adapt to your development needs and provide intelligent assistance.'
  }
})

const progressMessages = [
  'Initializing AI engine...',
  'Loading development context...',
  'Preparing your workspace...',
  'Almost ready!',
]

const handleComplete = (): void => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
  completeOnboarding()
}

onMounted(() => {
  // Start progress animation
  progressInterval = setInterval(() => {
    if (currentMessageIndex.value < progressMessages.length - 1) {
      currentMessageIndex.value++
    } else {
      // Auto-complete after all messages are shown
      setTimeout(() => {
        handleComplete()
      }, 1500)
    }
  }, 1000)
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})
</script>

<style scoped>
.onboarding-transition {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 100%
  );
  padding: 24px;
}

.transition-container {
  max-width: 500px;
  width: 100%;
  text-align: center;
  animation: fade-in-up 0.8s ease-out;
}

.transition-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.dark .transition-content {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.loading-section {
  margin-bottom: 32px;
}

.loading-animation {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}

.loading-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  animation: spin 2s linear infinite;
}

.ring-segment {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid transparent;
}

.ring-segment:nth-child(1) {
  border-top-color: var(--accent-primary);
  animation-delay: 0s;
}

.ring-segment:nth-child(2) {
  border-right-color: var(--accent-primary);
  animation-delay: 0.3s;
  opacity: 0.7;
}

.ring-segment:nth-child(3) {
  border-bottom-color: var(--accent-primary);
  animation-delay: 0.6s;
  opacity: 0.4;
}

.loading-logo {
  z-index: 2;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
}

.dark .loading-logo {
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.text-section {
  margin-bottom: 32px;
}

.transition-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.transition-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.task-summary {
  background-color: var(--bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border-left: 4px solid var(--accent-primary);
}

.task-summary-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--accent-primary);
}

.task-name {
  font-size: 18px;
  font-weight: 600;
}

.task-context {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.progress-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.progress-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  opacity: 0.5;
}

.message-active {
  color: var(--text-secondary);
  opacity: 1;
}

.message-completed {
  color: var(--text-primary);
  opacity: 1;
}

.message-icon {
  flex-shrink: 0;
  color: var(--border-secondary);
  transition: color var(--transition-fast);
}

.message-active .message-icon {
  color: var(--accent-primary);
}

.message-completed .message-icon {
  color: var(--accent-primary);
}

.skip-section {
  padding-top: 20px;
  border-top: 1px solid var(--border-primary);
}

.skip-button {
  color: var(--text-tertiary);
  font-size: 13px;
}

.skip-button:hover {
  color: var(--text-secondary);
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .onboarding-transition {
    padding: 16px;
  }

  .transition-content {
    padding: 32px 24px;
  }

  .transition-title {
    font-size: 22px;
  }

  .transition-subtitle {
    font-size: 15px;
  }

  .loading-animation {
    width: 64px;
    height: 64px;
  }

  .loading-ring {
    width: 64px;
    height: 64px;
  }

  .task-summary {
    padding: 16px;
  }

  .task-name {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .transition-content {
    padding: 24px 20px;
  }

  .transition-title {
    font-size: 20px;
  }

  .loading-animation {
    width: 56px;
    height: 56px;
  }

  .loading-ring {
    width: 56px;
    height: 56px;
  }

  .task-summary-header {
    flex-direction: column;
    gap: 8px;
  }

  .progress-message {
    font-size: 13px;
  }
}
</style>
