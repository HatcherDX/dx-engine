<template>
  <button
    class="window-control-button minimize-button"
    aria-label="Minimize window"
    :disabled="disabled"
    @click="handleClick"
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="1"
        y1="6"
        x2="11"
        y2="6"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
interface Props {
  disabled?: boolean
}

interface Emits {
  click: []
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
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
