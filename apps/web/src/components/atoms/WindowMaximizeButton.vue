<template>
  <button
    class="window-control-button maximize-button"
    :aria-label="isMaximized ? 'Restore window' : 'Maximize window'"
    :disabled="disabled"
    @click="handleClick"
  >
    <!-- Maximize icon -->
    <svg
      v-if="!isMaximized"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1"
        y="1"
        width="10"
        height="10"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
    </svg>

    <!-- Restore icon -->
    <svg
      v-else
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="1"
        width="8"
        height="8"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
      <rect
        x="1"
        y="3"
        width="8"
        height="8"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
interface Props {
  disabled?: boolean
  isMaximized?: boolean
}

interface Emits {
  click: []
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  isMaximized: false,
})

const emit = defineEmits<Emits>()

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}
</script>

<style scoped>
.window-control-button {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.window-control-button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.window-control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.window-control-button:disabled:hover {
  background-color: transparent;
  color: var(--text-secondary);
}

/* Windows specific styling */
.platform-windows .window-control-button {
  width: 46px;
  height: 32px;
  border-radius: 0;
}

/* Linux specific styling */
.platform-linux .window-control-button {
  width: 30px;
  height: 30px;
  border-radius: 4px;
}
</style>
