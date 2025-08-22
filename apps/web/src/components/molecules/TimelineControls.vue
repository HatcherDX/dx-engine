<template>
  <div class="timeline-controls">
    <div class="timeline-info">
      <span class="timeline-position">
        {{ currentPosition + 1 }} / {{ totalCommits }}
      </span>
      <span class="timeline-commit">
        {{ currentCommit?.shortHash }} - {{ currentCommit?.message }}
      </span>
    </div>

    <div class="timeline-actions">
      <!-- Step Controls -->
      <div class="step-controls">
        <BaseButton
          variant="ghost"
          size="sm"
          class="step-button"
          :disabled="!canStepBackward"
          @click="stepBackward"
        >
          <BaseIcon name="ArrowRight" size="xs" class="rotate-180" />
        </BaseButton>

        <BaseButton
          variant="ghost"
          size="sm"
          class="step-button"
          :disabled="!canStepForward"
          @click="stepForward"
        >
          <BaseIcon name="ArrowRight" size="xs" />
        </BaseButton>
      </div>

      <!-- Playback Controls -->
      <div class="playback-controls">
        <BaseButton
          variant="ghost"
          size="sm"
          class="play-button"
          :class="{ playing: isPlaying }"
          @click="togglePlayback"
        >
          <BaseIcon :name="isPlaying ? 'Square' : 'Play'" size="sm" />
        </BaseButton>

        <div class="speed-control">
          <span class="speed-label">{{ playbackSpeed }}x</span>
          <input
            v-model.number="playbackSpeed"
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            class="speed-slider"
            @input="updatePlaybackSpeed"
          />
        </div>
      </div>

      <!-- Timeline Scrubber -->
      <div class="timeline-scrubber">
        <input
          v-model.number="scrubberPosition"
          type="range"
          min="0"
          :max="totalCommits - 1"
          step="1"
          class="timeline-slider"
          @input="handleScrubberChange"
          @mousedown="pausePlayback"
          @mouseup="resumePlayback"
        />
        <div class="timeline-track">
          <div
            class="timeline-progress"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import type { GitCommitData, TimelineState } from '@hatcherdx/shared-rendering'

/**
 * Properties for timeline controls component.
 *
 * @public
 */
interface Props {
  /** Array of commit data */
  commits?: GitCommitData[]
  /** Current timeline state */
  timelineState?: TimelineState
  /** Whether playback is enabled */
  enablePlayback?: boolean
}

/**
 * Events emitted by timeline controls.
 *
 * @public
 */
interface Emits {
  /** Step timeline in direction */
  step: [direction: 'forward' | 'backward']
  /** Start timeline playback */
  play: [speed: number, direction: 'forward' | 'backward']
  /** Stop timeline playback */
  stop: []
  /** Seek to specific commit */
  seek: [commitIndex: number]
  /** Speed changed */
  speedChanged: [speed: number]
}

const props = withDefaults(defineProps<Props>(), {
  commits: () => [],
  timelineState: () => ({
    currentCommit: 0,
    totalCommits: 0,
    isPlaying: false,
    speed: 1,
    direction: 'forward' as const,
  }),
  enablePlayback: true,
})

const emit = defineEmits<Emits>()

// State
const playbackSpeed = ref(props.timelineState.speed)
const scrubberPosition = ref(props.timelineState.currentCommit)
const wasPlayingBeforeScrub = ref(false)

// Computed properties
const currentPosition = computed(() => props.timelineState.currentCommit)
const totalCommits = computed(() => props.timelineState.totalCommits)
const isPlaying = computed(() => props.timelineState.isPlaying)

const currentCommit = computed(() => {
  return props.commits[currentPosition.value]
})

const canStepBackward = computed(() => {
  return currentPosition.value > 0
})

const canStepForward = computed(() => {
  return currentPosition.value < totalCommits.value - 1
})

const progressPercentage = computed(() => {
  if (totalCommits.value === 0) return 0
  return (currentPosition.value / (totalCommits.value - 1)) * 100
})

/**
 * Step timeline backward.
 *
 * @private
 */
const stepBackward = (): void => {
  emit('step', 'backward')
}

/**
 * Step timeline forward.
 *
 * @private
 */
const stepForward = (): void => {
  emit('step', 'forward')
}

/**
 * Toggle timeline playback.
 *
 * @private
 */
const togglePlayback = (): void => {
  if (isPlaying.value) {
    emit('stop')
  } else {
    emit('play', playbackSpeed.value, 'forward')
  }
}

/**
 * Update playback speed.
 *
 * @private
 */
const updatePlaybackSpeed = (): void => {
  emit('speedChanged', playbackSpeed.value)
}

/**
 * Handle timeline scrubber changes.
 *
 * @private
 */
const handleScrubberChange = (): void => {
  emit('seek', scrubberPosition.value)
}

/**
 * Pause playback when user starts scrubbing.
 *
 * @private
 */
const pausePlayback = (): void => {
  wasPlayingBeforeScrub.value = isPlaying.value
  if (isPlaying.value) {
    emit('stop')
  }
}

/**
 * Resume playback when user stops scrubbing.
 *
 * @private
 */
const resumePlayback = (): void => {
  if (wasPlayingBeforeScrub.value) {
    emit('play', playbackSpeed.value, 'forward')
  }
}

// Sync timeline state with local state
watch(
  () => props.timelineState.currentCommit,
  (newPosition) => {
    scrubberPosition.value = newPosition
  }
)

watch(
  () => props.timelineState.speed,
  (newSpeed) => {
    playbackSpeed.value = newSpeed
  }
)
</script>

<style scoped>
.timeline-controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  box-sizing: border-box;
}

.timeline-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.timeline-position {
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 60px;
}

.timeline-commit {
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.step-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.step-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.play-button {
  width: 40px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.play-button.playing {
  background: var(--accent-primary);
  color: white;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.speed-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 25px;
  text-align: right;
}

.speed-slider {
  width: 60px;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.speed-slider::-webkit-slider-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent-primary);
  border-radius: 50%;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition: transform var(--transition-fast);
}

.speed-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.timeline-scrubber {
  flex: 1;
  position: relative;
}

.timeline-slider {
  width: 100%;
  height: 6px;
  background: transparent;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  z-index: 1;
}

.timeline-slider::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent-primary);
  border-radius: 50%;
  cursor: grab;
  -webkit-appearance: none;
  appearance: none;
  transition: transform var(--transition-fast);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.timeline-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.timeline-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.1);
}

.timeline-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  transform: translateY(-50%);
  pointer-events: none;
}

.timeline-progress {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-primary),
    var(--accent-secondary)
  );
  border-radius: 3px;
  transition: width var(--transition-medium);
}

.rotate-180 {
  transform: rotate(180deg);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .timeline-controls {
    padding: 12px;
    gap: 10px;
  }

  .timeline-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .timeline-commit {
    font-size: 11px;
  }

  .timeline-actions {
    gap: 12px;
  }

  .speed-control {
    display: none; /* Hide on mobile for space */
  }

  .commit-info {
    gap: 6px;
  }

  .commit-message {
    max-width: 120px;
  }
}
</style>
