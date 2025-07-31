import { ref, computed } from 'vue'
import type { ThemeMode } from '../composables/useTheme'

// Global theme store using Vue 3 Composition API
export const themeStore = (() => {
  // State
  const currentMode = ref<ThemeMode>('auto')
  const isInitialized = ref(false)

  // Getters
  const mode = computed(() => currentMode.value)
  const initialized = computed(() => isInitialized.value)

  // Actions
  const setMode = (newMode: ThemeMode) => {
    currentMode.value = newMode
    localStorage.setItem('theme-mode', newMode)
  }

  const initialize = () => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      currentMode.value = saved
    }
    isInitialized.value = true
  }

  const reset = () => {
    currentMode.value = 'auto'
    isInitialized.value = false
    localStorage.removeItem('theme-mode')
  }

  return {
    // State
    mode,
    initialized,

    // Actions
    setMode,
    initialize,
    reset,
  }
})()

export type ThemeStore = typeof themeStore
