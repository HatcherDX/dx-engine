import { ref, computed, watchEffect, onMounted } from 'vue'
import { usePreferredDark } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'auto'

// Global theme state (now using ref instead of useStorage)
const themeMode = ref<ThemeMode>('auto')
const preferredDark = usePreferredDark()
const isInitialized = ref(false)

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
  const appPlatform = window.navigator.platform?.toLowerCase() || ''

  console.log('[useTheme] Platform detection:', {
    userAgent,
    platform: window.navigator.platform,
    appPlatform,
  })

  // Check both userAgent and platform for better detection
  if (
    userAgent.includes('mac') ||
    appPlatform.includes('mac') ||
    userAgent.includes('darwin')
  ) {
    platform.value = 'macos'
  } else if (userAgent.includes('win') || appPlatform.includes('win')) {
    platform.value = 'windows'
  }

  console.log('[useTheme] Detected platform:', platform.value)

  // Apply platform class to document
  document.documentElement.classList.add(`platform-${platform.value}`)

  // Listen for platform simulation events from Electron menu
  if (window.electronAPI?.on) {
    window.electronAPI.on('simulate-platform', ((
      newPlatform: 'macos' | 'windows' | 'linux'
    ) => {
      // Remove old platform class
      document.documentElement.classList.remove(`platform-${platform.value}`)
      // Set new platform
      platform.value = newPlatform
      // Add new platform class
      document.documentElement.classList.add(`platform-${platform.value}`)
    }) as (...args: unknown[]) => void)
  }
}

// Load theme from storage API on initialization
async function loadThemeFromStorage() {
  if (!isInitialized.value && window.storageAPI) {
    try {
      const config = await window.storageAPI.getIDEConfig()
      if (config?.ui?.theme) {
        themeMode.value = config.ui.theme
      }
      isInitialized.value = true
    } catch (error) {
      console.warn('[useTheme] Failed to load theme from storage:', error)
      // Fallback to default
      themeMode.value = 'auto'
      isInitialized.value = true
    }
  }
}

// Save theme to storage API
async function saveThemeToStorage(mode: ThemeMode) {
  if (window.storageAPI) {
    try {
      await window.storageAPI.updateIDEConfig({
        ui: { theme: mode },
      } as Parameters<typeof window.storageAPI.updateIDEConfig>[0])
    } catch (error) {
      console.error('[useTheme] Failed to save theme to storage:', error)
    }
  }
}

export function useTheme() {
  // Load theme on first use
  onMounted(() => {
    loadThemeFromStorage()
  })

  const setTheme = async (mode: ThemeMode) => {
    themeMode.value = mode
    // Save to storage API
    await saveThemeToStorage(mode)
  }

  const toggleTheme = async () => {
    if (themeMode.value === 'auto') {
      await setTheme(preferredDark.value ? 'light' : 'dark')
    } else {
      await setTheme(themeMode.value === 'light' ? 'dark' : 'light')
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
    if (isInitialized.value) {
      syncThemeWithElectron()
    }
  })

  // Initial load
  if (!isInitialized.value) {
    loadThemeFromStorage()
  }

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
