import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ArrowRight from './ArrowRight.vue'
import Code from './Code.vue'
import Eye from './Eye.vue'
import GitBranch from './GitBranch.vue'
import Menu from './Menu.vue'
import Moon from './Moon.vue'
import Play from './Play.vue'
import Square from './Square.vue'
import Sun from './Sun.vue'
import Terminal from './Terminal.vue'
import Timeline from './Timeline.vue'
import X from './X.vue'

describe('Icon Components - Simple Coverage', () => {
  const icons = [
    { name: 'ArrowRight', component: ArrowRight },
    { name: 'Code', component: Code },
    { name: 'Eye', component: Eye },
    { name: 'GitBranch', component: GitBranch },
    { name: 'Menu', component: Menu },
    { name: 'Moon', component: Moon },
    { name: 'Play', component: Play },
    { name: 'Square', component: Square },
    { name: 'Sun', component: Sun },
    { name: 'Terminal', component: Terminal },
    { name: 'Timeline', component: Timeline },
    { name: 'X', component: X },
  ]

  icons.forEach(({ name, component }) => {
    describe(`${name}.vue`, () => {
      it('should mount and render without errors', () => {
        const wrapper = mount(component)
        expect(wrapper.exists()).toBe(true)
      })

      it('should render SVG element', () => {
        const wrapper = mount(component)
        const svg = wrapper.find('svg')
        expect(svg.exists()).toBe(true)
      })

      it('should have some content', () => {
        const wrapper = mount(component)
        expect(wrapper.html().length).toBeGreaterThan(0)
      })
    })
  })

  it('should export all icon components', () => {
    expect(ArrowRight).toBeDefined()
    expect(Code).toBeDefined()
    expect(Eye).toBeDefined()
    expect(GitBranch).toBeDefined()
    expect(Menu).toBeDefined()
    expect(Moon).toBeDefined()
    expect(Play).toBeDefined()
    expect(Square).toBeDefined()
    expect(Sun).toBeDefined()
    expect(Terminal).toBeDefined()
    expect(Timeline).toBeDefined()
    expect(X).toBeDefined()
  })
})
