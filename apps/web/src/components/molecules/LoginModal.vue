<!--
/**
 * @fileoverview Login modal component.
 *
 * @description
 * Modal for user authentication. Allows users to login with email/password
 * or OAuth providers (GitHub, Google).
 *
 * @example
 * <LoginModal
 *   :visible="showLogin"
 *   @close="showLogin = false"
 *   @login="handleLogin"
 * />
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->

<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <BaseIcon name="Shield" size="md" class="header-icon" />
          <h2 class="modal-title">Login</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Email/Password Form -->
        <div class="form-section">
          <div class="input-group">
            <label for="email" class="label">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="text-input"
              placeholder="your@email.com"
            />
          </div>

          <div class="input-group">
            <label for="password" class="label">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="text-input"
              placeholder="••••••••"
            />
          </div>

          <div class="checkbox-group">
            <label class="checkbox-label">
              <input v-model="rememberMe" type="checkbox" />
              <span>Remember me</span>
            </label>
          </div>
        </div>

        <!-- Divider -->
        <div class="divider">
          <span>or</span>
        </div>

        <!-- OAuth Providers -->
        <div class="oauth-section">
          <button class="oauth-button github" @click="handleOAuth('github')">
            <BaseIcon name="GitBranch" size="sm" />
            Continue with GitHub
          </button>
          <button class="oauth-button google" @click="handleOAuth('google')">
            <BaseIcon name="Globe" size="sm" />
            Continue with Google
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="forgot-password" @click="handleForgotPassword">
          Forgot password?
        </button>
        <BaseButton variant="primary" :disabled="!isValid" @click="handleLogin">
          <BaseIcon name="Shield" size="xs" />
          Login
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useNotifications } from '../../composables/useNotifications'

/**
 * Component props.
 *
 * @public
 */
interface Props {
  /** Controls visibility of the modal */
  visible: boolean
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /** Emitted when modal should close */
  (event: 'close'): void
  /** Emitted when login is successful */
  (
    event: 'login',
    data: {
      method: 'email' | 'oauth'
      provider?: string
      email?: string
      rememberMe?: boolean
    }
  ): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, error } = useNotifications()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)

/**
 * Check if form is valid.
 *
 * @private
 */
const isValid = computed(
  () => email.value.includes('@') && password.value.length >= 6
)

/**
 * Handle email/password login.
 *
 * @private
 */
const handleLogin = (): void => {
  if (!isValid.value) {
    error('Please enter valid credentials')
    return
  }

  emit('login', {
    method: 'email',
    email: email.value,
    rememberMe: rememberMe.value,
  })

  success('Login successful!')
  emit('close')
}

/**
 * Handle OAuth login.
 *
 * @param provider - OAuth provider (github, google)
 * @private
 */
const handleOAuth = (provider: string): void => {
  emit('login', {
    method: 'oauth',
    provider,
  })

  success(`Logging in with ${provider}...`)
  emit('close')
}

/**
 * Handle forgot password.
 *
 * @private
 */
const handleForgotPassword = (): void => {
  console.log('[Login] Forgot password clicked')
  success('Password reset email sent!')
}

/**
 * Handle clicks on modal overlay.
 *
 * @private
 */
const handleOverlayClick = (): void => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 450px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: var(--accent-primary);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background-color: var(--hover-bg-light);
  color: var(--text-primary);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.text-input {
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.text-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}

.divider {
  position: relative;
  text-align: center;
  margin: 8px 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--border-color);
}

.divider span {
  position: relative;
  display: inline-block;
  padding: 0 12px;
  background-color: var(--bg-primary);
  font-size: 12px;
  color: var(--text-secondary);
}

.oauth-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.oauth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.oauth-button.github {
  background-color: #24292e;
  color: white;
  border-color: #24292e;
}

.oauth-button.github:hover {
  background-color: #1a1e22;
}

.oauth-button.google {
  background-color: white;
  color: #333;
  border-color: #ddd;
}

.oauth-button.google:hover {
  background-color: #f5f5f5;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}

.forgot-password {
  background: transparent;
  border: none;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--accent-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.forgot-password:hover {
  text-decoration: underline;
}
</style>
