<!--
/**
 * @fileoverview Logout confirmation modal.
 *
 * @description
 * Modal for user logout confirmation. Displays user info and asks
 * for confirmation before logging out.
 *
 * @example
 * <LogoutModal
 *   :visible="showLogout"
 *   @close="showLogout = false"
 *   @logout="handleLogout"
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
          <h2 class="modal-title">Logout</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- User Info -->
        <div class="user-info">
          <div class="avatar">{{ initials }}</div>
          <div class="user-details">
            <div class="user-name">{{ userName }}</div>
            <div class="user-email">{{ userEmail }}</div>
          </div>
        </div>

        <!-- Confirmation Message -->
        <div class="confirmation-message">
          <p>Are you sure you want to logout?</p>
          <p class="warning">Any unsaved changes will be preserved locally.</p>
        </div>

        <!-- Options -->
        <div class="options">
          <label class="checkbox-label">
            <input v-model="clearLocalData" type="checkbox" />
            <span>Clear local data</span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" @click="handleLogout">
          <BaseIcon name="Shield" size="xs" />
          Logout
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
  /** Emitted when logout is confirmed */
  (event: 'logout', data: { clearLocalData: boolean }): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success } = useNotifications()

const userName = ref('John Doe')
const userEmail = ref('john.doe@example.com')
const clearLocalData = ref(false)

/**
 * Get user initials for avatar.
 *
 * @private
 */
const initials = computed(() => {
  const names = userName.value.split(' ')
  return names.map((n) => n[0]).join('')
})

/**
 * Handle logout confirmation.
 *
 * @private
 */
const handleLogout = (): void => {
  emit('logout', {
    clearLocalData: clearLocalData.value,
  })

  success('Logged out successfully')
  emit('close')
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
  gap: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-email {
  font-size: 13px;
  color: var(--text-secondary);
}

.confirmation-message {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.confirmation-message p {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.confirmation-message .warning {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 12px;
  background-color: rgba(234, 179, 8, 0.1);
  border-left: 3px solid #eab308;
  border-radius: 4px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
