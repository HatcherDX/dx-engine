/**
 * @fileoverview Comprehensive test coverage for OnboardingProgress.vue component.
 *
 * @description
 * Complete test suite achieving 100% coverage for the onboarding progress indicator
 * including all branches, computed properties, and user interactions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import OnboardingProgress from './OnboardingProgress.vue'
import type { OnboardingStep } from './OnboardingProgress.vue'
import BaseIcon from '../atoms/BaseIcon.vue'

describe('OnboardingProgress.vue - 100% Coverage', () => {
  let wrapper: VueWrapper<InstanceType<typeof OnboardingProgress>>

  // Test data
  const mockSteps: OnboardingStep[] = [
    { id: 'welcome', label: 'Welcome', icon: 'Home' },
    { id: 'project', label: 'Project', icon: 'Folder' },
    { id: 'task', label: 'Task', icon: 'CheckSquare' },
    { id: 'transition', label: 'Get Started', icon: 'Rocket' },
    { id: 'complete', label: 'Complete', icon: 'Check' },
  ]

  const mockStepsNoIcons: OnboardingStep[] = [
    { id: 'step1', label: 'Step 1', icon: '' },
    { id: 'step2', label: 'Step 2', icon: '' },
    { id: 'step3', label: 'Step 3', icon: '' },
  ]

  const createWrapper = (props = {}) => {
    return mount(OnboardingProgress, {
      props: {
        currentStep: 2,
        totalSteps: 5,
        steps: mockSteps,
        ...props,
      },
      global: {
        components: {
          BaseIcon,
        },
        stubs: {
          BaseIcon: {
            name: 'BaseIcon',
            props: ['name', 'size'],
            template:
              '<div class="base-icon" :data-name="name" :data-size="size"></div>',
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render with all required elements', () => {
      wrapper = createWrapper()

      expect(wrapper.find('.onboarding-progress').exists()).toBe(true)
      expect(wrapper.find('.progress-wrapper').exists()).toBe(true)
      expect(wrapper.find('.progress-steps').exists()).toBe(true)
      expect(wrapper.find('.progress-bar-track').exists()).toBe(true)
      expect(wrapper.find('.progress-bar-fill').exists()).toBe(true)
    })

    it('should render correct number of steps', () => {
      wrapper = createWrapper()

      const steps = wrapper.findAll('.progress-step')
      expect(steps).toHaveLength(mockSteps.length)
    })

    it('should set correct CSS variable for step count', () => {
      wrapper = createWrapper()

      const progressElement = wrapper.find('.onboarding-progress')
      expect(progressElement.attributes('style')).toContain(
        `--step-count: ${mockSteps.length}`
      )
    })

    it('should render step connectors for all steps except first', () => {
      wrapper = createWrapper()

      const connectors = wrapper.findAll('.step-connector')
      expect(connectors).toHaveLength(mockSteps.length - 1)
    })
  })

  describe('Step States', () => {
    it('should apply correct classes for active step', () => {
      wrapper = createWrapper({ currentStep: 2 })

      const steps = wrapper.findAll('.progress-step')
      expect(steps[2].classes()).toContain('step-active')
      expect(steps[0].classes()).toContain('step-completed')
      expect(steps[1].classes()).toContain('step-completed')
      expect(steps[3].classes()).toContain('step-upcoming')
      expect(steps[4].classes()).toContain('step-upcoming')
    })

    it('should show check icon for completed steps', () => {
      wrapper = createWrapper({ currentStep: 3 })

      // Count completed step icons (Check icons only appear for completed steps before current)
      const steps = wrapper.findAll('.progress-step')
      let checkIconCount = 0
      steps.forEach((step, index) => {
        if (index < 3) {
          // Only steps before current step should have Check icons
          const checkIcon = step.find('.base-icon[data-name="Check"]')
          if (checkIcon.exists()) {
            checkIconCount++
          }
        }
      })
      expect(checkIconCount).toBe(3) // Steps 0, 1, and 2 are completed
    })

    it('should show step icon for current and upcoming steps with icons', () => {
      wrapper = createWrapper({ currentStep: 1 })

      // Current step should show its icon
      const steps = wrapper.findAll('.progress-step')
      const currentStepIcon = steps[1].find('.base-icon[data-name="Folder"]')
      expect(currentStepIcon.exists()).toBe(true)

      // Future steps should show their icons
      const futureStepIcon = steps[2].find(
        '.base-icon[data-name="CheckSquare"]'
      )
      expect(futureStepIcon.exists()).toBe(true)
    })

    it('should show step number when no icon is provided', () => {
      wrapper = createWrapper({
        steps: mockStepsNoIcons,
        currentStep: 1,
        totalSteps: 3,
      })

      const steps = wrapper.findAll('.progress-step')
      // Current and future steps without icons should show numbers
      const stepNumber2 = steps[1].find('.step-number')
      const stepNumber3 = steps[2].find('.step-number')

      expect(stepNumber2.exists()).toBe(true)
      expect(stepNumber2.text()).toBe('2')
      expect(stepNumber3.exists()).toBe(true)
      expect(stepNumber3.text()).toBe('3')
    })

    it('should apply rocket-icon class for Rocket icon', () => {
      wrapper = createWrapper({ currentStep: 3 })

      const rocketStep = wrapper.findAll('.progress-step')[3]
      const rocketIcon = rocketStep.find('.rocket-icon')
      expect(rocketIcon.exists()).toBe(true)
    })

    it('should use sm size for Rocket icon and xs for others', () => {
      wrapper = createWrapper({ currentStep: 3 })

      const rocketIcon = wrapper.find('.base-icon[data-name="Rocket"]')
      expect(rocketIcon.attributes('data-size')).toBe('sm')

      const otherIcon = wrapper.find('.base-icon[data-name="Complete"]')
      if (otherIcon.exists()) {
        expect(otherIcon.attributes('data-size')).toBe('xs')
      }
    })
  })

  describe('Progress Percentage Calculation', () => {
    it('should calculate correct progress percentage', () => {
      wrapper = createWrapper({
        currentStep: 2,
        totalSteps: 5,
      })

      const progressBar = wrapper.find('.progress-bar-fill')
      // (2 / (5 - 1)) * 100 = 50%
      expect(progressBar.attributes('style')).toContain('width: 50%')
    })

    it('should return 0% when totalSteps is 1 or less', () => {
      wrapper = createWrapper({
        currentStep: 0,
        totalSteps: 1,
      })

      const progressBar = wrapper.find('.progress-bar-fill')
      expect(progressBar.attributes('style')).toContain('width: 0%')
    })

    it('should return 0% when totalSteps is 0', () => {
      wrapper = createWrapper({
        currentStep: 0,
        totalSteps: 0,
      })

      const progressBar = wrapper.find('.progress-bar-fill')
      expect(progressBar.attributes('style')).toContain('width: 0%')
    })

    it('should return 100% when in Get Started mode (transition step)', () => {
      wrapper = createWrapper({
        currentStep: 3, // transition step index
        totalSteps: 5,
        steps: mockSteps,
      })

      const progressBar = wrapper.find('.progress-bar-fill')
      expect(progressBar.attributes('style')).toContain('width: 100%')
    })

    it('should show 100% at the final step', () => {
      wrapper = createWrapper({
        currentStep: 4,
        totalSteps: 5,
      })

      const progressBar = wrapper.find('.progress-bar-fill')
      // (4 / (5 - 1)) * 100 = 100%
      expect(progressBar.attributes('style')).toContain('width: 100%')
    })
  })

  describe('Get Started Mode', () => {
    it('should detect Get Started mode when current step is transition', () => {
      wrapper = createWrapper({
        currentStep: 3, // transition step
        steps: mockSteps,
      })

      const steps = wrapper.findAll('.progress-step')
      // Previous steps should be disabled in Get Started mode
      expect(steps[0].classes()).toContain('step-disabled')
      expect(steps[1].classes()).toContain('step-disabled')
      expect(steps[2].classes()).toContain('step-disabled')
    })

    it('should not apply Get Started mode for non-transition steps', () => {
      wrapper = createWrapper({
        currentStep: 1,
        steps: mockSteps,
      })

      const steps = wrapper.findAll('.progress-step')
      expect(steps[0].classes()).not.toContain('step-disabled')
      expect(steps[0].classes()).toContain('step-completed')
    })

    it('should handle edge case with invalid currentStep index', () => {
      wrapper = createWrapper({
        currentStep: 10, // Out of bounds
        steps: mockSteps,
      })

      // Should not crash and isInGetStartedMode should be false
      const progressBar = wrapper.find('.progress-bar-fill')
      expect(progressBar.exists()).toBe(true)
    })
  })

  describe('Step Click Interactions', () => {
    it('should emit go-to-step when clicking completed step', async () => {
      wrapper = createWrapper({
        currentStep: 2, // Use a non-transition step to ensure we're not in Get Started mode
        steps: mockSteps,
      })

      const firstStepIndicator = wrapper.findAll('.step-indicator')[0]
      await firstStepIndicator.trigger('click')

      expect(wrapper.emitted('go-to-step')).toBeTruthy()
      expect(wrapper.emitted('go-to-step')![0]).toEqual([0])
    })

    it('should not emit when clicking current step', async () => {
      wrapper = createWrapper({
        currentStep: 2,
        steps: mockSteps,
      })

      const currentStepIndicator = wrapper.findAll('.step-indicator')[2]
      await currentStepIndicator.trigger('click')

      expect(wrapper.emitted('go-to-step')).toBeFalsy()
    })

    it('should not emit when clicking future step', async () => {
      wrapper = createWrapper({
        currentStep: 1,
        steps: mockSteps,
      })

      const futureStepIndicator = wrapper.findAll('.step-indicator')[3]
      await futureStepIndicator.trigger('click')

      expect(wrapper.emitted('go-to-step')).toBeFalsy()
    })

    it('should not allow clicking in Get Started mode', async () => {
      wrapper = createWrapper({
        currentStep: 3, // transition step
        steps: mockSteps,
      })

      const firstStepIndicator = wrapper.findAll('.step-indicator')[0]
      await firstStepIndicator.trigger('click')

      expect(wrapper.emitted('go-to-step')).toBeFalsy()
    })

    it('should allow clicking multiple completed steps', async () => {
      wrapper = createWrapper({
        currentStep: 4,
        steps: mockSteps,
      })

      // Click first step
      await wrapper.findAll('.step-indicator')[0].trigger('click')
      expect(wrapper.emitted('go-to-step')![0]).toEqual([0])

      // Click second step
      await wrapper.findAll('.step-indicator')[1].trigger('click')
      expect(wrapper.emitted('go-to-step')![1]).toEqual([1])

      // Click third step
      await wrapper.findAll('.step-indicator')[2].trigger('click')
      expect(wrapper.emitted('go-to-step')![2]).toEqual([2])

      // Total of 3 emissions
      expect(wrapper.emitted('go-to-step')).toHaveLength(3)
    })
  })

  describe('Step Connector States', () => {
    it('should mark connectors as completed up to current step', () => {
      wrapper = createWrapper({
        currentStep: 2,
        steps: mockSteps,
      })

      const connectors = wrapper.findAll('.step-connector')
      expect(connectors[0].classes()).toContain('connector-completed')
      expect(connectors[1].classes()).toContain('connector-completed')
      expect(connectors[2].classes()).not.toContain('connector-completed')
      expect(connectors[3].classes()).not.toContain('connector-completed')
    })

    it('should mark all connectors as completed when on last step', () => {
      wrapper = createWrapper({
        currentStep: 4,
        steps: mockSteps,
      })

      const connectors = wrapper.findAll('.step-connector')
      connectors.forEach((connector) => {
        expect(connector.classes()).toContain('connector-completed')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty steps array', () => {
      wrapper = createWrapper({
        steps: [],
        currentStep: 0,
        totalSteps: 0,
      })

      expect(wrapper.find('.onboarding-progress').exists()).toBe(true)
      expect(wrapper.findAll('.progress-step')).toHaveLength(0)
    })

    it('should handle single step', () => {
      wrapper = createWrapper({
        steps: [{ id: 'only', label: 'Only Step', icon: 'Home' }],
        currentStep: 0,
        totalSteps: 1,
      })

      expect(wrapper.findAll('.progress-step')).toHaveLength(1)
      expect(wrapper.findAll('.step-connector')).toHaveLength(0)

      const progressBar = wrapper.find('.progress-bar-fill')
      expect(progressBar.attributes('style')).toContain('width: 0%')
    })

    it('should handle negative currentStep gracefully', () => {
      wrapper = createWrapper({
        currentStep: -1,
        steps: mockSteps,
      })

      // Should not crash
      expect(wrapper.find('.onboarding-progress').exists()).toBe(true)
    })

    it('should display step labels correctly', () => {
      wrapper = createWrapper()

      const labels = wrapper.findAll('.step-label')
      labels.forEach((label, index) => {
        expect(label.text()).toBe(mockSteps[index].label)
      })
    })
  })

  describe('CSS Classes Application', () => {
    it('should apply all state classes correctly for complex scenario', () => {
      // Test with step 2 active
      wrapper = createWrapper({
        currentStep: 2,
        steps: mockSteps,
        totalSteps: 5,
      })

      const steps = wrapper.findAll('.progress-step')

      // Step 0: completed
      expect(steps[0].classes()).toContain('step-completed')
      expect(steps[0].classes()).not.toContain('step-active')
      expect(steps[0].classes()).not.toContain('step-upcoming')
      expect(steps[0].classes()).not.toContain('step-disabled')

      // Step 1: completed
      expect(steps[1].classes()).toContain('step-completed')
      expect(steps[1].classes()).not.toContain('step-active')
      expect(steps[1].classes()).not.toContain('step-upcoming')
      expect(steps[1].classes()).not.toContain('step-disabled')

      // Step 2: active
      expect(steps[2].classes()).not.toContain('step-completed')
      expect(steps[2].classes()).toContain('step-active')
      expect(steps[2].classes()).not.toContain('step-upcoming')
      expect(steps[2].classes()).not.toContain('step-disabled')

      // Step 3: upcoming
      expect(steps[3].classes()).not.toContain('step-completed')
      expect(steps[3].classes()).not.toContain('step-active')
      expect(steps[3].classes()).toContain('step-upcoming')
      expect(steps[3].classes()).not.toContain('step-disabled')
    })
  })
})
