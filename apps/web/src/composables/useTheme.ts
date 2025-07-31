import { ref, computed, watchEffect } from 'vue'
import { usePreferredDark, useStorage } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'auto'

// Global theme state
const themeMode = useStorage<ThemeMode>('theme-mode', 'auto')
const preferredDark = usePreferredDark()

// Computed current theme
const isDark = computed(() => {
  if (themeMode.value === 'auto') {
    return preferredDark.value
  }
  return themeMode.value === 'dark'
})

// Apply theme to document
watchEffect(() => {
  const html = document.documentElement
  if (isDark.value) {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
})

// Platform detection
const platform = ref<'macos' | 'windows' | 'linux'>('linux')

// Detect platform on initialization
if (typeof window !== 'undefined') {
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (userAgent.includes('mac')) {
    platform.value = 'macos'
  } else if (userAgent.includes('win')) {
    platform.value = 'windows'
  }

  // Apply platform class to document
  document.documentElement.classList.add(`platform-${platform.value}`)

  // Listen for platform simulation events from Electron menu
  if (window.electronAPI?.on) {
    window.electronAPI.on(
      'simulate-platform',
      (newPlatform: 'macos' | 'windows' | 'linux') => {
        console.log('Platform simulation received:', newPlatform)
        // Remove old platform class
        document.documentElement.classList.remove(`platform-${platform.value}`)
        // Set new platform
        platform.value = newPlatform
        // Add new platform class
        document.documentElement.classList.add(`platform-${platform.value}`)
      }
    )
  }
}

export function useTheme() {
  const setTheme = (mode: ThemeMode) => {
    themeMode.value = mode
  }

  const toggleTheme = () => {
    if (themeMode.value === 'auto') {
      setTheme(preferredDark.value ? 'light' : 'dark')
    } else {
      setTheme(themeMode.value === 'light' ? 'dark' : 'light')
    }
  }

  // Mock platform function for testing
  const setPlatform = (newPlatform: 'macos' | 'windows' | 'linux') => {
    // Remove old platform class
    document.documentElement.classList.remove(`platform-${platform.value}`)
    // Set new platform
    platform.value = newPlatform
    // Add new platform class
    document.documentElement.classList.add(`platform-${platform.value}`)
  }

  // Electron theme synchronization
  const syncThemeWithElectron = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.setTheme) {
      window.electronAPI.setTheme(themeMode.value)
    }
  }

  // Watch for theme changes and sync with Electron
  watchEffect(() => {
    syncThemeWithElectron()
  })

  return {
    themeMode: computed(() => themeMode.value),
    isDark: computed(() => isDark.value),
    platform: computed(() => platform.value),
    setTheme,
    toggleTheme,
    syncThemeWithElectron,
    setPlatform, // Mock function for testing
  }
}
