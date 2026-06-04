<template>
  <div class="onboarding-welcome">
    <div class="welcome-container">
      <div class="welcome-content">
        <!-- Logo Section -->
        <div class="logo-section">
          <BaseLogo size="lg" variant="egg-white" class="welcome-logo" />
        </div>

        <!-- Welcome Text -->
        <div class="text-section">
          <h1 class="greeting-text">
            <span class="greeting-hello">Hello, </span>
            <span class="greeting-hatcher"><b>Hatcher</b></span>
          </h1>
          <p class="welcome-subtitle">The IDE for Controlled Amplification.</p>
          <p class="welcome-description">
            Hatcher is built on a simple pact: to amplify your expertise, not
            replace it. We provide powerful AI tools with deterministic control,
            in a private, local-first environment that respects your work. This
            is your space to eliminate guesswork and focus on solving hard
            problems.
          </p>
        </div>

        <!-- Action Section -->
        <div class="action-section">
          <CtaButton
            :class="{ 'press-active': isPressActive }"
            @click="handleGetStarted"
          >
            Get Started
          </CtaButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import BaseLogo from '../atoms/BaseLogo.vue'
import CtaButton from '../atoms/CtaButton.vue'

const { nextStep } = useOnboarding()
const isPressActive = ref(false)

const handleGetStarted = (): void => {
  // Terminal deactivation is now handled automatically by TerminalEasterEgg
  // when clicking any interactive element
  nextStep()
}

// Note: Keyboard handling for 'h' key is now managed by Electron main process
// The hover effect will be triggered via IPC when terminal is activated

const handleHKey = (): void => {
  console.log(
    '[OnboardingWelcome] Activating press effect for Get Started button'
  )
  isPressActive.value = true
  setTimeout(() => {
    isPressActive.value = false
    console.log(
      '[OnboardingWelcome] Removing press effect from Get Started button'
    )
  }, 400) // More visible press effect
}

onMounted(() => {
  console.log('[OnboardingWelcome] Component mounted')
  // Terminal easter egg is now handled entirely by useTerminalEasterEgg composable
  // Listen for the custom event when 'h' is pressed in terminal
  const handleTerminalH = () => {
    handleHKey()
  }

  window.addEventListener('terminal-welcome-h', handleTerminalH)

  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('terminal-welcome-h', handleTerminalH)
  })
})
</script>

<style scoped>
.onboarding-welcome {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.welcome-container {
  max-width: 600px;
  width: 100%;
  text-align: center;
  animation: fade-in-up 0.8s ease-out;
}

.welcome-content {
  background-color: transparent;
  border-radius: 16px;
  padding: 48px 40px;
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
}

.logo-section {
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome-logo {
  height: 120px !important;
  width: auto !important;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

.dark .welcome-logo {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
}

.text-section {
  margin-bottom: 20px;
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

.welcome-subtitle {
  font-size: 20px;
  margin-bottom: 24px;
  font-weight: 500;
}

.welcome-description {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 510px;
  margin: 0 auto;
}

.action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* Press effect activation for CtaButton when 'h' is pressed */
:deep(.cta-button.press-active:not(:disabled)) {
  background: var(--accent-primary-hover) !important;
  border-color: var(--accent-primary-hover) !important;
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 8px 25px rgba(223, 169, 39, 0.6);
  transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

:deep(.cta-button.press-active::before) {
  left: 100%;
}

/* Animations */
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
  .welcome-content {
    padding: 32px 24px;
  }

  .welcome-title {
    font-size: 28px;
  }

  .welcome-subtitle {
    font-size: 18px;
  }

  .welcome-description {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .welcome-content {
    padding: 24px 20px;
  }

  .welcome-title {
    font-size: 24px;
  }

  .welcome-subtitle {
    font-size: 16px;
  }

  .welcome-logo {
    height: 96px !important;
  }
}
</style>
