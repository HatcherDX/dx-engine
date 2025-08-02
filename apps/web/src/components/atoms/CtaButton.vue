<template>
  <BaseButton
    variant="primary"
    size="md"
    class="cta-button"
    :class="{ 'cta-button-active': true }"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
    <BaseIcon name="ArrowRight" size="sm" />
  </BaseButton>
</template>

<script setup lang="ts">
import BaseButton from './BaseButton.vue'
import BaseIcon from './BaseIcon.vue'

interface Props {
  disabled?: boolean
}

interface Emits {
  click: [event: MouseEvent]
}

withDefaults(defineProps<Props>(), {
  disabled: false,
})

defineEmits<Emits>()
</script>

<style scoped>
.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
  color: white !important;
  background-color: var(--accent-primary) !important;
  border: 1px solid var(--accent-primary) !important;
  min-width: 200px;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(var(--accent-primary-rgb), 0.3);
}

.cta-button:hover:not(:disabled) {
  background: var(--accent-secondary) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(var(--accent-primary-rgb), 0.4);
}

.cta-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cta-button-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.cta-button-active:hover:not(:disabled)::before {
  left: 100%;
}

/* Responsive Design */
@media (max-width: 768px) {
  .cta-button {
    padding: 14px 24px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .cta-button {
    min-width: 100%;
  }
}
</style>
