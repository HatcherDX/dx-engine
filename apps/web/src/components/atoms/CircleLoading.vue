<template>
  <div class="circle-loading" :class="[`circle-loading--${size}`]">
    <div class="circle-loading__spinner">
      <svg
        class="circle-loading__svg"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          class="circle-loading__track"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke-width="4"
        />
        <circle
          class="circle-loading__progress"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke-width="4"
        />
      </svg>
      <div v-if="showEgg" class="circle-loading__icon">
        <BaseIcon :name="icon" :size="iconSize" />
      </div>
    </div>
    <p v-if="text" class="circle-loading__text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'

/**
 * Props for the CircleLoading component.
 *
 * @interface Props
 * @public
 */
interface Props {
  /** Size of the loading spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Optional text to display below the spinner */
  text?: string
  /** Icon to show in the center (defaults to Egg for large size) */
  icon?: string
  /** Whether to show the icon */
  showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  text: '',
  icon: 'Egg',
  showIcon: true,
})

// Computed properties
const showEgg = computed(() => props.showIcon && props.size === 'lg')
const iconSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'xs'
    case 'lg':
      return 'lg'
    default:
      return 'sm'
  }
})
</script>

<style scoped>
.circle-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.circle-loading__spinner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-loading__svg {
  animation: rotate 2s linear infinite;
}

/* Size variants */
.circle-loading--sm .circle-loading__svg {
  width: 24px;
  height: 24px;
}

.circle-loading--md .circle-loading__svg {
  width: 40px;
  height: 40px;
}

.circle-loading--lg .circle-loading__svg {
  width: 64px;
  height: 64px;
}

/* Track (background circle) */
.circle-loading__track {
  stroke: var(--bg-tertiary);
}

/* Progress (animated circle) */
.circle-loading__progress {
  stroke: var(--accent-primary);
  stroke-linecap: round;
  stroke-dasharray: 80 45;
  transform-origin: center;
  animation: dash 1.5s ease-in-out infinite;
}

/* Icon in center (only for large size) */
.circle-loading__icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--accent-primary);
  animation: pulse 2s ease-in-out infinite;
}

/* Text below spinner */
.circle-loading__text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
}

.circle-loading--lg .circle-loading__text {
  font-size: 16px;
  font-weight: 500;
}

/* Animations */
@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1 125;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 80 45;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 80 45;
    stroke-dashoffset: -124;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.8;
  }
}

/* Premium gradient effect for large size */
.circle-loading--lg .circle-loading__progress {
  stroke: url(#gradient-accent);
}

/* Add gradient definition in parent component or globally */
</style>
