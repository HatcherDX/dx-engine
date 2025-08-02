<template>
  <div
    class="task-card"
    :class="{
      'task-selected': isSelected,
      'task-clickable': !isSelected,
    }"
    role="button"
    tabindex="0"
    @click="handleSelect"
    @keydown.enter="handleSelect"
    @keydown.space="handleSelect"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <div class="card-header">
      <div class="task-emoji">
        {{ task.title.split(' ')[0] }}
      </div>
    </div>

    <div class="card-content">
      <h3 class="task-title">{{ task.title.substring(2).trim() }}</h3>
      <p class="task-description">{{ task.description }}</p>
    </div>

    <div class="card-arrow">
      <BaseIcon name="ArrowRight" size="sm" class="arrow-icon" />
    </div>

    <!-- Tooltip -->
    <div v-if="showTooltip" class="tooltip">
      <div class="tooltip-content">
        <p class="tooltip-details">{{ task.tooltipDetails }}</p>
        <p class="tooltip-example">
          <strong>EXAMPLE:</strong> "{{ task.example }}"
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OnboardingTaskOption } from '../../composables/useOnboarding'
import BaseIcon from '../atoms/BaseIcon.vue'

interface Props {
  task: OnboardingTaskOption
  isSelected?: boolean
}

interface Emits {
  select: [taskId: OnboardingTaskOption['id']]
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
})

const emit = defineEmits<Emits>()
const showTooltip = ref(false)

const handleSelect = (): void => {
  emit('select', props.task.id)
}
</script>

<style scoped>
.task-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  padding: 12px 16px;
  transition: all var(--transition-fast);
  position: relative;
  height: 100px;
  width: 100%;
  outline: none;
  cursor: pointer;
}

.task-card:hover {
  background-color: var(--hover-bg-light);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 10000;
}

.dark .task-card:hover {
  background-color: var(--hover-bg-dark);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.task-card:focus-visible {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.2);
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
  width: 48px;
  height: 100%;
}

.task-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 28px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}

.card-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  flex-shrink: 0;
  height: 100%;
}

.arrow-icon {
  color: var(--text-tertiary);
  opacity: 0.6;
  transition: all var(--transition-fast);
}

.task-card:hover .arrow-icon {
  opacity: 1;
  color: var(--accent-primary);
  transform: translateX(4px);
}

.task-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.3;
}

.task-description {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.3;
}

.task-card:hover .task-emoji {
  transform: scale(1.1);
}

/* Tooltip Styles */
.tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 99999;
  animation: tooltip-fade-in 0.2s ease-out;
  pointer-events: none;
}

.tooltip-content {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
}

.dark .tooltip-content {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.tooltip-details {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 12px;
}

.tooltip-example {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.4;
  margin: 0;
}

.tooltip-example strong {
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.05em;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .task-card {
    flex-direction: column;
    padding: 20px;
    min-height: 200px;
    margin: 0;
    width: 100%;
  }

  .card-header {
    flex-direction: row;
    justify-content: space-between;
    margin-right: 0;
    margin-bottom: 16px;
    width: 100%;
  }

  .task-icon {
    width: 40px;
    height: 40px;
    margin-bottom: 0;
  }

  .task-title {
    font-size: 18px;
  }

  .task-example {
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .task-card {
    padding: 16px;
    min-height: 180px;
  }

  .task-title {
    font-size: 16px;
  }

  .task-description {
    font-size: 13px;
  }

  .example-text {
    font-size: 12px;
  }
}
</style>
