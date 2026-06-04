import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGitErrorModal, type GitError } from './useGitErrorModal'

/**
 * Test suite for useGitErrorModal composable.
 *
 * @remarks
 * Tests the reactive state management, debounced functions,
 * auto-close functionality, and enhanced error handling features.
 *
 * @public
 * @since 1.1.0
 */

describe('useGitErrorModal', () => {
  let mockError: GitError

  beforeEach(() => {
    mockError = {
      success: false,
      currentBranch: 'main',
      message: 'Cannot switch branches due to uncommitted changes',
      errorType: 'uncommitted_changes',
      modifiedFiles: ['src/test.ts', 'package.json'],
      untrackedFiles: [],
      suggestions: ['git stash', 'git commit -m "WIP"'],
      canForce: true,
    }

    // Mock setTimeout and clearTimeout
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { isModalVisible, currentError, canForceSwitch } =
        useGitErrorModal()

      expect(isModalVisible.value).toBe(false)
      expect(currentError.value).toBe(null)
      expect(canForceSwitch()).toBe(false)
    })
  })

  describe('showError', () => {
    it('should show modal with error data', () => {
      const { showError, isModalVisible, currentError } = useGitErrorModal()

      showError(mockError)

      expect(isModalVisible.value).toBe(true)
      expect(currentError.value).toEqual(mockError)
    })

    it('should accept force switch callback', () => {
      const { showError, isModalVisible } = useGitErrorModal()
      const mockCallback = vi.fn()

      showError(mockError, mockCallback)

      // The callback should be stored (tested indirectly through handleForceSwitch)
      expect(isModalVisible.value).toBe(true)
    })

    it('should support auto-close option', () => {
      const { showError, isModalVisible } = useGitErrorModal()

      showError(mockError, undefined, { autoClose: 1000 })

      expect(isModalVisible.value).toBe(true)

      // Fast-forward time to trigger auto-close
      vi.advanceTimersByTime(1300) // 1000ms delay + 300ms debounce

      // Modal should be closed after timeout
      expect(isModalVisible.value).toBe(false)
    })

    it('should prevent duplicate errors when option enabled', () => {
      const { showError, currentError } = useGitErrorModal()

      // Show error first time
      showError(mockError)
      const firstErrorRef = currentError.value

      // Try to show same error again with preventDuplicates
      showError(mockError, undefined, { preventDuplicates: true })

      // Should be the same reference (no change)
      expect(currentError.value).toBe(firstErrorRef)
    })

    it('should allow duplicate errors when option disabled', () => {
      const { showError, currentError } = useGitErrorModal()

      // Show error first time
      showError(mockError)
      expect(currentError.value).toEqual(mockError)

      // Modify error slightly
      const modifiedError = { ...mockError, message: 'Different message' }
      showError(modifiedError)

      expect(currentError.value).toEqual(modifiedError)
    })
  })

  describe('closeModal', () => {
    it('should reset all state when closing', () => {
      const { showError, closeModal, isModalVisible, currentError } =
        useGitErrorModal()

      // Set up some state
      showError(mockError)

      // Close modal
      closeModal()

      expect(isModalVisible.value).toBe(false)
      expect(currentError.value).toBe(null)
    })

    it('should clear auto-close timeout', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
      const { showError, closeModal } = useGitErrorModal()

      // Show error with auto-close
      showError(mockError, undefined, { autoClose: 5000 })

      // Advance time to trigger debounced setupAutoClose function
      vi.advanceTimersByTime(300)

      // Close manually before timeout
      closeModal()

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })
  })

  describe('handleForceSwitch', () => {
    it('should execute callback', () => {
      const mockCallback = vi.fn()
      const { showError, handleForceSwitch, isModalVisible } =
        useGitErrorModal()

      showError(mockError, mockCallback)

      // Execute force switch
      handleForceSwitch()

      expect(mockCallback).toHaveBeenCalled()
      expect(isModalVisible.value).toBe(false)
    })

    it('should handle callbacks', () => {
      const mockCallback = vi.fn()
      const { showError, handleForceSwitch } = useGitErrorModal()

      showError(mockError, mockCallback)

      handleForceSwitch()

      expect(mockCallback).toHaveBeenCalled()
    })

    it('should close modal after force switch', () => {
      const mockCallback = vi.fn()
      const { showError, handleForceSwitch, isModalVisible } =
        useGitErrorModal()

      showError(mockError, mockCallback)
      expect(isModalVisible.value).toBe(true)

      handleForceSwitch()

      expect(mockCallback).toHaveBeenCalled()
      expect(isModalVisible.value).toBe(false)
    })

    it('should close modal immediately', () => {
      const mockCallback = vi.fn()
      const { showError, handleForceSwitch, isModalVisible } =
        useGitErrorModal()

      showError(mockError, mockCallback)
      expect(isModalVisible.value).toBe(true)

      handleForceSwitch()

      expect(isModalVisible.value).toBe(false)
    })
  })

  describe('canForceSwitch', () => {
    it('should return true when error allows forcing', () => {
      const { showError, canForceSwitch } = useGitErrorModal()

      showError(mockError) // mockError has canForce: true

      expect(canForceSwitch()).toBe(true)
    })

    it('should return false when error does not allow forcing', () => {
      const { showError, canForceSwitch } = useGitErrorModal()
      const nonForceableError = { ...mockError, canForce: false }

      showError(nonForceableError)

      expect(canForceSwitch()).toBe(false)
    })

    it('should return false when no error is present', () => {
      const { canForceSwitch } = useGitErrorModal()

      expect(canForceSwitch()).toBe(false)
    })
  })

  describe('getErrorSummary', () => {
    it('should return summary for error with files', () => {
      const { showError, getErrorSummary } = useGitErrorModal()

      showError(mockError)

      const summary = getErrorSummary()
      expect(summary).toBe(
        'Git Error (uncommitted_changes): Cannot switch branches due to uncommitted changes - 2 files affected (2 modified, 0 untracked)'
      )
    })

    it('should return summary for error without files', () => {
      const { showError, getErrorSummary } = useGitErrorModal()
      const errorWithoutFiles = {
        ...mockError,
        modifiedFiles: undefined,
        untrackedFiles: undefined,
      }

      showError(errorWithoutFiles)

      const summary = getErrorSummary()
      expect(summary).toBe(
        'Git Error (uncommitted_changes): Cannot switch branches due to uncommitted changes - 0 files affected (0 modified, 0 untracked)'
      )
    })

    it('should return default message when no error', () => {
      const { getErrorSummary } = useGitErrorModal()

      expect(getErrorSummary()).toBe('No error')
    })
  })

  describe('Debounce Functionality', () => {
    it('should debounce auto-close setup', () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
      const { showError } = useGitErrorModal()

      // Trigger multiple auto-closes rapidly
      showError(mockError, undefined, { autoClose: 1000 })
      showError(mockError, undefined, { autoClose: 1000 })
      showError(mockError, undefined, { autoClose: 1000 })

      vi.advanceTimersByTime(300) // Debounce delay

      // Should have been called for the debounced function
      expect(setTimeoutSpy).toHaveBeenCalled()

      setTimeoutSpy.mockRestore()
    })
  })

  describe('Memory Management', () => {
    it('should clean up timeouts properly', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
      const { showError, closeModal } = useGitErrorModal()

      // Create some timeouts
      showError(mockError, undefined, { autoClose: 5000 })

      // Advance time to trigger debounced setupAutoClose function
      vi.advanceTimersByTime(300)

      // Close should clear timeouts
      closeModal()

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })
  })
})
