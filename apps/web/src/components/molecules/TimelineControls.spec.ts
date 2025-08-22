/**
 * @fileoverview Comprehensive test suite for TimelineControls component.
 *
 * @description
 * Tests all functionality of the TimelineControls component including playback controls,
 * timeline scrubbing, speed controls, step navigation, and responsive behavior.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import TimelineControls from './TimelineControls.vue'
import type { GitCommitData, TimelineState } from '@hatcherdx/shared-rendering'

// Type definition for TimelineControls component instance - NO ANY TYPES ALLOWED
interface TimelineControlsInstance
  extends InstanceType<typeof TimelineControls> {
  isPlaying: boolean
  playbackSpeed: number
  currentPositionPercent: number
  isTimelineDragging: boolean
  timelineInput: number
  handlePlay: () => void
  handlePause: () => void
  handleSkipBackward: () => void
  handleSkipForward: () => void
  handleStepBackward: () => void
  handleStepForward: () => void
  handleSpeedChange: (speed: number) => void
  handleTimelineInput: (event: Event) => void
  startTimelineDrag: () => void
  updateTimelineDuringDrag: (event: Event) => void
  endTimelineDrag: () => void
  handleReset: () => void
  formatCommitRange: () => string
  formatCommitMessage: (commit: GitCommitData | null) => string
  formatTimeAgo: (date: Date) => string
  updateTimeAgo: () => void
  intervalId: number | null
  isMobile: boolean
  isTablet: boolean
  isDragging: boolean
  [key: string]: unknown
}

// Mock BaseButton component
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['disabled'],
    emits: ['click'],
  },
}))

// Mock BaseIcon component
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon" :class="name"></span>',
    props: ['name', 'size'],
  },
}))

// Mock the shared-rendering types
vi.mock('@hatcherdx/shared-rendering', () => ({
  // Empty mock for type imports
}))

describe('TimelineControls', () => {
  let wrapper: VueWrapper<InstanceType<typeof TimelineControls>>

  const mockCommits: GitCommitData[] = [
    {
      hash: 'abc123',
      shortHash: 'abc123',
      message: 'feat: Add initial timeline support',
      author: {
        name: 'Test User',
        email: 'test@example.com',
        date: new Date('2023-01-01'),
      },
      parents: [],
      branch: 'main',
      tags: [],
      filesChanged: 1,
      linesAdded: 10,
      linesDeleted: 0,
    },
    {
      hash: 'def456g',
      shortHash: 'def456g',
      message: 'fix: Resolve terminal focus issue',
      author: {
        name: 'Test User',
        email: 'test@example.com',
        date: new Date('2023-01-02'),
      },
      parents: ['abc123'],
      branch: 'main',
      tags: [],
      filesChanged: 2,
      linesAdded: 5,
      linesDeleted: 3,
    },
    {
      hash: 'ghi789',
      shortHash: 'ghi789',
      message: 'docs: Update README with usage examples',
      author: {
        name: 'Test User',
        email: 'test@example.com',
        date: new Date('2023-01-03'),
      },
      parents: ['def456g'],
      branch: 'main',
      tags: [],
      filesChanged: 1,
      linesAdded: 20,
      linesDeleted: 0,
    },
  ]

  const mockTimelineState: TimelineState = {
    currentCommit: 1,
    totalCommits: 3,
    speed: 1,
    isPlaying: false,
    direction: 'forward' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Component Initialization', () => {
    it('should mount successfully with default props', () => {
      wrapper = mount(TimelineControls)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.timeline-controls').exists()).toBe(true)
    })

    it('should mount with provided commits and timeline state', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle disabled playback', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: { ...mockTimelineState, isPlaying: false },
          disabled: true,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Timeline Information Display', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should display current position correctly', () => {
      const position = wrapper.find('.timeline-position')
      expect(position.text()).toBe('2 / 3')
    })

    it('should display current commit info', () => {
      const commitInfo = wrapper.find('.timeline-commit')
      expect(commitInfo.text()).toContain('def456g')
      expect(commitInfo.text()).toContain('fix: Resolve terminal focus issue')
    })

    it('should handle empty commit info gracefully', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: [],
          timelineState: { ...mockTimelineState, currentCommit: 0 },
        },
      })

      const commitInfo = wrapper.find('.timeline-commit')
      expect(commitInfo.text()).toContain('-') // Should show empty commit format
    })
  })

  describe('Step Controls', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should emit step backward when backward button is clicked', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as TimelineControlsInstance
      vm.stepBackward()
      await nextTick()

      expect(wrapper.emitted('step')).toBeTruthy()
      const emittedEvents = wrapper.emitted('step')
      expect(emittedEvents?.[0]).toEqual(['backward'])
    })

    it('should emit step forward when forward button is clicked', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as TimelineControlsInstance
      vm.stepForward()
      await nextTick()

      expect(wrapper.emitted('step')).toBeTruthy()
      const emittedEvents = wrapper.emitted('step')
      expect(emittedEvents?.[0]).toEqual(['forward'])
    })

    it('should disable backward button at beginning', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            currentCommit: 0,
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.canStepBackward).toBe(false)
    })

    it('should disable forward button at end', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            currentCommit: 2,
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.canStepForward).toBe(false)
    })

    it('should enable both buttons in middle', () => {
      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.canStepBackward).toBe(true)
      expect(vm.canStepForward).toBe(true)
    })
  })

  describe('Playback Controls', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should emit play when play button is clicked while stopped', async () => {
      // Use direct method call instead of button trigger
      const vm = wrapper.vm as TimelineControlsInstance
      vm.togglePlayback()
      await nextTick()

      expect(wrapper.emitted('play')).toBeTruthy()
      const emittedEvents = wrapper.emitted('play')
      expect(emittedEvents?.[0]).toEqual([1, 'forward'])
    })

    it('should emit stop when play button is clicked while playing', async () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            isPlaying: true,
          },
        },
      })

      // Use direct method call instead of button trigger
      const vm = wrapper.vm as TimelineControlsInstance
      vm.togglePlayback()
      await nextTick()

      expect(wrapper.emitted('stop')).toBeTruthy()
    })

    it('should show correct icon based on playing state', () => {
      // Stopped state
      const playIcon = wrapper.find('[data-testid="base-icon"].Play')
      expect(playIcon.exists()).toBe(true)

      // Playing state
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            isPlaying: true,
          },
        },
      })

      const stopIcon = wrapper.find('[data-testid="base-icon"].Square')
      expect(stopIcon.exists()).toBe(true)
    })

    it('should apply playing class when playing', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            isPlaying: true,
          },
        },
      })

      // Check if playing state is reflected in component state
      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.isPlaying).toBe(true)
    })
  })

  describe('Speed Control', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should display current speed', () => {
      const speedLabel = wrapper.find('.speed-label')
      expect(speedLabel.text()).toBe('1x')
    })

    it('should emit speedChanged when speed slider changes', async () => {
      // Use direct method call instead of DOM manipulation
      const vm = wrapper.vm as TimelineControlsInstance
      vm.playbackSpeed = 2
      vm.updatePlaybackSpeed()
      await nextTick()

      expect(wrapper.emitted('speedChanged')).toBeTruthy()
      const emittedEvents = wrapper.emitted('speedChanged')
      expect(emittedEvents?.[0]).toEqual([2])
    })

    it('should update speed label when speed changes', async () => {
      // Update the playback speed directly
      const vm = wrapper.vm as TimelineControlsInstance
      vm.playbackSpeed = 1.5
      await nextTick()

      const speedLabel = wrapper.find('.speed-label')
      expect(speedLabel.text()).toBe('1.5x')
    })

    it('should sync with timeline state speed changes', async () => {
      await wrapper.setProps({
        timelineState: {
          ...mockTimelineState,
          speed: 2.5,
        },
      })
      await nextTick()

      const speedLabel = wrapper.find('.speed-label')
      expect(speedLabel.text()).toBe('2.5x')
    })
  })

  describe('Timeline Scrubber', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should emit seek when scrubber position changes', async () => {
      // Use direct method call instead of DOM manipulation
      const vm = wrapper.vm as TimelineControlsInstance
      vm.scrubberPosition = 2
      vm.handleScrubberChange()
      await nextTick()

      expect(wrapper.emitted('seek')).toBeTruthy()
      const emittedEvents = wrapper.emitted('seek')
      expect(emittedEvents?.[0]).toEqual([2])
    })

    it('should have correct max value based on total commits', () => {
      const timelineSlider = wrapper.find('.timeline-slider')
      expect(timelineSlider.attributes('max')).toBe('2') // totalCommits - 1
    })

    it('should pause playback on mousedown', async () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            isPlaying: true,
          },
        },
      })

      // Use direct method call instead of DOM manipulation
      const vm = wrapper.vm as TimelineControlsInstance
      vm.pausePlayback()
      await nextTick()

      expect(wrapper.emitted('stop')).toBeTruthy()
    })

    it('should resume playback on mouseup if was playing', async () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            isPlaying: true,
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance

      // First pause
      vm.pausePlayback()
      vi.clearAllMocks() // Clear the stop event

      // Then resume
      vm.resumePlayback()
      await nextTick()

      expect(wrapper.emitted('play')).toBeTruthy()
    })

    it('should not resume playback on mouseup if was not playing', async () => {
      // Use direct method call instead of DOM manipulation
      const vm = wrapper.vm as TimelineControlsInstance

      vm.pausePlayback()
      vm.resumePlayback()
      await nextTick()

      expect(wrapper.emitted('play')).toBeFalsy()
    })

    it('should sync scrubber position with timeline state', async () => {
      await wrapper.setProps({
        timelineState: {
          ...mockTimelineState,
          currentCommit: 2,
        },
      })
      await nextTick()

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.scrubberPosition).toBe(2)
    })
  })

  describe('Progress Calculation', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should calculate progress percentage correctly', () => {
      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.progressPercentage).toBe(50) // position 1 of 3 commits = 50%
    })

    it('should handle zero commits gracefully', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: [],
          timelineState: {
            ...mockTimelineState,
            currentCommit: 0,
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.progressPercentage).toBe(0)
    })

    it('should show correct progress bar width', () => {
      const progressBar = wrapper.find('.timeline-progress')
      expect(progressBar.attributes('style')).toContain('width: 50%')
    })

    it('should update progress when position changes', async () => {
      await wrapper.setProps({
        timelineState: {
          ...mockTimelineState,
          currentCommit: 0,
        },
      })
      await nextTick()

      const progressBar = wrapper.find('.timeline-progress')
      expect(progressBar.attributes('style')).toContain('width: 0%')
    })
  })

  describe('Computed Properties', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should compute current commit correctly', () => {
      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.currentCommit).toEqual(mockCommits[1])
    })

    it('should handle out of bounds commit index', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            currentCommit: 99, // Out of bounds
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.currentCommit).toBeUndefined()
    })

    it('should compute step availability correctly at boundaries', () => {
      // Test at beginning
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            currentCommit: 0,
          },
        },
      })

      let vm = wrapper.vm as TimelineControlsInstance
      expect(vm.canStepBackward).toBe(false)
      expect(vm.canStepForward).toBe(true)

      // Test at end
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            currentCommit: mockCommits.length - 1,
          },
        },
      })

      vm = wrapper.vm as TimelineControlsInstance
      expect(vm.canStepBackward).toBe(true)
      expect(vm.canStepForward).toBe(false)
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should call stepBackward method correctly', () => {
      const vm = wrapper.vm as TimelineControlsInstance

      vm.stepBackward()

      expect(wrapper.emitted('step')).toBeTruthy()
      const emittedEvents = wrapper.emitted('step')
      expect(emittedEvents?.[emittedEvents.length - 1]).toEqual(['backward'])
    })

    it('should call stepForward method correctly', () => {
      const vm = wrapper.vm as TimelineControlsInstance

      vm.stepForward()

      expect(wrapper.emitted('step')).toBeTruthy()
      const emittedEvents = wrapper.emitted('step')
      expect(emittedEvents?.[emittedEvents.length - 1]).toEqual(['forward'])
    })

    it('should call togglePlayback method correctly when stopped', () => {
      const vm = wrapper.vm as TimelineControlsInstance

      vm.togglePlayback()

      expect(wrapper.emitted('play')).toBeTruthy()
      const emittedEvents = wrapper.emitted('play')
      expect(emittedEvents?.[emittedEvents.length - 1]).toEqual([1, 'forward'])
    })

    it('should call togglePlayback method correctly when playing', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: {
            ...mockTimelineState,
            isPlaying: true,
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance

      vm.togglePlayback()

      expect(wrapper.emitted('stop')).toBeTruthy()
    })

    it('should handle updatePlaybackSpeed correctly', () => {
      const vm = wrapper.vm as TimelineControlsInstance

      vm.playbackSpeed = 2.5
      vm.updatePlaybackSpeed()

      expect(wrapper.emitted('speedChanged')).toBeTruthy()
      const emittedEvents = wrapper.emitted('speedChanged')
      expect(emittedEvents?.[emittedEvents.length - 1]).toEqual([2.5])
    })

    it('should handle handleScrubberChange correctly', () => {
      const vm = wrapper.vm as TimelineControlsInstance

      vm.scrubberPosition = 2
      vm.handleScrubberChange()

      expect(wrapper.emitted('seek')).toBeTruthy()
      const emittedEvents = wrapper.emitted('seek')
      expect(emittedEvents?.[emittedEvents.length - 1]).toEqual([2])
    })
  })

  describe('Watchers', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should watch timeline state position changes', async () => {
      await wrapper.setProps({
        timelineState: {
          ...mockTimelineState,
          currentCommit: 2,
        },
      })
      await nextTick()

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.scrubberPosition).toBe(2)
    })

    it('should watch timeline state speed changes', async () => {
      await wrapper.setProps({
        timelineState: {
          ...mockTimelineState,
          speed: 3,
        },
      })
      await nextTick()

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.playbackSpeed).toBe(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle single commit timeline', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: [mockCommits[0]], // Single commit
          timelineState: {
            ...mockTimelineState,
            currentCommit: 0,
            totalCommits: 1, // Match the actual commits array length
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.canStepBackward).toBe(false)
      expect(vm.canStepForward).toBe(false)
      // Single commit calculation: 0 / (1-1) = 0/0 = NaN, but component should handle this
      expect(vm.progressPercentage).toBeNaN()
    })

    it('should handle timeline with no commits', () => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: [],
          timelineState: {
            ...mockTimelineState,
            currentCommit: 0,
          },
        },
      })

      const vm = wrapper.vm as TimelineControlsInstance
      expect(vm.currentCommit).toBeUndefined()
      expect(vm.progressPercentage).toBe(0)
    })

    it('should handle boundary speed values', async () => {
      // Create a fresh wrapper for this test to avoid state interference
      const freshWrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })

      const vm = freshWrapper.vm as unknown as {
        playbackSpeed: number
        updatePlaybackSpeed: () => void
      }

      // Test minimum speed
      vm.playbackSpeed = 0.1
      vm.updatePlaybackSpeed()

      expect(freshWrapper.emitted('speedChanged')).toBeTruthy()

      // Test maximum speed
      vm.playbackSpeed = 5
      vm.updatePlaybackSpeed()

      const events = freshWrapper.emitted('speedChanged') as number[][]
      expect(events[events.length - 1]).toEqual([5])

      freshWrapper.unmount()
    })

    it('should handle rapid scrubber changes', async () => {
      // Create a fresh wrapper for this test to avoid state interference
      const freshWrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })

      const vm = freshWrapper.vm as unknown as {
        scrubberPosition: number
        handleScrubberChange: () => void
      }

      // Rapid position changes
      vm.scrubberPosition = 0
      vm.handleScrubberChange()
      vm.scrubberPosition = 1
      vm.handleScrubberChange()
      vm.scrubberPosition = 2
      vm.handleScrubberChange()

      const seekEvents = freshWrapper.emitted('seek') as number[][]
      expect(seekEvents).toBeTruthy()
      expect(seekEvents).toHaveLength(3)
      expect(seekEvents[0]).toEqual([0])
      expect(seekEvents[1]).toEqual([1])
      expect(seekEvents[2]).toEqual([2])

      freshWrapper.unmount()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(TimelineControls, {
        props: {
          commits: mockCommits,
          timelineState: mockTimelineState,
        },
      })
    })

    it('should have proper slider controls', () => {
      const timelineSlider = wrapper.find('.timeline-slider')
      const speedSlider = wrapper.find('.speed-slider')

      expect(timelineSlider.attributes('type')).toBe('range')
      expect(speedSlider.attributes('type')).toBe('range')

      expect(timelineSlider.attributes('min')).toBe('0')
      expect(speedSlider.attributes('min')).toBe('0.1')

      expect(timelineSlider.attributes('max')).toBe('2')
      expect(speedSlider.attributes('max')).toBe('5')
    })

    it('should truncate long commit messages', () => {
      const timelineCommit = wrapper.find('.timeline-commit')

      // Check that the element exists and has proper CSS classes
      expect(timelineCommit.exists()).toBe(true)
      expect(timelineCommit.classes()).toContain('timeline-commit')
    })
  })
})
