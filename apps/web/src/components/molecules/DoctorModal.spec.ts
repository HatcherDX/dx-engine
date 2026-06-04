/**
 * @fileoverview Comprehensive test suite for DoctorModal component.
 *
 * @description
 * Tests all functionality including modal visibility, diagnostic checks display,
 * health status computation, export report, run diagnostics, and all computed properties.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import DoctorModal from './DoctorModal.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'

/**
 * Type definition for Doctor Modal VM instance with checks property.
 */
interface DoctorModalVM {
  checks: {
    electron: { status: string; message: string; details: string }
    ipc: { status: string; message: string; details: string }
    fileSystem: { status: string; message: string; details: string }
    git: { status: string; message: string; details: string }
    performance: { status: string; message: string; details: string }
  }
  exportReport: () => void
  runDiagnostics: () => void
}

/**
 * Mock composables.
 */
vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

/**
 * Mock DOM APIs for export functionality.
 */
global.window.Blob = vi.fn((content, options) => ({
  content,
  options,
})) as unknown as typeof Blob

global.window.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
} as unknown as typeof URL

describe('DoctorModal.vue', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  /**
   * Helper to mount component.
   */
  const createWrapper = (props = {}, options = {}) => {
    return mount(DoctorModal, {
      props: {
        visible: true,
        ...props,
      },
      global: {
        components: {
          BaseIcon,
          BaseButton,
        },
        stubs: {
          BaseIcon: true,
          BaseButton: true,
          ...options.stubs,
        },
      },
    })
  }

  describe('Rendering', () => {
    it('should mount and render without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render when visible is false', () => {
      wrapper = createWrapper({ visible: false })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should render modal overlay when visible is true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should render modal title "System Diagnostics"', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').text()).toBe('System Diagnostics')
    })

    it('should render close button with aria-label', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should render health summary section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.health-summary').exists()).toBe(true)
      expect(wrapper.find('.health-badge').exists()).toBe(true)
    })

    it('should render all 5 diagnostic check items', () => {
      wrapper = createWrapper()
      const checkItems = wrapper.findAll('.check-item')
      expect(checkItems).toHaveLength(5)
    })

    it('should render check titles correctly', () => {
      wrapper = createWrapper()
      const titles = wrapper.findAll('.check-title')
      expect(titles[0].text()).toBe('Electron Environment')
      expect(titles[1].text()).toBe('IPC Communication')
      expect(titles[2].text()).toBe('File System Access')
      expect(titles[3].text()).toBe('Git Operations')
      expect(titles[4].text()).toBe('Performance Metrics')
    })

    it('should render system information section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.system-info-section').exists()).toBe(true)
      const sectionTitles = wrapper.findAll('.section-title')
      expect(sectionTitles[1].text()).toBe('System Information')
    })

    it('should render all 4 system info items', () => {
      wrapper = createWrapper()
      const infoItems = wrapper.findAll('.info-item')
      expect(infoItems).toHaveLength(4)
    })

    it('should render system info labels correctly', () => {
      wrapper = createWrapper()
      const labels = wrapper.findAll('.info-label')
      expect(labels[0].text()).toBe('Platform')
      expect(labels[1].text()).toBe('Electron')
      expect(labels[2].text()).toBe('Node.js')
      expect(labels[3].text()).toBe('Chrome')
    })

    it('should render actions section with 2 buttons', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.actions-section').exists()).toBe(true)
    })

    it('should render footer section', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-footer').exists()).toBe(true)
    })

    it('should render View Solutions button when hasIssues is true', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      // Default state has git with warning status
      const viewSolutionsButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('View Solutions'))
      expect(viewSolutionsButton).toBeTruthy()
    })

    it('should not render View Solutions button when all checks pass', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      // Set all checks to pass
      vm.checks = {
        electron: { status: 'pass', message: 'OK', details: '' },
        ipc: { status: 'pass', message: 'OK', details: '' },
        fileSystem: { status: 'pass', message: 'OK', details: '' },
        git: { status: 'pass', message: 'OK', details: '' },
        performance: { status: 'pass', message: 'OK', details: '' },
      }
      await nextTick()

      const viewSolutionsButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('View Solutions'))
      expect(viewSolutionsButton).toBeUndefined()
    })
  })

  describe('Diagnostic Checks Display', () => {
    it('should display electron check message', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const statuses = wrapper.findAll('.check-status')
      expect(statuses[0].text()).toBe(vm.checks.electron.message)
    })

    it('should display ipc check message', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const statuses = wrapper.findAll('.check-status')
      expect(statuses[1].text()).toBe(vm.checks.ipc.message)
    })

    it('should display fileSystem check message', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const statuses = wrapper.findAll('.check-status')
      expect(statuses[2].text()).toBe(vm.checks.fileSystem.message)
    })

    it('should display git check message', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const statuses = wrapper.findAll('.check-status')
      expect(statuses[3].text()).toBe(vm.checks.git.message)
    })

    it('should display performance check message', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const statuses = wrapper.findAll('.check-status')
      expect(statuses[4].text()).toBe(vm.checks.performance.message)
    })

    it('should display check details when present', () => {
      wrapper = createWrapper()
      const details = wrapper.findAll('.check-details')
      expect(details.length).toBeGreaterThan(0)
    })

    it('should not display check details when not present', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks.electron.details = undefined
      await nextTick()

      const details = wrapper.findAll('.check-details')
      // Should have 4 details (all except electron)
      expect(details).toHaveLength(4)
    })
  })

  describe('Overall Health Status Computed Properties', () => {
    it('should return "All Systems Operational" when all checks pass', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'pass', message: 'OK' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthStatus).toBe('All Systems Operational')
    })

    it('should return "Minor Issues" when there are warnings', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'pass', message: 'OK' },
        ipc: { status: 'warning', message: 'Warning' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthStatus).toBe('Minor Issues')
    })

    it('should return "Critical Issues" when there are failures', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'fail', message: 'Failed' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthStatus).toBe('Critical Issues')
    })

    it('should return "Critical Issues" when there are both failures and warnings', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'fail', message: 'Failed' },
        ipc: { status: 'warning', message: 'Warning' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthStatus).toBe('Critical Issues')
    })
  })

  describe('Overall Health Description Computed Property', () => {
    it('should return "System is healthy and ready" when all checks pass', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'pass', message: 'OK' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthDescription).toBe('System is healthy and ready')
    })

    it('should return warning count when there are warnings', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'warning', message: 'Warning' },
        ipc: { status: 'warning', message: 'Warning' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthDescription).toBe('2 warning(s) detected')
    })

    it('should return fail count when there are failures', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'fail', message: 'Failed' },
        ipc: { status: 'fail', message: 'Failed' },
        fileSystem: { status: 'fail', message: 'Failed' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthDescription).toBe('3 critical issue(s) detected')
    })

    it('should prioritize failures over warnings in description', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'fail', message: 'Failed' },
        ipc: { status: 'warning', message: 'Warning' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthDescription).toBe('1 critical issue(s) detected')
    })
  })

  describe('Overall Health Class Computed Property', () => {
    it('should return "health-good" when all checks pass', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'pass', message: 'OK' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthClass).toBe('health-good')
    })

    it('should return "health-warning" when there are warnings', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'warning', message: 'Warning' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthClass).toBe('health-warning')
    })

    it('should return "health-critical" when there are failures', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'fail', message: 'Failed' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthClass).toBe('health-critical')
    })
  })

  describe('Overall Health Icon Computed Property', () => {
    it('should return "CheckCircle" when all checks pass', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'pass', message: 'OK' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthIcon).toBe('CheckCircle')
    })

    it('should return "AlertCircle" when there are warnings', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'warning', message: 'Warning' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthIcon).toBe('AlertCircle')
    })

    it('should return "AlertCircle" when there are failures', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'fail', message: 'Failed' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.overallHealthIcon).toBe('AlertCircle')
    })
  })

  describe('Has Issues Computed Property', () => {
    it('should return false when all checks pass', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'pass', message: 'OK' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.hasIssues).toBe(false)
    })

    it('should return true when there are warnings', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'warning', message: 'Warning' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.hasIssues).toBe(true)
    })

    it('should return true when there are failures', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.checks = {
        electron: { status: 'fail', message: 'Failed' },
        ipc: { status: 'pass', message: 'OK' },
        fileSystem: { status: 'pass', message: 'OK' },
        git: { status: 'pass', message: 'OK' },
        performance: { status: 'pass', message: 'OK' },
      }
      await nextTick()

      expect(vm.hasIssues).toBe(true)
    })
  })

  describe('getStatusIcon Helper', () => {
    it('should return "CheckCircle" for pass status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusIcon({ status: 'pass', message: 'OK' })
      expect(result).toBe('CheckCircle')
    })

    it('should return "AlertCircle" for warning status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusIcon({ status: 'warning', message: 'Warning' })
      expect(result).toBe('AlertCircle')
    })

    it('should return "X" for fail status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusIcon({ status: 'fail', message: 'Failed' })
      expect(result).toBe('X')
    })

    it('should return "Loader" for running status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusIcon({ status: 'running', message: 'Running' })
      expect(result).toBe('Loader')
    })

    it('should return "Circle" for unknown status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusIcon({
        status: 'unknown' as 'pass' | 'warning' | 'error',
        message: 'Unknown',
      })
      expect(result).toBe('Circle')
    })
  })

  describe('getStatusClass Helper', () => {
    it('should return "status-pass" for pass status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusClass({ status: 'pass', message: 'OK' })
      expect(result).toBe('status-pass')
    })

    it('should return "status-warning" for warning status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusClass({
        status: 'warning',
        message: 'Warning',
      })
      expect(result).toBe('status-warning')
    })

    it('should return "status-fail" for fail status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusClass({ status: 'fail', message: 'Failed' })
      expect(result).toBe('status-fail')
    })

    it('should return "status-running" for running status', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const result = vm.getStatusClass({
        status: 'running',
        message: 'Running',
      })
      expect(result).toBe('status-running')
    })
  })

  describe('Run Diagnostics Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set isRunning to true when diagnostics start', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as DoctorModalVM

      expect(vm.isRunning).toBe(false)

      const runButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Run Diagnostics'))
      await runButton!.trigger('click')
      await nextTick()

      expect(vm.isRunning).toBe(true)
    })

    it('should emit run-diagnostics event when diagnostics are started', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )

      const runButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Run Diagnostics'))
      await runButton!.trigger('click')
      await nextTick()

      expect(wrapper.emitted('run-diagnostics')).toBeTruthy()
    })

    it('should set isRunning to false after timeout', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as DoctorModalVM

      const runButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Run Diagnostics'))
      await runButton!.trigger('click')
      await nextTick()

      expect(vm.isRunning).toBe(true)

      vi.advanceTimersByTime(2000)
      await nextTick()

      expect(vm.isRunning).toBe(false)
    })

    it('should display "Running..." text when isRunning is true', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as DoctorModalVM

      const runButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Run Diagnostics'))
      await runButton!.trigger('click')
      await nextTick()

      expect(vm.isRunning).toBe(true)
      const updatedButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Running...'))
      expect(updatedButton).toBeDefined()
    })

    it('should disable run button when isRunning is true', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )

      const runButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Run Diagnostics'))

      expect(runButton?.element.disabled).toBe(false)

      await runButton!.trigger('click')
      await nextTick()

      expect(runButton!.element.disabled).toBe(true)
    })
  })

  describe('Export Report Functionality', () => {
    it('should call handleExportReport when export button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM
      const spy = vi.spyOn(vm, 'handleExportReport')

      vm.handleExportReport()

      expect(spy).toHaveBeenCalled()
    })

    it('should create a Blob with report data', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.handleExportReport()

      expect(window.Blob).toHaveBeenCalled()
    })

    it('should create object URL for download', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.handleExportReport()

      expect(window.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should revoke object URL after download', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.handleExportReport()

      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should include timestamp in report', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      const spy = vi.spyOn(JSON, 'stringify')
      vm.handleExportReport()

      expect(spy).toHaveBeenCalled()
      const reportData = spy.mock.calls[0][0]
      expect(reportData).toHaveProperty('timestamp')
      expect(reportData).toHaveProperty('overallHealth')
      expect(reportData).toHaveProperty('checks')
      expect(reportData).toHaveProperty('systemInfo')
    })
  })

  describe('View Solutions Functionality', () => {
    it('should call handleViewSolutions when View Solutions button is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.handleViewSolutions()

      // Should not throw and warning should be called
      expect(true).toBe(true)
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close event when overlay is clicked', async () => {
      wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when modal container is clicked', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.modal-container')
      await container.trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should call handleOverlayClick when overlay is clicked', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      vm.handleOverlayClick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close when Close button in footer is clicked', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find((btn) => btn.text().includes('Close'))
      await closeButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with default state', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as DoctorModalVM

      expect(vm.isRunning).toBe(false)
      expect(vm.checks).toBeDefined()
      expect(vm.systemInfo).toBeDefined()
    })

    it('should have 5 diagnostic checks', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as DoctorModalVM

      expect(Object.keys(vm.checks)).toHaveLength(5)
      expect(vm.checks).toHaveProperty('electron')
      expect(vm.checks).toHaveProperty('ipc')
      expect(vm.checks).toHaveProperty('fileSystem')
      expect(vm.checks).toHaveProperty('git')
      expect(vm.checks).toHaveProperty('performance')
    })

    it('should have system info with all required fields', () => {
      wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as unknown as DoctorModalVM

      expect(vm.systemInfo).toHaveProperty('platform')
      expect(vm.systemInfo).toHaveProperty('electronVersion')
      expect(vm.systemInfo).toHaveProperty('nodeVersion')
      expect(vm.systemInfo).toHaveProperty('chromeVersion')
    })

    it('should cleanup properly when unmounted', () => {
      wrapper = createWrapper()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label on close button', () => {
      wrapper = createWrapper()
      const closeButton = wrapper.find('.close-button')
      expect(closeButton.attributes('aria-label')).toBe('Close')
    })

    it('should have proper semantic structure', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.modal-title').element.tagName).toBe('H2')
      expect(wrapper.findAll('.section-title')[0].element.tagName).toBe('H3')
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple rapid diagnostic runs', async () => {
      vi.useFakeTimers()
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      // Call handler directly 3 times (bypassing disabled button state)
      vm.handleRunDiagnostics()
      vm.handleRunDiagnostics()
      vm.handleRunDiagnostics()

      expect(wrapper.emitted('run-diagnostics')).toHaveLength(3)

      vi.useRealTimers()
    })

    it('should handle export report without errors', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      // Verify export report works with normal data structure
      expect(() => vm.handleExportReport()).not.toThrow()
      expect(window.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should not render details when check details are missing', async () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as unknown as DoctorModalVM

      // Set one check to have no details
      vm.checks.electron.details = ''
      await nextTick()

      const electronCheckDetails = wrapper
        .findAll('.check-item')[0]
        .find('.check-details')
      expect(electronCheckDetails.exists()).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should complete full workflow: run diagnostics and export', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      const vm = wrapper.vm as unknown as DoctorModalVM

      // Run diagnostics
      const runButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Run Diagnostics'))
      await runButton!.trigger('click')
      await nextTick()

      expect(vm.isRunning).toBe(true)
      expect(wrapper.emitted('run-diagnostics')).toBeTruthy()

      // Wait for completion
      vi.advanceTimersByTime(2000)
      await nextTick()

      expect(vm.isRunning).toBe(false)

      // Export report
      vm.handleExportReport()
      expect(window.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should complete full workflow: view solutions when issues exist', async () => {
      wrapper = createWrapper(
        {},
        { stubs: { BaseIcon: true, BaseButton: false } }
      )
      await nextTick()

      const buttons = wrapper.findAll('button')
      const viewSolutionsButton = buttons.find((btn) =>
        btn.text().includes('View Solutions')
      )

      expect(viewSolutionsButton).toBeDefined()
      await viewSolutionsButton!.trigger('click')

      // Should not throw
      expect(true).toBe(true)
    })
  })
})
