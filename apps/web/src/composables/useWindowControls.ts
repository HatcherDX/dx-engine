import { ref, onMounted, onUnmounted } from 'vue'

export function useWindowControls() {
  const isMaximized = ref(false)

  // Check if we're in Electron
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const minimizeWindow = async () => {
    if (isElectron) {
      try {
        await window.electronAPI.send('minimizeWindow')
      } catch (error) {
        console.error('Failed to minimize window:', error)
      }
    }
  }

  const maximizeWindow = async () => {
    if (isElectron) {
      try {
        await window.electronAPI.send('maximizeWindow')
        await updateMaximizedState()
      } catch (error) {
        console.error('Failed to maximize/restore window:', error)
      }
    }
  }

  const closeWindow = async () => {
    if (isElectron) {
      try {
        await window.electronAPI.send('closeWindow')
      } catch (error) {
        console.error('Failed to close window:', error)
      }
    }
  }

  const updateMaximizedState = async () => {
    if (isElectron) {
      try {
        const result = await window.electronAPI.send('isWindowMaximized')
        isMaximized.value = Boolean(result)
      } catch (error) {
        console.error('Failed to get window state:', error)
      }
    }
  }

  const handleDoubleClick = () => {
    maximizeWindow()
  }

  let resizeListener: (() => void) | null = null

  onMounted(() => {
    updateMaximizedState()

    // Listen for window resize events to update maximized state
    if (typeof window !== 'undefined') {
      resizeListener = () => {
        // Debounce the state update
        setTimeout(updateMaximizedState, 100)
      }
      window.addEventListener('resize', resizeListener)
    }
  })

  onUnmounted(() => {
    if (resizeListener && typeof window !== 'undefined') {
      window.removeEventListener('resize', resizeListener)
    }
  })

  return {
    isMaximized,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    handleDoubleClick,
    isElectron,
  }
}
