import { ref, computed, watch } from 'vue'
import type { ModeType } from '../components/molecules/ModeSelector.vue'

const STORAGE_KEY = 'hatcher-chat-sidebar'
const DEFAULT_WIDTH = 400
const MIN_WIDTH = 250
const MAX_WIDTH = 600

export function useChatSidebar() {
  // Chat sidebar state
  const isResizing = ref(false)
  const width = ref(DEFAULT_WIDTH)
  const currentMode = ref<ModeType>('generative')

  // Load width from localStorage
  const loadWidth = (): number => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedWidth = parseInt(stored, 10)
        if (parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
          return parsedWidth
        }
      }
    } catch (error) {
      console.warn('Failed to load chat sidebar width from storage:', error)
    }
    return DEFAULT_WIDTH
  }

  // Save width to localStorage
  const saveWidth = (newWidth: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, newWidth.toString())
    } catch (error) {
      console.warn('Failed to save chat sidebar width to storage:', error)
    }
  }

  // Initialize width
  width.value = loadWidth()

  // Watch for width changes and save automatically
  watch(width, (newWidth) => {
    saveWidth(newWidth)
  })

  // Computed properties for mode-specific behavior
  const isGenerativeMode = computed(() => currentMode.value === 'generative')

  // Direct width value for use with the new 3-column layout
  const widthPx = computed(() => `${width.value}px`)

  // Cursor feedback based on resize limits and content safety zone
  const resizeCursor = computed(() => {
    const isAtMinWidth = width.value <= MIN_WIDTH
    const isAtMaxWidth = width.value >= MAX_WIDTH

    if (isGenerativeMode.value) {
      return 'not-allowed' // No resize in generative mode
    } else if (isAtMinWidth && isAtMaxWidth) {
      return 'not-allowed' // Can't resize either direction
    } else if (isAtMinWidth) {
      return 'w-resize' // Can only resize to the left (increase width)
    } else if (isAtMaxWidth) {
      return 'e-resize' // Can only resize to the right (decrease width)
    } else {
      return 'col-resize' // Can resize in both directions
    }
  })

  const shouldShowResizeHandle = computed(() => {
    // Hide resize handle in generative mode
    return !isGenerativeMode.value
  })

  // Update cursor based on resize constraints during drag
  const updateDragCursor = (proposedWidth: number) => {
    if (isGenerativeMode.value) {
      document.body.style.cursor = 'not-allowed'
      return
    }

    const isAtMinWidth = proposedWidth <= MIN_WIDTH
    const isAtMaxWidth = proposedWidth >= MAX_WIDTH

    // For chat sidebar (right side), cursor directions are inverted
    if (isAtMinWidth && isAtMaxWidth) {
      document.body.style.cursor = 'not-allowed'
    } else if (isAtMinWidth) {
      document.body.style.cursor = 'w-resize' // Can only resize to the left (increase width)
    } else if (isAtMaxWidth) {
      document.body.style.cursor = 'e-resize' // Can only resize to the right (decrease width)
    } else {
      document.body.style.cursor = 'col-resize' // Can resize in both directions
    }
  }

  // Resize functionality
  const startResize = (event: MouseEvent) => {
    if (isGenerativeMode.value) return

    isResizing.value = true
    const startX = event.clientX
    const startWidth = width.value

    const handleMouseMove = (e: MouseEvent) => {
      // For right sidebar: moving left (negative diff) should increase width
      const diff = startX - e.clientX
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + diff)
      )
      width.value = newWidth

      // Update cursor based on current constraints during drag
      updateDragCursor(startWidth + diff) // Use proposed width, not constrained
    }

    const handleMouseUp = () => {
      isResizing.value = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    event.preventDefault()
  }

  // Mode change handler
  const setMode = (mode: ModeType) => {
    currentMode.value = mode
  }

  // Reset to default width
  const resetWidth = () => {
    width.value = DEFAULT_WIDTH
  }

  return {
    // State
    width,
    isResizing,
    currentMode,

    // Computed
    widthPx,
    resizeCursor,
    shouldShowResizeHandle,
    isGenerativeMode,

    // Actions
    startResize,
    setMode,
    resetWidth,

    // Constants
    MIN_WIDTH,
    MAX_WIDTH,
    DEFAULT_WIDTH,
  }
}
