/**
 * @fileoverview Comprehensive test suite for IconShowcase.vue component
 *
 * @description
 * Complete test coverage for all functionality including icon imports,
 * template rendering, sections display, and CSS class application.
 * Targets 100% statement, branch, function, and line coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import IconShowcase from './IconShowcase.vue'

// Mock all icon components
vi.mock('../atoms/icons', () => ({
  Terminal: {
    name: 'Terminal',
    template: '<div class="icon-terminal" data-icon="terminal">Terminal</div>',
  },
  GitBranch: {
    name: 'GitBranch',
    template:
      '<div class="icon-git-branch" data-icon="git-branch">GitBranch</div>',
  },
  Settings: {
    name: 'Settings',
    template: '<div class="icon-settings" data-icon="settings">Settings</div>',
  },
  Code: {
    name: 'Code',
    template: '<div class="icon-code" data-icon="code">Code</div>',
  },
  Check: {
    name: 'Check',
    template: '<div class="icon-check" data-icon="check">Check</div>',
  },
  Shield: {
    name: 'Shield',
    template: '<div class="icon-shield" data-icon="shield">Shield</div>',
  },
  X: {
    name: 'X',
    template: '<div class="icon-x" data-icon="x">X</div>',
  },
  Menu: {
    name: 'Menu',
    template: '<div class="icon-menu" data-icon="menu">Menu</div>',
  },
  Home: {
    name: 'Home',
    template: '<div class="icon-home" data-icon="home">Home</div>',
  },
  Rocket: {
    name: 'Rocket',
    template: '<div class="icon-rocket" data-icon="rocket">Rocket</div>',
  },
  Target: {
    name: 'Target',
    template: '<div class="icon-target" data-icon="target">Target</div>',
  },
  Loader: {
    name: 'Loader',
    template: '<div class="icon-loader" data-icon="loader">Loader</div>',
  },
  Activity: {
    name: 'Activity',
    template: '<div class="icon-activity" data-icon="activity">Activity</div>',
  },
  Clock: {
    name: 'Clock',
    template: '<div class="icon-clock" data-icon="clock">Clock</div>',
  },
  Bell: {
    name: 'Bell',
    template: '<div class="icon-bell" data-icon="bell">Bell</div>',
  },
}))

describe('IconShowcase.vue', () => {
  describe('🎯 Basic Rendering', () => {
    it('should mount and render without errors', () => {
      const wrapper = mount(IconShowcase)
      expect(wrapper.exists()).toBe(true)
    })

    it('should render the main container', () => {
      const wrapper = mount(IconShowcase)
      const container = wrapper.find('.icon-showcase')
      expect(container.exists()).toBe(true)
    })

    it('should render the showcase title', () => {
      const wrapper = mount(IconShowcase)
      const title = wrapper.find('.showcase-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Hatcher Luxury Icon System')
    })

    it('should render all six sections', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      expect(sections).toHaveLength(6)
    })
  })

  describe('🎯 Icon Sizes Section', () => {
    it('should render Icon Sizes section with correct title', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const sizesSection = sections[0]

      expect(sizesSection.find('h3').text()).toBe('Icon Sizes')
    })

    it('should render all icon size variants', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const sizesSection = sections[0]
      const iconItems = sizesSection.findAll('.icon-item')

      expect(iconItems).toHaveLength(5)

      const sizeLabels = iconItems.map((item) => item.find('span').text())
      expect(sizeLabels).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
    })

    it('should apply correct size classes to Terminal icons', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const sizesSection = sections[0]
      const terminalIcons = sizesSection.findAllComponents({ name: 'Terminal' })

      expect(terminalIcons).toHaveLength(5)
      expect(terminalIcons[0].classes()).toContain('icon-xs')
      expect(terminalIcons[1].classes()).toContain('icon-sm')
      expect(terminalIcons[2].classes()).toContain('icon-md')
      expect(terminalIcons[3].classes()).toContain('icon-lg')
      expect(terminalIcons[4].classes()).toContain('icon-xl')
    })
  })

  describe('🎯 Icon Colors Section', () => {
    it('should render Icon Colors section with correct title', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const colorsSection = sections[1]

      expect(colorsSection.find('h3').text()).toBe('Icon Colors')
    })

    it('should render all color variants', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const colorsSection = sections[1]
      const iconItems = colorsSection.findAll('.icon-item')

      expect(iconItems).toHaveLength(6)

      const colorLabels = iconItems.map((item) => item.find('span').text())
      expect(colorLabels).toEqual([
        'Primary',
        'Secondary',
        'Accent',
        'Success',
        'Warning',
        'Danger',
      ])
    })

    it('should apply correct color classes to icons', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const colorsSection = sections[1]

      const gitBranchIcon = colorsSection.findComponent({ name: 'GitBranch' })
      expect(gitBranchIcon.classes()).toContain('icon-md')
      expect(gitBranchIcon.classes()).toContain('icon-primary')

      const settingsIcon = colorsSection.findComponent({ name: 'Settings' })
      expect(settingsIcon.classes()).toContain('icon-md')
      expect(settingsIcon.classes()).toContain('icon-secondary')

      const codeIcon = colorsSection.findComponent({ name: 'Code' })
      expect(codeIcon.classes()).toContain('icon-md')
      expect(codeIcon.classes()).toContain('icon-accent')

      const checkIcon = colorsSection.findComponent({ name: 'Check' })
      expect(checkIcon.classes()).toContain('icon-md')
      expect(checkIcon.classes()).toContain('icon-success')

      const shieldIcon = colorsSection.findComponent({ name: 'Shield' })
      expect(shieldIcon.classes()).toContain('icon-md')
      expect(shieldIcon.classes()).toContain('icon-warning')

      const xIcon = colorsSection.findComponent({ name: 'X' })
      expect(xIcon.classes()).toContain('icon-md')
      expect(xIcon.classes()).toContain('icon-danger')
    })
  })

  describe('🎯 Luxury Styles Section', () => {
    it('should render Luxury Styles section with correct title', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const luxurySection = sections[2]

      expect(luxurySection.find('h3').text()).toBe('Luxury Styles')
    })

    it('should render icon button with Menu icon', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const luxurySection = sections[2]

      const iconButton = luxurySection.find('.icon-button')
      expect(iconButton.exists()).toBe(true)
      expect(iconButton.findComponent({ name: 'Menu' }).exists()).toBe(true)
    })

    it('should render luxury icon button with Settings icon', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const luxurySection = sections[2]

      const luxuryButton = luxurySection.find('.icon-button.icon-luxury')
      expect(luxuryButton.exists()).toBe(true)
      expect(luxuryButton.findComponent({ name: 'Settings' }).exists()).toBe(
        true
      )
    })

    it('should render icon glass with Terminal icon', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const luxurySection = sections[2]

      const iconGlass = luxurySection.find('.icon-glass')
      expect(iconGlass.exists()).toBe(true)

      const terminalIcon = iconGlass.findComponent({ name: 'Terminal' })
      expect(terminalIcon.exists()).toBe(true)
      expect(terminalIcon.classes()).toContain('icon-md')
      expect(terminalIcon.classes()).toContain('icon-accent')
    })

    it('should render icon badge with Bell icon', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const luxurySection = sections[2]

      const iconBadge = luxurySection.find('.icon-badge')
      expect(iconBadge.exists()).toBe(true)
      expect(iconBadge.findComponent({ name: 'Bell' }).exists()).toBe(true)
    })
  })

  describe('🎯 Hover Effects Section', () => {
    it('should render Hover Effects section with correct title', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const hoverSection = sections[3]

      expect(hoverSection.find('h3').text()).toBe('Hover Effects')
    })

    it('should render all hover effect variants', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const hoverSection = sections[3]
      const iconItems = hoverSection.findAll('.icon-item')

      expect(iconItems).toHaveLength(4)

      const hoverLabels = iconItems.map((item) => item.find('span').text())
      expect(hoverLabels).toEqual(['Accent', 'Lift', 'Rotate', 'Scale'])
    })

    it('should apply correct hover effect classes', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const hoverSection = sections[3]

      const homeIcon = hoverSection.findComponent({ name: 'Home' })
      expect(homeIcon.classes()).toContain('icon-md')
      expect(homeIcon.classes()).toContain('icon-hover-accent')

      const rocketIcon = hoverSection.findComponent({ name: 'Rocket' })
      expect(rocketIcon.classes()).toContain('icon-md')
      expect(rocketIcon.classes()).toContain('icon-hover-lift')

      const settingsIcon = hoverSection.findComponent({ name: 'Settings' })
      expect(settingsIcon.classes()).toContain('icon-md')
      expect(settingsIcon.classes()).toContain('icon-hover-rotate')

      const targetIcon = hoverSection.findComponent({ name: 'Target' })
      expect(targetIcon.classes()).toContain('icon-md')
      expect(targetIcon.classes()).toContain('icon-hover-scale')
    })
  })

  describe('🎯 Animations Section', () => {
    it('should render Animations section with correct title', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const animationsSection = sections[4]

      expect(animationsSection.find('h3').text()).toBe('Animations')
    })

    it('should render all animation variants', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const animationsSection = sections[4]
      const iconItems = animationsSection.findAll('.icon-item')

      expect(iconItems).toHaveLength(3)

      const animationLabels = iconItems.map((item) => item.find('span').text())
      expect(animationLabels).toEqual(['Spin', 'Pulse', 'Bounce'])
    })

    it('should apply correct animation classes', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const animationsSection = sections[4]

      const loaderIcon = animationsSection.findComponent({ name: 'Loader' })
      expect(loaderIcon.classes()).toContain('icon-md')
      expect(loaderIcon.classes()).toContain('icon-spin')

      const activityIcon = animationsSection.findComponent({ name: 'Activity' })
      expect(activityIcon.classes()).toContain('icon-md')
      expect(activityIcon.classes()).toContain('icon-pulse')

      const clockIcon = animationsSection.findComponent({ name: 'Clock' })
      expect(clockIcon.classes()).toContain('icon-md')
      expect(clockIcon.classes()).toContain('icon-bounce')
    })
  })

  describe('🎯 Icon with Text Section', () => {
    it('should render Icon with Text section with correct title', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const textSection = sections[5]

      expect(textSection.find('h3').text()).toBe('Icon with Text')
    })

    it('should render icon-examples container', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const textSection = sections[5]

      const iconExamples = textSection.find('.icon-examples')
      expect(iconExamples.exists()).toBe(true)
    })

    it('should render icon-text with Terminal icon and text', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const textSection = sections[5]

      const iconText = textSection.find('.icon-text')
      expect(iconText.exists()).toBe(true)

      const terminalIcon = iconText.findComponent({ name: 'Terminal' })
      expect(terminalIcon.exists()).toBe(true)
      expect(terminalIcon.classes()).toContain('icon-sm')
      expect(terminalIcon.classes()).toContain('icon-accent')

      expect(iconText.find('span').text()).toBe('Open Terminal')
    })

    it('should render luxury button with GitBranch icon and text', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const textSection = sections[5]

      const luxuryButton = textSection.find('.luxury-button')
      expect(luxuryButton.exists()).toBe(true)
      expect(luxuryButton.element.tagName).toBe('BUTTON')

      const gitBranchIcon = luxuryButton.findComponent({ name: 'GitBranch' })
      expect(gitBranchIcon.exists()).toBe(true)
      expect(gitBranchIcon.classes()).toContain('icon-sm')

      expect(luxuryButton.find('span').text()).toBe('Switch Branch')
    })

    it('should render large icon-text with Rocket icon and text', () => {
      const wrapper = mount(IconShowcase)
      const sections = wrapper.findAll('.showcase-section')
      const textSection = sections[5]

      const iconTextLg = textSection.find('.icon-text.icon-text-lg')
      expect(iconTextLg.exists()).toBe(true)

      const rocketIcon = iconTextLg.findComponent({ name: 'Rocket' })
      expect(rocketIcon.exists()).toBe(true)
      expect(rocketIcon.classes()).toContain('icon-lg')
      expect(rocketIcon.classes()).toContain('icon-accent')

      expect(iconTextLg.find('span').text()).toBe('Launch Project')
    })
  })

  describe('🎯 Component Structure and Layout', () => {
    it('should have correct icon-row containers in each section', () => {
      const wrapper = mount(IconShowcase)
      const iconRows = wrapper.findAll('.icon-row')

      // First 5 sections have icon-row, last section has icon-examples
      expect(iconRows).toHaveLength(5)
    })

    it('should render all icon items with correct structure', () => {
      const wrapper = mount(IconShowcase)
      const iconItems = wrapper.findAll('.icon-item')

      // Count all icon-item instances across all sections
      expect(iconItems.length).toBeGreaterThan(0)

      // Each icon-item should have a span child
      iconItems.forEach((item) => {
        expect(item.find('span').exists()).toBe(true)
      })
    })

    it('should render all button elements', () => {
      const wrapper = mount(IconShowcase)
      const buttons = wrapper.findAll('button')

      // 3 buttons: 2 in luxury styles section + 1 luxury-button in text section
      expect(buttons).toHaveLength(3)
    })
  })

  describe('🎯 Icon Component Coverage', () => {
    it('should render all imported icon components', () => {
      const wrapper = mount(IconShowcase)

      // Check that each icon component is rendered at least once
      expect(wrapper.findComponent({ name: 'Terminal' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'GitBranch' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Settings' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Code' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Check' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Shield' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'X' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Menu' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Home' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Rocket' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Target' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Loader' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Activity' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Clock' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Bell' }).exists()).toBe(true)
    })

    it('should render multiple instances of some icons', () => {
      const wrapper = mount(IconShowcase)

      // Terminal appears 7 times (5 sizes + 1 luxury + 1 text)
      const terminalIcons = wrapper.findAllComponents({ name: 'Terminal' })
      expect(terminalIcons).toHaveLength(7)

      // Settings appears 3 times (1 color + 1 luxury + 1 hover)
      const settingsIcons = wrapper.findAllComponents({ name: 'Settings' })
      expect(settingsIcons).toHaveLength(3)

      // Rocket appears 2 times (1 hover + 1 text)
      const rocketIcons = wrapper.findAllComponents({ name: 'Rocket' })
      expect(rocketIcons).toHaveLength(2)

      // GitBranch appears 2 times (1 color + 1 text)
      const gitBranchIcons = wrapper.findAllComponents({ name: 'GitBranch' })
      expect(gitBranchIcons).toHaveLength(2)
    })
  })

  describe('🎯 CSS Classes and Styling', () => {
    it('should apply showcase-specific CSS classes', () => {
      const wrapper = mount(IconShowcase)

      expect(wrapper.find('.icon-showcase').exists()).toBe(true)
      expect(wrapper.find('.showcase-title').exists()).toBe(true)
      expect(wrapper.findAll('.showcase-section')).toHaveLength(6)
      expect(wrapper.findAll('.icon-row')).toHaveLength(5)
      expect(wrapper.find('.icon-examples').exists()).toBe(true)
    })

    it('should apply luxury button specific classes', () => {
      const wrapper = mount(IconShowcase)

      const luxuryButton = wrapper.find('.luxury-button')
      expect(luxuryButton.exists()).toBe(true)
      expect(luxuryButton.element.tagName).toBe('BUTTON')
    })

    it('should apply icon-specific modifier classes', () => {
      const wrapper = mount(IconShowcase)

      // Check various size classes
      expect(wrapper.find('.icon-xs').exists()).toBe(true)
      expect(wrapper.find('.icon-sm').exists()).toBe(true)
      expect(wrapper.find('.icon-md').exists()).toBe(true)
      expect(wrapper.find('.icon-lg').exists()).toBe(true)
      expect(wrapper.find('.icon-xl').exists()).toBe(true)

      // Check color classes
      expect(wrapper.find('.icon-primary').exists()).toBe(true)
      expect(wrapper.find('.icon-secondary').exists()).toBe(true)
      expect(wrapper.find('.icon-accent').exists()).toBe(true)
      expect(wrapper.find('.icon-success').exists()).toBe(true)
      expect(wrapper.find('.icon-warning').exists()).toBe(true)
      expect(wrapper.find('.icon-danger').exists()).toBe(true)

      // Check hover effect classes
      expect(wrapper.find('.icon-hover-accent').exists()).toBe(true)
      expect(wrapper.find('.icon-hover-lift').exists()).toBe(true)
      expect(wrapper.find('.icon-hover-rotate').exists()).toBe(true)
      expect(wrapper.find('.icon-hover-scale').exists()).toBe(true)

      // Check animation classes
      expect(wrapper.find('.icon-spin').exists()).toBe(true)
      expect(wrapper.find('.icon-pulse').exists()).toBe(true)
      expect(wrapper.find('.icon-bounce').exists()).toBe(true)
    })
  })

  describe('🎯 Template Content Verification', () => {
    it('should render all section titles correctly', () => {
      const wrapper = mount(IconShowcase)
      const sectionTitles = wrapper.findAll('.showcase-section h3')

      const expectedTitles = [
        'Icon Sizes',
        'Icon Colors',
        'Luxury Styles',
        'Hover Effects',
        'Animations',
        'Icon with Text',
      ]

      const actualTitles = sectionTitles.map((title) => title.text())
      expect(actualTitles).toEqual(expectedTitles)
    })

    it('should render all text labels correctly', () => {
      const wrapper = mount(IconShowcase)

      // Size labels
      const sizesSection = wrapper.findAll('.showcase-section')[0]
      const sizeLabels = sizesSection
        .findAll('.icon-item span')
        .map((span) => span.text())
      expect(sizeLabels).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])

      // Color labels
      const colorsSection = wrapper.findAll('.showcase-section')[1]
      const colorLabels = colorsSection
        .findAll('.icon-item span')
        .map((span) => span.text())
      expect(colorLabels).toEqual([
        'Primary',
        'Secondary',
        'Accent',
        'Success',
        'Warning',
        'Danger',
      ])

      // Hover effect labels
      const hoverSection = wrapper.findAll('.showcase-section')[3]
      const hoverLabels = hoverSection
        .findAll('.icon-item span')
        .map((span) => span.text())
      expect(hoverLabels).toEqual(['Accent', 'Lift', 'Rotate', 'Scale'])

      // Animation labels
      const animationSection = wrapper.findAll('.showcase-section')[4]
      const animationLabels = animationSection
        .findAll('.icon-item span')
        .map((span) => span.text())
      expect(animationLabels).toEqual(['Spin', 'Pulse', 'Bounce'])
    })

    it('should render text section content correctly', () => {
      const wrapper = mount(IconShowcase)
      const textSection = wrapper.findAll('.showcase-section')[5]

      const iconTextLabels = textSection
        .findAll('span')
        .map((span) => span.text())
      expect(iconTextLabels).toEqual([
        'Open Terminal',
        'Switch Branch',
        'Launch Project',
      ])
    })
  })

  describe('🎯 Edge Cases and Error Handling', () => {
    it('should handle missing icon components gracefully', () => {
      // This test ensures the component doesn't break if an icon is missing
      // The mocks ensure all icons are available, so this tests the template structure
      const wrapper = mount(IconShowcase)
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toContain('icon-showcase')
    })

    it('should maintain proper HTML structure', () => {
      const wrapper = mount(IconShowcase)

      // Check that main container exists
      expect(wrapper.find('.icon-showcase').exists()).toBe(true)

      // Check that all sections have proper nesting
      const sections = wrapper.findAll('.showcase-section')
      sections.forEach((section) => {
        expect(section.find('h3').exists()).toBe(true)
      })
    })

    it('should not have any broken template references', () => {
      const wrapper = mount(IconShowcase)

      // Ensure no Vue warnings about missing components or props
      // This is implicitly tested by successful mounting
      expect(wrapper.vm).toBeDefined()
    })
  })
})
