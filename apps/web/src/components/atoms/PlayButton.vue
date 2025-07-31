<template>
  <button
    class="play-button"
    :class="{ 'is-playing': isPlaying }"
    :aria-label="isPlaying ? 'Stop' : 'Play'"
    :title="isPlaying ? 'Stop execution' : 'Start execution'"
    @click="handleClick"
  >
    <BaseIcon :name="isPlaying ? 'Square' : 'Play'" size="sm" />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from './BaseIcon.vue'

interface Props {
  disabled?: boolean
}

interface Emits {
  play: []
  stop: []
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<Emits>()

const isPlaying = ref(false)

const handleClick = () => {
  if (props.disabled) return

  if (isPlaying.value) {
    isPlaying.value = false
    emit('stop')
  } else {
    isPlaying.value = true
    emit('play')
  }
}
</script>

<style scoped>
.play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 0;
  background-color: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  /* Disable drag for interactive button */
  -webkit-app-region: no-drag;
}

.play-button:hover {
  background-color: var(--hover-bg-light);
}

.dark .play-button:hover {
  background-color: var(--hover-bg-dark);
}

.play-button:active {
  transform: translateY(0);
}

.play-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.play-button:disabled:hover {
  background-color: transparent;
  transform: none;
  box-shadow: none;
}

.play-button.is-playing {
  background-color: transparent;
  color: #ef4444;
}

.play-button.is-playing:hover {
  background-color: var(--hover-bg-light);
  color: #ef4444;
}

.dark .play-button.is-playing:hover {
  background-color: var(--hover-bg-dark);
}

/* Focus styles */
.play-button:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
</style>
