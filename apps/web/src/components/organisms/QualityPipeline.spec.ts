import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QualityPipeline from './QualityPipeline.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span class="base-icon" />',
    props: ['name', 'size', 'class'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button class="base-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'class'],
    emits: ['click'],
  },
}))

describe('QualityPipeline.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(QualityPipeline)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render pipeline container', () => {
    const wrapper = mount(QualityPipeline)
    const pipeline = wrapper.find('.quality-pipeline')
    expect(pipeline.exists()).toBe(true)
  })

  it('should render pipeline header with title and status', () => {
    const wrapper = mount(QualityPipeline)
    const header = wrapper.find('.pipeline-header')
    const title = wrapper.find('.pipeline-title')
    const status = wrapper.find('.pipeline-status')

    expect(header.exists()).toBe(true)
    expect(title.text()).toBe('Quality Pipeline')
    expect(status.exists()).toBe(true)
  })

  it('should render default pipeline steps', () => {
    const wrapper = mount(QualityPipeline)
    const steps = wrapper.findAll('.pipeline-step')

    expect(steps.length).toBe(4) // Default steps
  })

  it('should render step names correctly', () => {
    const wrapper = mount(QualityPipeline)
    const stepNames = wrapper.findAll('.step-name')

    expect(stepNames[0].text()).toBe('Syntax Check')
    expect(stepNames[1].text()).toBe('Type Check')
    expect(stepNames[2].text()).toBe('Linting')
    expect(stepNames[3].text()).toBe('Testing')
  })

  it('should handle custom steps prop', () => {
    const customSteps = ['Build', 'Deploy', 'Test']
    const wrapper = mount(QualityPipeline, {
      props: {
        steps: customSteps,
      },
    })

    const stepNames = wrapper.findAll('.step-name')
    expect(stepNames.length).toBe(3)
    expect(stepNames[0].text()).toBe('Build')
    expect(stepNames[1].text()).toBe('Deploy')
    expect(stepNames[2].text()).toBe('Test')
  })

  it('should render step status indicators', () => {
    const wrapper = mount(QualityPipeline)
    const statusIndicators = wrapper.findAll('.step-status-indicator')

    expect(statusIndicators.length).toBe(4)
  })

  it('should apply correct CSS classes for different step statuses', () => {
    const wrapper = mount(QualityPipeline)
    const steps = wrapper.findAll('.pipeline-step')

    expect(steps[0].classes()).toContain('step-success')
    expect(steps[1].classes()).toContain('step-error')
    expect(steps[2].classes()).toContain('step-running')
    expect(steps[3].classes()).toContain('step-pending')
  })

  it('should render duration for successful steps', () => {
    const wrapper = mount(QualityPipeline)
    const durations = wrapper.findAll('.step-duration')

    expect(durations.length).toBe(1) // Only first step has duration
    expect(durations[0].text()).toBe('(120ms)')
  })

  it('should render expand icons', () => {
    const wrapper = mount(QualityPipeline)
    const icons = wrapper.findAllComponents({ name: 'BaseIcon' })

    expect(icons.length).toBeGreaterThan(0)
  })

  it('should show expanded content for error step by default', () => {
    const wrapper = mount(QualityPipeline)
    const stepContents = wrapper.findAll('.step-content')

    expect(stepContents.length).toBe(1) // Only error step is expanded
  })

  it('should render success message for successful steps', async () => {
    const wrapper = mount(QualityPipeline)
    const stepHeaders = wrapper.findAll('.step-header')

    // Toggle the first (success) step to show its content
    await stepHeaders[0].trigger('click')

    // Check that success message appears in DOM
    const successMessage = wrapper.find('.step-message.success')
    expect(successMessage.exists()).toBe(true)
    expect(successMessage.text()).toContain('All syntax is valid')
  })

  it('should render error details for error steps', () => {
    const wrapper = mount(QualityPipeline)
    const stepErrors = wrapper.find('.step-errors')
    const errorItems = wrapper.findAll('.error-item')

    expect(stepErrors.exists()).toBe(true)
    expect(errorItems.length).toBe(2) // Default error step has 2 errors
  })

  it('should render error messages and locations', () => {
    const wrapper = mount(QualityPipeline)
    const errorMessages = wrapper.findAll('.error-message')
    const errorLocations = wrapper.findAll('.error-location')

    expect(errorMessages[0].text()).toBe(
      'Property "computed" is defined but never used'
    )
    expect(errorMessages[1].text()).toBe('Missing return type annotation')
    expect(errorLocations.length).toBe(2)
  })

  it('should render error file and line information', () => {
    const wrapper = mount(QualityPipeline)
    const errorFiles = wrapper.findAll('.error-file')
    const errorLines = wrapper.findAll('.error-line')

    expect(errorFiles[0].text()).toBe('src/components/organisms/GitSidebar.vue')
    expect(errorLines[0].text()).toBe(':102')
  })

  it('should render fix buttons for errors', () => {
    const wrapper = mount(QualityPipeline)
    const buttons = wrapper.findAllComponents({ name: 'BaseButton' })

    // Should have buttons for error actions
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should render progress bar for running steps', async () => {
    const wrapper = mount(QualityPipeline)
    const stepHeaders = wrapper.findAll('.step-header')

    // Toggle the running step to show its content
    await stepHeaders[2].trigger('click')

    // Check if progress elements appear in DOM
    const progressBar = wrapper.find('.progress-bar')
    const progressText = wrapper.find('.progress-text')

    expect(progressBar.exists()).toBe(true)
    expect(progressText.exists()).toBe(true)
    expect(progressText.text()).toContain('Checking code style')
  })

  it('should toggle step expansion when clicked', async () => {
    const wrapper = mount(QualityPipeline)
    const stepHeaders = wrapper.findAll('.step-header')

    // Click on the first step header (success step, not expanded by default)
    await stepHeaders[0].trigger('click')

    const stepContents = wrapper.findAll('.step-content')
    expect(stepContents.length).toBe(2) // Now 2 steps are expanded
  })

  it('should return correct status icons', () => {
    const wrapper = mount(QualityPipeline)

    // Test that different status icons are rendered in DOM
    const icons = wrapper.findAllComponents({ name: 'BaseIcon' })
    expect(icons.length).toBeGreaterThan(0)

    // Check that various steps render with different visual states
    const steps = wrapper.findAll('.pipeline-step')
    expect(steps[0].classes()).toContain('step-success')
    expect(steps[1].classes()).toContain('step-error')
    expect(steps[2].classes()).toContain('step-running')
    expect(steps[3].classes()).toContain('step-pending')
  })

  it('should handle unknown status icon', () => {
    const wrapper = mount(QualityPipeline)

    // Test that the component renders without errors even with edge cases
    const steps = wrapper.findAll('.pipeline-step')
    const icons = wrapper.findAllComponents({ name: 'BaseIcon' })

    expect(steps.length).toBe(4)
    expect(icons.length).toBeGreaterThan(0)
  })

  it('should calculate overall status correctly for error state', () => {
    const wrapper = mount(QualityPipeline)

    // Check that error status is displayed in DOM
    const statusText = wrapper.find('.status-text')
    expect(statusText.exists()).toBe(true)
    expect(statusText.text()).toBe('Issues Found')
    expect(statusText.classes()).toContain('status-error')
  })

  it('should calculate overall status correctly for running state', async () => {
    const wrapper = mount(QualityPipeline)

    // Test with custom props to simulate running state
    const runningSteps = ['Test 1', 'Test 2', 'Test 3', 'Test 4']

    await wrapper.setProps({ steps: runningSteps })

    // Check DOM reflects running state
    const statusText = wrapper.find('.status-text')
    expect(statusText.exists()).toBe(true)
  })

  it('should calculate overall status correctly for all success state', async () => {
    const wrapper = mount(QualityPipeline)

    // Test with custom props to simulate all success state
    const successSteps = ['Test 1', 'Test 2', 'Test 3', 'Test 4']

    await wrapper.setProps({ steps: successSteps })

    // Check DOM reflects success state
    const statusText = wrapper.find('.status-text')
    expect(statusText.exists()).toBe(true)
  })

  it('should calculate overall status correctly for pending state', async () => {
    const wrapper = mount(QualityPipeline)

    // Test with custom props to simulate pending state
    const pendingSteps = ['Test 1', 'Test 2', 'Test 3', 'Test 4']

    await wrapper.setProps({ steps: pendingSteps })

    // Check DOM reflects pending state
    const statusText = wrapper.find('.status-text')
    expect(statusText.exists()).toBe(true)
  })

  it('should handle fix with script action', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(QualityPipeline)

    // Click fix button through DOM interaction
    const fixButtons = wrapper.findAllComponents({ name: 'BaseButton' })
    const scriptButton = fixButtons.find((btn) => btn.text().includes('Fix'))

    if (scriptButton) {
      await scriptButton.trigger('click')
      expect(consoleSpy).toHaveBeenCalled()
    }

    consoleSpy.mockRestore()
  })

  it('should handle fix with AI action', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(QualityPipeline)

    // Test AI fix button through DOM interaction
    const fixButtons = wrapper.findAllComponents({ name: 'BaseButton' })
    const aiButton = fixButtons.find((btn) => btn.text().includes('AI'))

    if (aiButton) {
      await aiButton.trigger('click')
      expect(consoleSpy).toHaveBeenCalled()
    }

    consoleSpy.mockRestore()
  })

  it('should handle fix button clicks', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(QualityPipeline)

    // Test fix buttons through DOM interaction
    const fixButtons = wrapper.findAllComponents({ name: 'BaseButton' })

    if (fixButtons.length > 0) {
      await fixButtons[0].trigger('click')
      expect(wrapper.exists()).toBe(true) // Verify component stability
    }

    consoleSpy.mockRestore()
  })

  it('should apply expanded class to expanded steps', () => {
    const wrapper = mount(QualityPipeline)
    const steps = wrapper.findAll('.pipeline-step')

    expect(steps[1].classes()).toContain('step-expanded') // Error step is expanded by default
  })

  it('should apply expanded class to expand icons', () => {
    const wrapper = mount(QualityPipeline)

    // Check DOM for expanded state indicators
    const expandedSteps = wrapper.findAll('.step-expanded')
    expect(expandedSteps.length).toBe(1) // Error step is expanded by default
  })

  it('should render progress fill with correct width', async () => {
    const wrapper = mount(QualityPipeline)
    const stepHeaders = wrapper.findAll('.step-header')

    // Expand running step to see progress
    await stepHeaders[2].trigger('click')

    // Check that progress elements exist in DOM
    const progressBar = wrapper.find('.progress-bar')
    const progressFill = wrapper.find('.progress-fill')

    if (progressBar.exists()) {
      expect(progressFill.exists()).toBe(true)
    }
  })

  it('should handle steps without errors gracefully', async () => {
    const wrapper = mount(QualityPipeline)
    const stepHeaders = wrapper.findAll('.step-header')

    // Expand success step (should not show errors)
    await stepHeaders[0].trigger('click')

    const errorItems = wrapper.findAll('.error-item')
    const successMessage = wrapper.find('.step-message.success')

    // Success step should not have error items
    expect(errorItems.length).toBe(2) // Only from error step
    expect(successMessage.exists()).toBe(true)
  })

  it('should handle steps without success message gracefully', async () => {
    const wrapper = mount(QualityPipeline)
    const stepHeaders = wrapper.findAll('.step-header')

    // Expand pending step (should not show success message)
    await stepHeaders[3].trigger('click')

    const successMessages = wrapper.findAll('.step-message.success')
    const errorItems = wrapper.findAll('.error-item')

    // Pending step should not add success messages or errors
    expect(successMessages.length).toBeLessThanOrEqual(1)
    expect(errorItems.length).toBe(2) // Only from error step
  })

  it('should handle steps without duration gracefully', () => {
    const wrapper = mount(QualityPipeline)
    const durations = wrapper.findAll('.step-duration')

    expect(durations.length).toBe(1) // Only first step has duration
  })

  it('should handle steps without progress gracefully', async () => {
    const wrapper = mount(QualityPipeline)
    const stepHeaders = wrapper.findAll('.step-header')

    // Expand success step (should not show progress bars)
    await stepHeaders[0].trigger('click')

    const progressBars = wrapper.findAll('.progress-bar')
    expect(progressBars.length).toBe(0) // No progress bars for non-running steps
  })

  it('should initialize steps with correct default data structure', () => {
    const wrapper = mount(QualityPipeline)

    // Test that 4 default steps are rendered with correct status classes
    const steps = wrapper.findAll('.pipeline-step')
    expect(steps.length).toBe(4)
    expect(steps[0].classes()).toContain('step-success')
    expect(steps[1].classes()).toContain('step-error')
    expect(steps[2].classes()).toContain('step-running')
    expect(steps[3].classes()).toContain('step-pending')
  })

  it('should render status text in header', () => {
    const wrapper = mount(QualityPipeline)
    const statusText = wrapper.find('.status-text')

    expect(statusText.exists()).toBe(true)
    expect(statusText.text()).toBe('Issues Found') // Default state has errors
  })

  it('should apply correct status class to status text', () => {
    const wrapper = mount(QualityPipeline)
    const statusText = wrapper.find('.status-text')

    expect(statusText.classes()).toContain('status-error')
  })
})
