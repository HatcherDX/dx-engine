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
          <h1 class="welcome-title">Welcome to Hatcher</h1>
          <p class="welcome-subtitle">The IDE for Controlled Amplification.</p>
          <p class="welcome-description">
            Hatcher is a new kind of IDE that gives you deterministic control
            over AI. Instead of just describing changes in text, you'll use our
            Visual-to-Code bridge to point, click, and transform your intent
            into precise code, eliminating the guesswork.
          </p>
        </div>

        <!-- Action Section -->
        <div class="action-section">
          <CtaButton @click="handleGetStarted"> Get Started </CtaButton>

          <!-- Don't show again checkbox -->
          <div class="checkbox-section">
            <label class="checkbox-label">
              <input
                v-model="dontShowAgain"
                type="checkbox"
                class="checkbox-input"
              />
              <span class="checkbox-text"
                >Don't show this welcome tutorial again</span
              >
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useOnboarding } from '../../composables/useOnboarding'
import BaseLogo from '../atoms/BaseLogo.vue'
import CtaButton from '../atoms/CtaButton.vue'

const { nextStep, setShowWelcomeTutorial } = useOnboarding()

const dontShowAgain = ref(false)

const handleGetStarted = (): void => {
  if (dontShowAgain.value) {
    setShowWelcomeTutorial(false)
  }
  nextStep()
}
</script>

<style scoped>
.onboarding-welcome {
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

.welcome-container {
  max-width: 600px;
  width: 100%;
  text-align: center;
  animation: fade-in-up 0.8s ease-out;
}

.welcome-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  height: 580px;
  padding-bottom: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.dark .welcome-content {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.logo-section {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome-logo {
  height: 80px !important;
  width: auto !important;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

.dark .welcome-logo {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
}

.text-section {
  margin-bottom: 40px;
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.welcome-subtitle {
  font-size: 20px;
  color: var(--accent-primary);
  margin-bottom: 24px;
  font-weight: 500;
}

.welcome-description {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 480px;
  margin: 0 auto;
}

.action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.checkbox-section {
  margin: 20px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  user-select: none;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-secondary);
  border-radius: 3px;
  background-color: var(--bg-primary);
  cursor: pointer;
  position: relative;
  margin: 0;
  appearance: none;
  transition: all var(--transition-fast);
}

.checkbox-input:checked {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.checkbox-input:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.checkbox-input:hover {
  border-color: var(--accent-primary);
}

.checkbox-text {
  flex: 1;
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
  .onboarding-welcome {
    padding: 16px;
  }

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
    height: 64px !important;
  }
}
</style>
