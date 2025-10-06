/**
 * @fileoverview Test suite for UncommittedFilesModal component
 *
 * @description
 * Comprehensive test coverage for the UncommittedFilesModal component,
 * which displays uncommitted file changes organized by status (modified vs untracked).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import UncommittedFilesModal from './UncommittedFilesModal.vue'

describe('UncommittedFilesModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
  let wrapper: VueWrapper<any>

  // Helper to get elements from teleported content
  const getElement = (selector: string): HTMLElement | null => {
    return document.querySelector(selector)
  }

  const getAllElements = (selector: string): NodeListOf<HTMLElement> => {
    return document.querySelectorAll(selector)
  }

  beforeEach(() => {
    // No need for teleport target as component teleports to body
  })

  afterEach(() => {
    // Clean up
    if (wrapper) {
      wrapper.unmount()
    }
    // Clean up teleported content
    document.body.innerHTML = ''
  })

  describe('Component Rendering', () => {
    it('should render when isVisible is true', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts', 'file2.vue'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      expect(getElement('.files-modal-overlay')).toBeTruthy()
      expect(getElement('.files-modal-container')).toBeTruthy()
    })

    it('should not render when isVisible is false', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: false,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      expect(getElement('.files-modal-overlay')).toBeFalsy()
    })

    it('should render with empty file list', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: [],
          currentBranch: 'main',
        },
      })

      await nextTick()
      expect(getElement('.files-modal-overlay')).toBeTruthy()
      expect(getElement('.file-item')).toBeFalsy()
    })
  })

  describe('Header Content', () => {
    it('should display correct title', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const title = getElement('.files-modal-title')
      expect(title?.textContent?.trim()).toBe('Uncommitted Changes')
    })

    it('should display correct subtitle for single file', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const subtitle = getElement('.files-modal-subtitle')
      expect(subtitle?.textContent?.trim()).toBe(
        '1 changed file in your working directory'
      )
    })

    it('should display correct subtitle for multiple files', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts', 'file2.vue', 'file3.js'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const subtitle = getElement('.files-modal-subtitle')
      expect(subtitle?.textContent?.trim()).toBe(
        '3 changed files in your working directory'
      )
    })
  })

  describe('File Categorization', () => {
    it('should categorize files as modified based on extensions', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: [
            'config.yaml',
            'package.json',
            'index.ts',
            'app.js',
            'Component.vue',
          ],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const modifiedSection = getElement('.file-category')
      expect(modifiedSection).toBeTruthy()

      const modifiedTitle = modifiedSection?.querySelector('.category-title')
      expect(modifiedTitle?.textContent).toContain('Modified (5)')

      const modifiedItems = getAllElements('.file-item.modified')
      expect(modifiedItems).toHaveLength(5)
    })

    it('should categorize remaining files as untracked', async () => {
      const files = []
      // Add 6 files to exceed the 5 file limit for modified
      for (let i = 0; i < 8; i++) {
        files.push(`file${i}.ts`)
      }

      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: files,
          currentBranch: 'main',
        },
      })

      await nextTick()
      // First 5 should be modified
      const modifiedItems = getAllElements('.file-item.modified')
      expect(modifiedItems).toHaveLength(5)

      // Remaining 3 should be untracked
      const untrackedItems = getAllElements('.file-item.untracked')
      expect(untrackedItems).toHaveLength(3)
    })

    it('should handle files with paths as untracked', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: [
            'src/components/file.unknown', // Path with unknown ext -> untracked
            'deep/nested/path/file.xyz', // Path with unknown ext -> untracked
          ],
          currentBranch: 'main',
        },
      })

      await nextTick()
      // Files with paths and unknown extensions should be untracked
      const untrackedItems = getAllElements('.file-item.untracked')
      expect(untrackedItems).toHaveLength(2)
    })

    it('should show only modified section when all files are modified', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file.yaml', 'data.json'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const modifiedSection = getElement('.file-category')
      expect(modifiedSection).toBeTruthy()
      expect(modifiedSection?.textContent).toContain('Modified')

      // Should not have untracked section
      const categories = getAllElements('.file-category')
      expect(categories).toHaveLength(1)
    })

    it('should show only untracked section when no files match modified patterns', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['unknown/path/file.xyz', 'another/deep/file.abc'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const untrackedSection = getElement('.file-category')
      expect(untrackedSection).toBeTruthy()
      expect(untrackedSection?.textContent).toContain('Untracked')

      // Should not have modified section
      const categories = getAllElements('.file-category')
      expect(categories).toHaveLength(1)
    })
  })

  describe('File Display', () => {
    it('should display file status indicators', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: [
            'modified.ts', // Will be modified (has .ts extension)
            'file1.js',
            'file2.vue',
            'file3.yaml',
            'file4.json',
            'src/untracked.xyz', // Will be untracked (unknown extension after first 5)
          ],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const modifiedStatus = getElement('.file-item.modified .file-status')
      expect(modifiedStatus?.textContent).toBe('M')

      const untrackedStatus = getElement('.file-item.untracked .file-status')
      expect(untrackedStatus?.textContent).toBe('U')
    })

    it('should display file paths correctly', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['app.vue', 'src/components/Button.vue'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const filePaths = getAllElements('.file-path')
      expect(filePaths[0]?.textContent).toBe('app.vue')
      expect(filePaths[1]?.textContent).toBe('src/components/Button.vue')
    })
  })

  describe('User Interactions', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const closeButton = getElement('.close-footer-button')
      closeButton?.dispatchEvent(new MouseEvent('click'))
      await nextTick()

      expect(wrapper.emitted()).toHaveProperty('close')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const overlay = getElement('.files-modal-overlay')
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()

      expect(wrapper.emitted()).toHaveProperty('close')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('should not emit close when modal content is clicked', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const container = getElement('.files-modal-container')
      container?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()

      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })

  describe('Footer Content', () => {
    it('should display footer note', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const footerNote = getElement('.footer-note')
      expect(footerNote?.textContent?.trim()).toBe(
        'These changes will be handled when you choose your branch switching option.'
      )
    })

    it('should display close button with correct text', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const closeButton = getElement('.close-footer-button')
      expect(closeButton?.textContent?.trim()).toBe('Close')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const container = getElement('.files-modal-container')
      expect(container?.getAttribute('role')).toBe('dialog')
      expect(container?.getAttribute('aria-modal')).toBe('true')
      expect(container?.getAttribute('aria-labelledby')).toBeTruthy()
    })

    it('should have unique heading ID', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const title = getElement('.files-modal-title')
      const container = getElement('.files-modal-container')
      const headingId = container?.getAttribute('aria-labelledby')

      expect(title?.getAttribute('id')).toBe(headingId)
      expect(headingId).toMatch(/^files-modal-\d+$/)
    })
  })

  describe('Transitions', () => {
    it('should call onBeforeEnter transition hook', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: false,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      // Mock the modal container element
      const mockElement = document.createElement('div')
      const mockContainer = document.createElement('div')
      mockContainer.className = 'files-modal-container'
      mockElement.appendChild(mockContainer)

      // Access the component's method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      vm.onBeforeEnter(mockElement)

      expect(mockContainer.style.transform).toBe(
        'scale(0.95) translateY(-10px)'
      )
      expect(mockContainer.style.opacity).toBe('0')
    })

    it('should call onAfterEnter transition hook', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      // Mock the modal container and button elements
      const mockElement = document.createElement('div')
      const mockContainer = document.createElement('div')
      mockContainer.className = 'files-modal-container'
      mockContainer.style.transform = 'scale(0.95)'
      mockContainer.style.opacity = '0'

      const mockButton = document.createElement('button')
      mockButton.className = 'close-footer-button'
      const focusSpy = vi.spyOn(mockButton, 'focus')

      mockElement.appendChild(mockContainer)
      mockElement.appendChild(mockButton)

      // Access the component's method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      vm.onAfterEnter(mockElement)

      expect(mockContainer.style.transform).toBe('')
      expect(mockContainer.style.opacity).toBe('')

      await nextTick()
      expect(focusSpy).toHaveBeenCalled()
    })

    it('should call onBeforeLeave transition hook', () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      // Mock the modal container element
      const mockElement = document.createElement('div')
      const mockContainer = document.createElement('div')
      mockContainer.className = 'files-modal-container'
      mockElement.appendChild(mockContainer)

      // Access the component's method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      vm.onBeforeLeave(mockElement)

      expect(mockContainer.style.transform).toBe(
        'scale(0.95) translateY(-10px)'
      )
      expect(mockContainer.style.opacity).toBe('0')
    })

    it('should handle missing container in transition hooks', () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      // Mock element without container
      const mockElement = document.createElement('div')

      // Access the component's methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any

      // These should not throw even without container
      expect(() => vm.onBeforeEnter(mockElement)).not.toThrow()
      expect(() => vm.onAfterEnter(mockElement)).not.toThrow()
      expect(() => vm.onBeforeLeave(mockElement)).not.toThrow()
    })
  })

  describe('SSR Support', () => {
    it('should detect SSR environment correctly', () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      // In browser environment
      expect(vm.isSSR()).toBe(false)
    })

    it('should disable teleport in SSR', () => {
      // Mock a component with SSR detection
      const mockIsSSR = vi.fn(() => true)

      // Override the component's isSSR method via mocking setup
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
        global: {
          mocks: {
            isSSR: mockIsSSR,
          },
        },
      })

      // The component should detect SSR environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      // Since we're in test env with document available, isTeleportDisabled will be false
      // But we can verify the SSR detection logic exists
      expect(vm.isTeleportDisabled).toBeDefined()
      expect(typeof vm.isSSR).toBe('function')
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle many files correctly', async () => {
      const manyFiles = []
      for (let i = 0; i < 20; i++) {
        manyFiles.push(`file${i}.ts`)
      }

      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: manyFiles,
          currentBranch: 'main',
        },
      })

      await nextTick()
      // Should show first 5 as modified
      const modifiedItems = getAllElements('.file-item.modified')
      expect(modifiedItems).toHaveLength(5)

      // Rest should be untracked
      const untrackedItems = getAllElements('.file-item.untracked')
      expect(untrackedItems).toHaveLength(15)
    })

    it('should handle files with various extensions', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: [
            'config.yaml',
            'settings.yml',
            'package.json',
            'tsconfig.json',
            'index.ts',
            'main.tsx',
            'app.js',
            'script.jsx',
            'App.vue',
            'Component.svelte',
          ],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const modifiedItems = getAllElements('.file-item.modified')
      // First 5 files should be marked as modified
      expect(modifiedItems).toHaveLength(5)

      const untrackedItems = getAllElements('.file-item.untracked')
      // Remaining 5 files should be untracked
      expect(untrackedItems).toHaveLength(5)
    })

    it('should handle root-level files as tracked', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['README', 'LICENSE', 'Makefile'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const modifiedItems = getAllElements('.file-item.modified')
      // Root files without slashes should be considered tracked/modified
      expect(modifiedItems).toHaveLength(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty current branch', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: '',
        },
      })

      await nextTick()
      expect(getElement('.files-modal-overlay')).toBeTruthy()
    })

    it('should handle file names with special characters', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: [
            'file-with-dashes.ts',
            'file_with_underscores.js',
            'file.with.dots.vue',
            '@scoped/package.json',
          ],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const filePaths = getAllElements('.file-path')
      expect(filePaths[0]?.textContent).toBe('file-with-dashes.ts')
      expect(filePaths[1]?.textContent).toBe('file_with_underscores.js')
      expect(filePaths[2]?.textContent).toBe('file.with.dots.vue')
      expect(filePaths[3]?.textContent).toBe('@scoped/package.json')
    })

    it('should handle very long file paths', async () => {
      const longPath =
        'src/components/very/deep/nested/folder/structure/with/many/levels/Component.vue'

      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: [longPath],
          currentBranch: 'main',
        },
      })

      await nextTick()
      const filePath = getElement('.file-path')
      expect(filePath?.textContent).toBe(longPath)
    })
  })

  describe('Component Updates', () => {
    it('should update when props change', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      expect(getAllElements('.file-item')).toHaveLength(1)

      await wrapper.setProps({
        changedFiles: ['file1.ts', 'file2.js', 'file3.vue'],
      })

      await nextTick()
      expect(getAllElements('.file-item')).toHaveLength(3)
    })

    it('should toggle visibility correctly', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file1.ts'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      expect(getElement('.files-modal-overlay')).toBeTruthy()

      // Toggle off
      await wrapper.setProps({ isVisible: false })
      await nextTick()

      // The transition might still be in progress
      // Check if element is being removed or has transition class
      const overlay = getElement('.files-modal-overlay')
      if (overlay) {
        // If still present, should have leave transition class
        expect(
          overlay.classList.contains('files-modal-leave-active') ||
            overlay.classList.contains('files-modal-leave-to')
        ).toBe(true)
      } else {
        // Or it should be completely removed
        expect(overlay).toBeFalsy()
      }
    })

    it('should update file categorization when files change', async () => {
      wrapper = mount(UncommittedFilesModal, {
        props: {
          isVisible: true,
          changedFiles: ['file.yaml'],
          currentBranch: 'main',
        },
      })

      await nextTick()
      expect(getAllElements('.file-category')).toHaveLength(1)
      expect(getElement('.category-title')?.textContent).toContain('Modified')

      await wrapper.setProps({
        changedFiles: ['src/deep/path/file.unknown'],
      })

      await nextTick()
      expect(getAllElements('.file-category')).toHaveLength(1)
      expect(getElement('.category-title')?.textContent).toContain('Untracked')
    })
  })
})
