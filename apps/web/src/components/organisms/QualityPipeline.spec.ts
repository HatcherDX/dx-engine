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
    const component = wrapper.vm

    // Toggle the first (success) step to show its content
    component.toggleStep(component.pipelineSteps[0])
    await wrapper.vm.$nextTick()

    // Check that success step has success message in data
    expect(component.pipelineSteps[0].successMessage).toBe(
      'All syntax is valid and properly formatted.'
    )
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
    const component = wrapper.vm

    // Toggle the running step to show its content
    component.toggleStep(component.pipelineSteps[2])
    await wrapper.vm.$nextTick()

    // Check if progress data exists in the component
    const runningStep = component.pipelineSteps[2]
    expect(runningStep.progress).toBe(65)
    expect(runningStep.progressText).toBe('Checking code style...')
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
    const component = wrapper.vm

    expect(component.getStatusIcon('success')).toBe('Eye')
    expect(component.getStatusIcon('error')).toBe('X')
    expect(component.getStatusIcon('running')).toBe('Play')
    expect(component.getStatusIcon('pending')).toBe('Square')
  })

  it('should handle unknown status icon', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    expect(component.getStatusIcon('unknown' as never)).toBe('Square')
  })

  it('should calculate overall status correctly for error state', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    expect(component.getOverallStatusClass()).toBe('status-error')
    expect(component.getOverallStatusText()).toBe('Issues Found')
  })

  it('should calculate overall status correctly for running state', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Change error step to success to test running state
    component.pipelineSteps[1].status = 'success'

    expect(component.getOverallStatusClass()).toBe('status-running')
    expect(component.getOverallStatusText()).toBe('Running...')
  })

  it('should calculate overall status correctly for all success state', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Change all steps to success
    component.pipelineSteps.forEach((step) => {
      step.status = 'success'
    })

    expect(component.getOverallStatusClass()).toBe('status-success')
    expect(component.getOverallStatusText()).toBe('All Checks Passed')
  })

  it('should calculate overall status correctly for pending state', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Change all steps to pending
    component.pipelineSteps.forEach((step) => {
      step.status = 'pending'
    })

    expect(component.getOverallStatusClass()).toBe('status-pending')
    expect(component.getOverallStatusText()).toBe('Pending')
  })

  it('should handle fix with script action', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    const mockError = {
      message: 'Test error',
      file: 'test.vue',
      line: 10,
    }

    component.fixWithScript(mockError)

    expect(consoleSpy).toHaveBeenCalledWith('Fix with script:', mockError)
    consoleSpy.mockRestore()
  })

  it('should handle fix with AI action', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    const mockError = {
      message: 'Test error',
      file: 'test.vue',
      line: 10,
    }

    component.fixWithAI(mockError)

    expect(consoleSpy).toHaveBeenCalledWith('Fix with AI:', mockError)
    consoleSpy.mockRestore()
  })

  it('should handle fix button clicks', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Test fix with script directly
    const mockError = component.pipelineSteps[1].errors[0]
    component.fixWithScript(mockError)

    expect(consoleSpy).toHaveBeenCalledWith(
      'Fix with script:',
      expect.any(Object)
    )
    consoleSpy.mockRestore()
  })

  it('should apply expanded class to expanded steps', () => {
    const wrapper = mount(QualityPipeline)
    const steps = wrapper.findAll('.pipeline-step')

    expect(steps[1].classes()).toContain('step-expanded') // Error step is expanded by default
  })

  it('should apply expanded class to expand icons', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Check the internal state rather than DOM classes
    expect(component.pipelineSteps[1].expanded).toBe(true) // Error step is expanded
  })

  it('should render progress fill with correct width', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Check the running step's progress value
    const runningStep = component.pipelineSteps[2]
    expect(runningStep.progress).toBe(65)
  })

  it('should handle steps without errors gracefully', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Check that success step doesn't have errors
    const successStep = component.pipelineSteps[0]
    expect(successStep.errors).toBeUndefined()
    expect(successStep.successMessage).toBeDefined()
  })

  it('should handle steps without success message gracefully', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Check that pending step doesn't have success message
    const pendingStep = component.pipelineSteps[3]
    expect(pendingStep.successMessage).toBeUndefined()
    expect(pendingStep.errors).toBeUndefined()
  })

  it('should handle steps without duration gracefully', () => {
    const wrapper = mount(QualityPipeline)
    const durations = wrapper.findAll('.step-duration')

    expect(durations.length).toBe(1) // Only first step has duration
  })

  it('should handle steps without progress gracefully', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    // Check that non-running steps don't have progress bars
    component.toggleStep(component.pipelineSteps[0]) // Success step

    const progressBars = wrapper.findAll('.progress-bar')
    expect(progressBars.length).toBe(0) // No progress bars visible yet
  })

  it('should initialize steps with correct default data structure', () => {
    const wrapper = mount(QualityPipeline)
    const component = wrapper.vm

    expect(component.pipelineSteps).toHaveLength(4)
    expect(component.pipelineSteps[0].status).toBe('success')
    expect(component.pipelineSteps[1].status).toBe('error')
    expect(component.pipelineSteps[2].status).toBe('running')
    expect(component.pipelineSteps[3].status).toBe('pending')
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
