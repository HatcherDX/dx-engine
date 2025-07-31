import { ref } from 'vue'

export function useSmartTruncation() {
  const containerRef = ref<HTMLElement>()

  // Truncate a path intelligently based on available width
  const truncatePath = (
    fullPath: string,
    maxWidth: number,
    fontSize = 13
  ): string => {
    if (!fullPath) return ''
    if (maxWidth <= 0) return fullPath

    // Create a temporary element to measure text width
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return fullPath

    // Set font to match the component (more specific font stack)
    context.font = `${fontSize}px ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace`

    // If the full path fits, return it as is
    const fullWidth = context.measureText(fullPath).width
    if (fullWidth <= maxWidth) {
      return fullPath
    }

    // Split path into parts
    const parts = fullPath.split('/')
    if (parts.length === 1) {
      // Single filename, truncate with ellipsis
      return truncateText(fullPath, maxWidth, context)
    }

    const filename = parts[parts.length - 1]
    const filenameWidth = context.measureText(filename).width
    const ellipsisWidth = context.measureText('...').width

    // If even the filename doesn't fit, truncate it
    if (filenameWidth + ellipsisWidth > maxWidth) {
      return '...' + truncateText(filename, maxWidth - ellipsisWidth, context)
    }

    // Try different truncation strategies
    const strategies = [
      () => tryKeepFirstAndLast(parts, maxWidth, context),
      () => tryKeepLast(parts, maxWidth, context),
      () => tryTruncateFilename(parts, maxWidth, context),
    ]

    for (const strategy of strategies) {
      const result = strategy()
      if (result) return result
    }

    // Fallback: just show truncated filename
    return '...' + truncateText(filename, maxWidth - ellipsisWidth, context)
  }

  // Strategy 1: Keep first directory and filename (src/.../Hello.vue)
  const tryKeepFirstAndLast = (
    parts: string[],
    maxWidth: number,
    context: CanvasRenderingContext2D
  ): string | null => {
    if (parts.length < 3) return null

    const first = parts[0]
    const filename = parts[parts.length - 1]
    const pattern = `${first}/.../${filename}`

    const width = context.measureText(pattern).width
    if (width <= maxWidth) {
      return pattern
    }

    return null
  }

  // Strategy 2: Keep only filename (.../Hello.vue)
  const tryKeepLast = (
    parts: string[],
    maxWidth: number,
    context: CanvasRenderingContext2D
  ): string | null => {
    const filename = parts[parts.length - 1]
    const pattern = `.../${filename}`

    const width = context.measureText(pattern).width
    if (width <= maxWidth) {
      return pattern
    }

    return null
  }

  // Strategy 3: Truncate filename itself (...ello.vue)
  const tryTruncateFilename = (
    parts: string[],
    maxWidth: number,
    context: CanvasRenderingContext2D
  ): string | null => {
    const filename = parts[parts.length - 1]
    const ellipsisWidth = context.measureText('...').width

    // Calculate how much space we have for the filename part
    const availableForFilename = maxWidth - ellipsisWidth

    if (availableForFilename <= 0) return null

    // Find the longest suffix of filename that fits
    for (let i = 1; i < filename.length; i++) {
      const suffix = filename.substring(i)
      const suffixWidth = context.measureText(suffix).width

      if (suffixWidth <= availableForFilename) {
        return '...' + suffix
      }
    }

    return null
  }

  // Helper function to truncate text to fit within maxWidth
  const truncateText = (
    text: string,
    maxWidth: number,
    context: CanvasRenderingContext2D
  ): string => {
    let truncated = text

    while (truncated.length > 1) {
      const width = context.measureText(truncated).width
      if (width <= maxWidth) {
        return truncated
      }
      truncated = truncated.substring(1)
    }

    return truncated
  }

  // Get available width for a container element
  const getAvailableWidth = (element: HTMLElement): number => {
    const style = window.getComputedStyle(element)
    const paddingLeft = parseFloat(style.paddingLeft)
    const paddingRight = parseFloat(style.paddingRight)
    const borderLeft = parseFloat(style.borderLeftWidth)
    const borderRight = parseFloat(style.borderRightWidth)

    return (
      element.clientWidth -
      paddingLeft -
      paddingRight -
      borderLeft -
      borderRight
    )
  }

  return {
    containerRef,
    truncatePath,
    getAvailableWidth,
  }
}
