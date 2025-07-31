import { ref, onMounted, onUnmounted, computed } from 'vue'

export function useSidebarResize() {
  const sidebarWidth = ref(270) // Ancho inicial
  const isResizing = ref(false)
  const minWidth = 270
  const maxWidth = 500

  // Load saved width from localStorage
  onMounted(() => {
    const savedWidth = localStorage.getItem('sidebar-width')
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (width >= minWidth && width <= maxWidth) {
        sidebarWidth.value = width
      }
    }
  })

  // Save width to localStorage
  const saveWidth = () => {
    localStorage.setItem('sidebar-width', sidebarWidth.value.toString())
  }

  // Update cursor based on resize constraints during drag
  const updateDragCursor = (proposedWidth: number) => {
    const isAtMinWidth = proposedWidth <= minWidth
    const isAtMaxWidth = proposedWidth >= maxWidth

    if (isAtMinWidth && isAtMaxWidth) {
      document.body.style.cursor = 'not-allowed'
    } else if (isAtMinWidth) {
      document.body.style.cursor = 'e-resize' // Can only resize to the right
    } else if (isAtMaxWidth) {
      document.body.style.cursor = 'w-resize' // Can only resize to the left
    } else {
      document.body.style.cursor = 'col-resize' // Can resize in both directions
    }
  }

  // Start resizing
  const startResize = (event: MouseEvent) => {
    isResizing.value = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const startX = event.clientX
    const startWidth = sidebarWidth.value

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const proposedWidth = startWidth + deltaX

      // Clamp width to constraints
      const newWidth = Math.min(maxWidth, Math.max(minWidth, proposedWidth))
      sidebarWidth.value = newWidth

      // Update cursor based on proposed width (before constraints)
      updateDragCursor(proposedWidth)
    }

    const handleMouseUp = () => {
      isResizing.value = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      // Save the new width
      saveWidth()

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Prevent default to avoid text selection
    event.preventDefault()
  }

  // Direct width for sidebar component
  const sidebarWidthPx = computed(() => `${sidebarWidth.value}px`)

  // Cursor feedback based on resize limits
  const resizeCursor = computed(() => {
    const isAtMinWidth = sidebarWidth.value <= minWidth
    const isAtMaxWidth = sidebarWidth.value >= maxWidth

    if (isAtMinWidth && isAtMaxWidth) {
      return 'not-allowed' // Can't resize either direction
    } else if (isAtMinWidth) {
      return 'e-resize' // Can only resize to the right (increase width)
    } else if (isAtMaxWidth) {
      return 'w-resize' // Can only resize to the left (decrease width)
    } else {
      return 'col-resize' // Can resize in both directions
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  return {
    sidebarWidth,
    sidebarWidthPx,
    isResizing,
    startResize,
    resizeCursor,
    minWidth,
    maxWidth,
  }
}
