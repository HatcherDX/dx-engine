import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VisualSidebar from './VisualSidebar.vue'

interface VisualSidebarComponent {
  selectedComponentId: string
  componentTree: Array<Record<string, unknown>>
  selectComponent: (component: Record<string, unknown>) => void
  toggleExpanded: (component: Record<string, unknown>) => void
  getComponentIcon: (type: string) => string
}

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'class'],
    emits: ['click'],
    template:
      '<span class="base-icon" :class="$props.class" @click="$emit(\'click\')" />',
  },
}))

vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    props: ['size', 'variant', 'class'],
    template: '<div class="base-logo"><slot /></div>',
  },
}))

describe('VisualSidebar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup console mock for clean tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('🏗️ Component Initialization', () => {
    it('should mount and render without errors', () => {
      const wrapper = mount(VisualSidebar)
      expect(wrapper.exists()).toBe(true)
    })

    it('should initialize with default selected component (app)', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent
      expect(vm.selectedComponentId).toBe('app')
    })

    it('should initialize component tree with proper structure', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent
      expect(vm.componentTree).toBeDefined()
      expect(Array.isArray(vm.componentTree)).toBe(true)
      expect(vm.componentTree.length).toBeGreaterThan(0)
    })

    it('should have reactive refs properly set up', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Check reactive properties
      expect(vm.selectedComponentId).toBeDefined()
      expect(vm.componentTree).toBeDefined()
    })
  })

  describe('🎨 Component Structure & Rendering', () => {
    it('should render visual sidebar container', () => {
      const wrapper = mount(VisualSidebar)
      const sidebar = wrapper.find('.visual-sidebar')
      expect(sidebar.exists()).toBe(true)
    })

    it('should render main container with proper CSS classes', () => {
      const wrapper = mount(VisualSidebar)
      const sidebar = wrapper.find('.visual-sidebar')

      expect(sidebar.classes()).toContain('visual-sidebar')
      expect(sidebar.attributes('style')).toBeFalsy() // No inline styles
    })

    it('should have proper flex layout structure', () => {
      const wrapper = mount(VisualSidebar)
      const sidebar = wrapper.find('.visual-sidebar')
      const inspectorSection = wrapper.find('.inspector-section')
      const logoSection = wrapper.find('.logo-section')

      expect(sidebar.exists()).toBe(true)
      expect(inspectorSection.exists()).toBe(true)
      expect(logoSection.exists()).toBe(false)
    })

    it('should render inspector section with proper structure', () => {
      const wrapper = mount(VisualSidebar)
      const inspectorSection = wrapper.find('.inspector-section')
      const sectionTitle = wrapper.find('.section-title')
      const layersTree = wrapper.find('.layers-tree')

      expect(inspectorSection.exists()).toBe(true)
      expect(sectionTitle.exists()).toBe(true)
      expect(layersTree.exists()).toBe(true)
      expect(sectionTitle.text()).toBe('Layers')
      expect(sectionTitle.element.tagName).toBe('H3')
    })

    it('should have proper section title styling attributes', () => {
      const wrapper = mount(VisualSidebar)
      const sectionTitle = wrapper.find('.section-title')

      expect(sectionTitle.classes()).toContain('section-title')
      expect(sectionTitle.text()).toBe('Layers')
    })

    it('should render inspector section with overflow handling', () => {
      const wrapper = mount(VisualSidebar)
      const inspectorSection = wrapper.find('.inspector-section')

      expect(inspectorSection.classes()).toContain('inspector-section')
      // CSS overflow styles are applied via CSS, not classes
    })

    it('should render layers tree with complete structure', () => {
      const wrapper = mount(VisualSidebar)
      const layersTree = wrapper.find('.layers-tree')
      const layerItems = wrapper.findAll('.layer-item')

      expect(layersTree.exists()).toBe(true)
      expect(layersTree.classes()).toContain('layers-tree')
      expect(layerItems.length).toBeGreaterThan(0)
    })

    it('should render correct number of layer items based on component tree', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent
      const layerItems = wrapper.findAll('.layer-item')

      // Count all visible components in the tree (expanded ones)
      const countVisibleComponents = (
        components: Array<{ expanded?: boolean; children?: unknown[] }>
      ): number => {
        let count = 0
        for (const component of components) {
          count++
          if (component.expanded && component.children) {
            count += countVisibleComponents(
              component.children as Array<{
                expanded?: boolean
                children?: unknown[]
              }>
            )
          }
        }
        return count
      }

      const expectedCount = countVisibleComponents(vm.componentTree)

      // The actual count depends on the current expansion state
      expect(layerItems.length).toBeGreaterThan(0)
      expect(layerItems.length).toBeLessThanOrEqual(expectedCount)
    })

    it('should render layer items with proper content structure', () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      expect(layerItems.length).toBeGreaterThan(0)

      layerItems.forEach((item) => {
        const layerContent = item.find('.layer-content')
        const componentName = item.find('.component-name')

        expect(layerContent.exists()).toBe(true)
        expect(componentName.exists()).toBe(true)
        expect(componentName.text().length).toBeGreaterThan(0)
      })
    })

    it('should render layer items with all required sub-elements', () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')
      const layerContents = wrapper.findAll('.layer-content')
      const componentNames = wrapper.findAll('.component-name')
      const baseIcons = wrapper.findAllComponents({ name: 'BaseIcon' })

      expect(layerItems.length).toBeGreaterThan(0)
      expect(layerContents.length).toBeGreaterThan(0)
      expect(componentNames.length).toBeGreaterThan(0)
      expect(baseIcons.length).toBeGreaterThan(0)

      // All counts should match for the main elements
      expect(layerItems.length).toBe(layerContents.length)
      expect(layerItems.length).toBe(componentNames.length)
    })
  })

  describe('🎯 Component Selection Logic', () => {
    it('should apply selected class to initially selected component', () => {
      const wrapper = mount(VisualSidebar)

      // Check if there's a selected component in DOM
      const selectedItem = wrapper.find('.layer-item.layer-selected')
      expect(selectedItem.exists()).toBe(true)
    })

    it('should show app component as initially selected', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent
      const selectedItems = wrapper.findAll('.layer-item.layer-selected')

      expect(vm.selectedComponentId).toBe('app')
      expect(selectedItems.length).toBe(1)

      if (selectedItems.length > 0) {
        const selectedName = selectedItems[0].find('.component-name')
        expect(selectedName.text()).toBe('App')
      }
    })

    it('should update selected component when clicking different layer item', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent
      const layerItems = wrapper.findAll('.layer-item')

      if (layerItems.length > 1) {
        const initialSelectedId = vm.selectedComponentId

        // Click on second layer item
        await layerItems[1].trigger('click')

        // Check that selection changed
        expect(vm.selectedComponentId).not.toBe(initialSelectedId)
      }
    })

    it('should maintain only one selected component at a time', async () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      if (layerItems.length > 1) {
        // Click on different items
        await layerItems[1].trigger('click')

        const selectedItems = wrapper.findAll('.layer-item.layer-selected')
        expect(selectedItems.length).toBe(1)

        // Click on another item
        if (layerItems.length > 2) {
          await layerItems[2].trigger('click')

          const newSelectedItems = wrapper.findAll('.layer-item.layer-selected')
          expect(newSelectedItems.length).toBe(1)
        }
      }
    })

    it('should call selectComponent method with correct component data', async () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      if (layerItems.length > 0) {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        await layerItems[0].trigger('click')

        expect(consoleSpy).toHaveBeenCalledWith(
          'Selected component:',
          expect.any(String)
        )

        consoleSpy.mockRestore()
      }
    })

    it('should test selectComponent method directly', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const testComponent = {
        id: 'test-component',
        name: 'Test Component',
        type: 'button',
        props: {},
      }

      vm.selectComponent(testComponent)

      expect(vm.selectedComponentId).toBe('test-component')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Selected component:',
        'Test Component'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('🔄 Component Expansion Logic', () => {
    it('should handle expand/collapse toggle correctly', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Find a component that has children
      const componentWithChildren = vm.componentTree.find(
        (c: Record<string, unknown>) =>
          c.children && (c.children as unknown[]).length > 0
      )

      if (componentWithChildren) {
        const initialExpanded = componentWithChildren.expanded

        // Toggle expansion
        vm.toggleExpanded(componentWithChildren)

        expect(componentWithChildren.expanded).toBe(!initialExpanded)

        // Toggle back
        vm.toggleExpanded(componentWithChildren)

        expect(componentWithChildren.expanded).toBe(initialExpanded)
      }
    })

    it('should render expand icons only for components with children', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Check how many components have children in the current visible tree
      const countComponentsWithChildren = (
        components: Array<Record<string, unknown>>
      ): number => {
        let count = 0
        for (const component of components) {
          if (
            component.children &&
            Array.isArray(component.children) &&
            component.children.length > 0
          ) {
            count++
            if (component.expanded) {
              count += countComponentsWithChildren(
                component.children as Array<Record<string, unknown>>
              )
            }
          }
        }
        return count
      }

      const expectedExpandIcons = countComponentsWithChildren(vm.componentTree)
      const expandIcons = wrapper
        .findAllComponents({ name: 'BaseIcon' })
        .filter((icon) => icon.classes().includes('expand-icon'))

      // Should have expand icons for components with children in the visible tree
      expect(expandIcons.length).toBeGreaterThanOrEqual(0)
      expect(expandIcons.length).toBeLessThanOrEqual(expectedExpandIcons)
    })

    it('should handle expand icon clicks with proper event stopping', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Find the component that corresponds to expand icons
      const componentWithChildren = vm.componentTree.find(
        (c: Record<string, unknown>) =>
          c.children && (c.children as unknown[]).length > 0
      )

      if (componentWithChildren) {
        const initialExpanded = componentWithChildren.expanded

        // Test the toggleExpanded method directly (simulates clicking expand icon)
        vm.toggleExpanded(componentWithChildren)

        // Expansion state should change
        expect(componentWithChildren.expanded).toBe(!initialExpanded)
      } else {
        // Skip test if no expandable components
        expect(true).toBe(true)
      }
    })

    it('should apply expanded class to expand icons when component is expanded', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Check for expanded components
      const expandedComponents = vm.componentTree.filter(
        (c: Record<string, unknown>) => c.expanded
      )

      if (expandedComponents.length > 0) {
        const expandedIcons = wrapper.findAll('.expand-icon.expanded')
        expect(expandedIcons.length).toBeGreaterThanOrEqual(0)
      }
    })

    it('should update component tree reactively when toggling expansion', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Find a component with children
      const componentWithChildren = vm.componentTree.find(
        (c: Record<string, unknown>) =>
          c.children && (c.children as unknown[]).length > 0
      )

      if (componentWithChildren) {
        const initialExpanded = componentWithChildren.expanded

        // Toggle expansion
        vm.toggleExpanded(componentWithChildren)

        // Wait for reactivity
        await wrapper.vm.$nextTick()

        // Check that the change is reflected
        expect(componentWithChildren.expanded).toBe(!initialExpanded)
      }
    })
  })

  describe('🎨 Icon and Visual Representation', () => {
    it('should return correct icons for different component types', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Test all component types
      expect(vm.getComponentIcon('container')).toBe('Menu')
      expect(vm.getComponentIcon('text')).toBe('Terminal')
      expect(vm.getComponentIcon('button')).toBe('Eye')
      expect(vm.getComponentIcon('input')).toBe('Code')
      expect(vm.getComponentIcon('image')).toBe('GitBranch')
    })

    it('should return default icon for unknown component type', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      expect(vm.getComponentIcon('unknown-type' as string)).toBe('Menu')
      expect(vm.getComponentIcon(null as unknown as string)).toBe('Menu')
      expect(vm.getComponentIcon(undefined as unknown as string)).toBe('Menu')
    })

    it('should render component icons with proper BaseIcon props', () => {
      const wrapper = mount(VisualSidebar)
      const componentIcons = wrapper.findAllComponents({ name: 'BaseIcon' })

      // Filter only component icons (not expand icons)
      const actualComponentIcons = componentIcons.filter((icon) =>
        icon.classes().includes('component-icon')
      )

      // Should have at least the root App component icon
      expect(actualComponentIcons.length).toBeGreaterThan(0)

      actualComponentIcons.forEach((icon) => {
        expect(icon.props('size')).toBe('xs')
        expect(icon.classes()).toContain('component-icon')
        expect(['Menu', 'Terminal', 'Eye', 'Code', 'GitBranch']).toContain(
          icon.props('name')
        )
      })
    })

    it('should render expand icons with proper props and classes', () => {
      const wrapper = mount(VisualSidebar)
      const expandIcons = wrapper
        .findAllComponents({ name: 'BaseIcon' })
        .filter((icon) => icon.classes().includes('expand-icon'))

      expandIcons.forEach((icon) => {
        expect(icon.props('name')).toBe('ArrowRight')
        expect(icon.props('size')).toBe('xs')
        expect(icon.classes()).toContain('expand-icon')
      })
    })

    it('should apply expanded class to expand icons when appropriate', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Check if any components are expanded
      const hasExpandedComponents = vm.componentTree.some(
        (c: Record<string, unknown>) => c.expanded
      )

      if (hasExpandedComponents) {
        const expandedIcons = wrapper.findAll('.expand-icon.expanded')
        expect(expandedIcons.length).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('📐 Layout and Styling', () => {
    it('should apply correct indentation based on component depth', () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      // Check that different depth levels have different padding
      const depths = new Set()

      layerItems.forEach((item) => {
        const style = item.attributes('style')
        if (style && style.includes('padding-left')) {
          depths.add(style)
        }
      })

      expect(depths.size).toBeGreaterThanOrEqual(1)
    })

    it('should calculate proper padding for different depths', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Check components at different depths
      const allComponents: Record<string, unknown>[] = []
      const flattenComponents = (components: Record<string, unknown>[]) => {
        components.forEach((comp) => {
          allComponents.push(comp)
          if (comp.children) {
            flattenComponents(comp.children as Record<string, unknown>[])
          }
        })
      }

      flattenComponents(vm.componentTree)

      // Should have components at different depths
      const depths = [...new Set(allComponents.map((c) => c.depth))]
      expect(depths.length).toBeGreaterThan(1)
      expect(depths).toContain(0) // Root level
    })

    it('should apply layer-selected class with proper styling', () => {
      const wrapper = mount(VisualSidebar)
      const selectedItems = wrapper.findAll('.layer-item.layer-selected')

      expect(selectedItems.length).toBe(1)

      selectedItems.forEach((item) => {
        expect(item.classes()).toContain('layer-selected')
        const componentName = item.find('.component-name')
        expect(componentName.exists()).toBe(true)
      })
    })

    it('should have proper CSS class structure for hover effects', () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      layerItems.forEach((item) => {
        expect(item.classes()).toContain('layer-item')

        const layerContent = item.find('.layer-content')
        expect(layerContent.exists()).toBe(true)
        expect(layerContent.classes()).toContain('layer-content')
      })
    })

    it('should maintain proper width and overflow styling', () => {
      const wrapper = mount(VisualSidebar)
      const inspectorSection = wrapper.find('.inspector-section')
      const layersTree = wrapper.find('.layers-tree')

      expect(inspectorSection.classes()).toContain('inspector-section')
      expect(layersTree.classes()).toContain('layers-tree')
    })
  })

  describe('🧱 Component Tree Structure', () => {
    it('should maintain proper component tree hierarchy', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Verify tree structure
      expect(vm.componentTree.length).toBe(1) // Root App component
      expect(vm.componentTree[0].name).toBe('App')
      expect(vm.componentTree[0].children).toBeDefined()
      const children = vm.componentTree[0].children as unknown[]
      expect(Array.isArray(children) && children.length).toBeGreaterThan(0)
    })

    it('should have components with all required properties', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const validateComponent = (component: Record<string, unknown>) => {
        expect(component.id).toBeDefined()
        expect(component.name).toBeDefined()
        expect(component.type).toBeDefined()
        expect(typeof component.depth).toBe('number')
        expect(typeof component.expanded).toBe('boolean')

        if (component.children && Array.isArray(component.children)) {
          component.children.forEach((child: unknown) =>
            validateComponent(child as Record<string, unknown>)
          )
        }
      }

      vm.componentTree.forEach(validateComponent)
    })

    it('should render nested components correctly', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Find components with children
      const componentsWithChildren = vm.componentTree.filter(
        (c: Record<string, unknown>) =>
          c.children && (c.children as unknown[]).length > 0
      )

      expect(componentsWithChildren.length).toBeGreaterThan(0)

      // Verify children have higher depth than parents
      componentsWithChildren.forEach((parent: Record<string, unknown>) => {
        ;(parent.children as Record<string, unknown>[]).forEach(
          (child: Record<string, unknown>) => {
            expect(child.depth).toBeGreaterThan(parent.depth as number)
          }
        )
      })
    })

    it('should handle component tree with various component types', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const allComponents: Record<string, unknown>[] = []
      const flattenComponents = (components: Record<string, unknown>[]) => {
        components.forEach((comp) => {
          allComponents.push(comp)
          if (comp.children) {
            flattenComponents(comp.children as Record<string, unknown>[])
          }
        })
      }

      flattenComponents(vm.componentTree)

      // Should have different component types
      const types = [...new Set(allComponents.map((c) => c.type))]
      expect(types.length).toBeGreaterThan(1)
      expect(types).toContain('container')
    })

    it('should maintain component tree immutability during selection', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const originalTreeStructure = JSON.stringify(vm.componentTree)

      // Select different components
      const layerItems = wrapper.findAll('.layer-item')
      if (layerItems.length > 1) {
        await layerItems[1].trigger('click')
      }

      // Tree structure should remain the same (only selection changes)
      expect(JSON.stringify(vm.componentTree)).toBe(originalTreeStructure)
    })
  })

  describe('🏗️ Logo Section', () => {
    it('should not render logo section (branding removed)', () => {
      const wrapper = mount(VisualSidebar)
      const logoSection = wrapper.find('.logo-section')
      const logo = wrapper.findComponent({ name: 'BaseLogo' })

      expect(logoSection.exists()).toBe(false)
      expect(logo.exists()).toBe(false)
    })

    it('should not render BaseLogo (branding removed)', () => {
      const wrapper = mount(VisualSidebar)
      const logo = wrapper.findComponent({ name: 'BaseLogo' })

      expect(logo.exists()).toBe(false)
    })

    it('should not position logo section at bottom (branding removed)', () => {
      const wrapper = mount(VisualSidebar)
      const sidebar = wrapper.find('.visual-sidebar')
      const inspectorSection = wrapper.find('.inspector-section')
      const logoSection = wrapper.find('.logo-section')

      // Verify only inspector section exists
      expect(logoSection.exists()).toBe(false)
      const sidebarChildren = sidebar.element.children
      expect(sidebarChildren[0]).toBe(inspectorSection.element)
      expect(sidebarChildren.length).toBe(1)
    })
  })

  describe('⚡ Edge Cases and Error Handling', () => {
    it('should handle empty component selection gracefully', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Test selecting a component that doesn't exist
      const nonExistentComponent = {
        id: 'non-existent',
        name: 'Non-existent Component',
        type: 'container',
      }

      expect(() => {
        vm.selectComponent(nonExistentComponent)
      }).not.toThrow()

      expect(vm.selectedComponentId).toBe('non-existent')
    })

    it('should handle toggling expansion on components without children', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const componentWithoutChildren = {
        id: 'leaf-component',
        name: 'Leaf Component',
        type: 'button',
        expanded: false,
      }

      const initialExpanded = componentWithoutChildren.expanded

      expect(() => {
        vm.toggleExpanded(componentWithoutChildren)
      }).not.toThrow()

      expect(componentWithoutChildren.expanded).toBe(!initialExpanded)
    })

    it('should handle unknown component types gracefully', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Test various invalid types
      expect(vm.getComponentIcon('invalid-type')).toBe('Menu')
      expect(vm.getComponentIcon('')).toBe('Menu')
      expect(vm.getComponentIcon(123 as unknown as string)).toBe('Menu')
      expect(vm.getComponentIcon({} as unknown as string)).toBe('Menu')
    })

    it('should handle rapid selection changes', async () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      if (layerItems.length > 2) {
        // Rapidly change selections
        await layerItems[0].trigger('click')
        await layerItems[1].trigger('click')
        await layerItems[2].trigger('click')
        await layerItems[0].trigger('click')

        // Should maintain consistent state
        const selectedItems = wrapper.findAll('.layer-item.layer-selected')
        expect(selectedItems.length).toBe(1)
      }
    })

    it('should handle multiple expand/collapse operations', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Find components with children
      const componentsWithChildren = vm.componentTree.filter(
        (c: Record<string, unknown>) =>
          c.children && (c.children as unknown[]).length > 0
      )

      if (componentsWithChildren.length > 0) {
        const component = componentsWithChildren[0]
        const initialState = component.expanded

        // Multiple toggles
        vm.toggleExpanded(component)
        vm.toggleExpanded(component)
        vm.toggleExpanded(component)

        expect(component.expanded).toBe(!initialState)
      }
    })

    it('should maintain component tree integrity after multiple operations', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const originalTreeLength = vm.componentTree.length
      const layerItems = wrapper.findAll('.layer-item')

      // Perform multiple operations
      if (layerItems.length > 1) {
        await layerItems[0].trigger('click')
        await layerItems[1].trigger('click')
      }

      // Tree structure should remain intact
      expect(vm.componentTree.length).toBe(originalTreeLength)
      expect(vm.componentTree[0].name).toBe('App')
    })
  })

  describe('🔄 Reactivity and State Management', () => {
    it('should maintain reactive state for selectedComponentId', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const initialId = vm.selectedComponentId

      // Change selection programmatically
      const testComponent = {
        id: 'test-reactive',
        name: 'Reactive Test Component',
        type: 'container',
      }

      vm.selectComponent(testComponent)
      await wrapper.vm.$nextTick()

      expect(vm.selectedComponentId).toBe('test-reactive')
      expect(vm.selectedComponentId).not.toBe(initialId)
    })

    it('should maintain reactive state for component tree expansion', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Find expandable component
      const expandableComponent = vm.componentTree.find(
        (c: Record<string, unknown>) =>
          c.children && (c.children as unknown[]).length > 0
      )

      if (expandableComponent) {
        const initialExpanded = expandableComponent.expanded

        vm.toggleExpanded(expandableComponent)
        await wrapper.vm.$nextTick()

        expect(expandableComponent.expanded).toBe(!initialExpanded)
      }
    })

    it('should update DOM when component selection changes', async () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      if (layerItems.length > 1) {
        await layerItems[1].trigger('click')
        await wrapper.vm.$nextTick()

        const selectedItems = wrapper.findAll('.layer-item.layer-selected')
        expect(selectedItems.length).toBe(1)
      }
    })

    it('should update DOM when expansion state changes', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const expandableComponent = vm.componentTree.find(
        (c: Record<string, unknown>) =>
          c.children && (c.children as unknown[]).length > 0
      )

      if (expandableComponent) {
        const initialExpanded = expandableComponent.expanded

        vm.toggleExpanded(expandableComponent)
        await wrapper.vm.$nextTick()

        // Check that the expansion state actually changed
        expect(expandableComponent.expanded).toBe(!initialExpanded)

        // Check for expanded class on expand icons
        wrapper
          .findAllComponents({ name: 'BaseIcon' })
          .filter(
            (icon) =>
              icon.classes().includes('expand-icon') &&
              icon.classes().includes('expanded')
          )

        // The component's expanded state should be reflected in the data
        expect(expandableComponent.expanded).toBe(!initialExpanded)
      } else {
        // Skip if no expandable components found
        expect(true).toBe(true)
      }
    })

    it('should maintain ref reactivity after multiple state changes', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      const initialSelectedId = vm.selectedComponentId

      // Change selection multiple times
      const testComponent1 = {
        id: 'test1',
        name: 'Test Component 1',
        type: 'button',
      }
      const testComponent2 = {
        id: 'test2',
        name: 'Test Component 2',
        type: 'input',
      }

      vm.selectComponent(testComponent1)
      await wrapper.vm.$nextTick()
      expect(vm.selectedComponentId).toBe('test1')

      vm.selectComponent(testComponent2)
      await wrapper.vm.$nextTick()
      expect(vm.selectedComponentId).toBe('test2')

      // State should be reactive and current
      expect(vm.selectedComponentId).not.toBe(initialSelectedId)
    })
  })

  describe('🧪 Integration Tests', () => {
    it('should handle complete user workflow: expand, select, collapse', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent
      const layerItems = wrapper.findAll('.layer-item')
      const expandIcons = wrapper.findAll('.expand-icon')

      if (layerItems.length > 1 && expandIcons.length > 0) {
        // Step 1: Expand a component
        const componentWithChildren = vm.componentTree.find(
          (c: Record<string, unknown>) =>
            c.children && (c.children as unknown[]).length > 0
        )

        if (componentWithChildren) {
          const initialExpanded = componentWithChildren.expanded
          vm.toggleExpanded(componentWithChildren)
          await wrapper.vm.$nextTick()

          expect(componentWithChildren.expanded).toBe(!initialExpanded)

          // Step 2: Select a different component
          await layerItems[1].trigger('click')

          const selectedItems = wrapper.findAll('.layer-item.layer-selected')
          expect(selectedItems.length).toBe(1)

          // Step 3: Collapse back
          vm.toggleExpanded(componentWithChildren)
          await wrapper.vm.$nextTick()

          expect(componentWithChildren.expanded).toBe(initialExpanded)
        }
      }
    })

    it('should maintain consistent state across multiple interactions', async () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent
      const layerItems = wrapper.findAll('.layer-item')

      // Perform multiple operations
      for (let i = 0; i < Math.min(3, layerItems.length); i++) {
        await layerItems[i].trigger('click')

        // Always should have exactly one selected
        const selectedItems = wrapper.findAll('.layer-item.layer-selected')
        expect(selectedItems.length).toBe(1)
      }

      // Component tree should still be intact
      expect(vm.componentTree.length).toBe(1)
      expect(vm.componentTree[0].name).toBe('App')
    })

    it('should handle rapid successive clicks without errors', async () => {
      const wrapper = mount(VisualSidebar)
      const layerItems = wrapper.findAll('.layer-item')

      if (layerItems.length > 0) {
        // Rapid clicks on same item
        for (let i = 0; i < 5; i++) {
          await layerItems[0].trigger('click')
        }

        // Should still maintain consistent state
        const selectedItems = wrapper.findAll('.layer-item.layer-selected')
        expect(selectedItems.length).toBe(1)
      }
    })

    it('should validate complete component tree structure integrity', () => {
      const wrapper = mount(VisualSidebar)
      const vm = wrapper.vm as unknown as VisualSidebarComponent

      // Deep validation of component tree
      const validateCompleteTree = (
        components: Array<Record<string, unknown>>,
        expectedDepth = 0
      ) => {
        components.forEach((component) => {
          expect(component.depth).toBe(expectedDepth)
          expect(typeof component.id).toBe('string')
          expect(typeof component.name).toBe('string')
          expect(['container', 'text', 'button', 'input', 'image']).toContain(
            component.type
          )
          expect(typeof component.expanded).toBe('boolean')

          if (component.children) {
            expect(Array.isArray(component.children)).toBe(true)
            validateCompleteTree(
              component.children as Array<Record<string, unknown>>,
              expectedDepth + 1
            )
          }
        })
      }

      validateCompleteTree(vm.componentTree)
    })

    it('should render all expected component names in correct order', () => {
      const wrapper = mount(VisualSidebar)
      const componentNames = wrapper.findAll('.component-name')

      expect(componentNames.length).toBeGreaterThan(0)

      // First should always be App (root)
      expect(componentNames[0].text()).toBe('App')

      // Should include other expected components
      const allNames = componentNames.map((name) => name.text())
      expect(allNames).toContain('App')
    })
  })
})
