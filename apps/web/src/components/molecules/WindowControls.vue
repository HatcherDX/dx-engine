<template>
  <div
    v-if="showWindowControls"
    class="window-controls"
    :class="windowControlsClasses"
  >
    <!-- macOS: No custom controls, traffic lights are handled by OS -->
    <template v-if="platform !== 'macos'">
      <!-- Windows/Linux order: Minimize, Maximize, Close -->
      <WindowMinimizeButton @click="minimizeWindow" />
      <WindowMaximizeButton
        :is-maximized="isMaximized.value"
        @click="maximizeWindow"
      />
      <WindowCloseButton @click="closeWindow" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme'
import { useWindowControls } from '../../composables/useWindowControls'
import WindowMinimizeButton from '../atoms/WindowMinimizeButton.vue'
import WindowMaximizeButton from '../atoms/WindowMaximizeButton.vue'
import WindowCloseButton from '../atoms/WindowCloseButton.vue'

interface Props {
  variant?: 'default' | 'compact'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const { platform } = useTheme()
const { isMaximized, minimizeWindow, maximizeWindow, closeWindow, isElectron } =
  useWindowControls()

const showWindowControls = computed(() => {
  // Only show custom controls on Windows/Linux in Electron
  return isElectron && platform.value !== 'macos'
})

const windowControlsClasses = computed(() => {
  const base = ['window-controls']

  // Platform-specific classes
  base.push(`platform-${platform.value}`)

  // Variant classes
  base.push(`variant-${props.variant}`)

  return base
})
</script>

<style scoped>
.window-controls {
  display: flex;
  align-items: center;
  gap: 0;
  height: 100%;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

/* Platform specific positioning */
.platform-windows .window-controls {
  margin-left: auto;
}

.platform-linux .window-controls {
  margin-left: auto;
  gap: 4px;
}

/* Variant adjustments */
.variant-compact .window-controls {
  gap: 2px;
}

/* Hide on macOS as traffic lights are handled by OS */
.platform-macos .window-controls {
  display: none;
}
</style>
