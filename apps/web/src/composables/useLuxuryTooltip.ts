/**
 * Composable for creating luxury tooltips using Tippy.js
 *
 * @remarks
 * Provides a Vue directive and helper functions for creating
 * premium, animated tooltips with a luxury design system.
 *
 * @example
 * ```vue
 * <button v-luxury-tooltip="'Save your work'">
 *   <Icon name="Save" />
 * </button>
 * ```
 *
 * @public
 * @since 1.0.0
 */

import { Directive, App } from 'vue'
import tippy, { Props, Instance } from 'tippy.js'

// Only import CSS in non-test environments to avoid vitest CSS import errors
if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
  import('tippy.js/dist/tippy.css')
  import('tippy.js/animations/shift-away-subtle.css')
}

/**
 * Luxury tooltip theme configuration
 *
 * @internal
 */
const luxuryTheme: Partial<Props> = {
  theme: 'luxury',
  animation: 'shift-away-subtle', // Use Tippy's smooth built-in animation
  duration: [275, 250], // Default smooth duration
  delay: [500, 0], // 500ms delay before showing
  placement: 'bottom',
  arrow: true,
  offset: [0, 10] as [number, number], // Use offset array [skidding, distance]
  maxWidth: 200,
  appendTo: () => document.body, // Ensure tooltip is at root level
}

/**
 * Vue directive for luxury tooltips
 *
 * @example
 * ```vue
 * <!-- Simple tooltip -->
 * <button v-luxury-tooltip="'Click to save'">Save</button>
 *
 * <!-- With options -->
 * <button v-luxury-tooltip="{
 *   content: 'Delete this item',
 *   placement: 'top',
 *   delay: [200, 0]
 * }">Delete</button>
 * ```
 *
 * @public
 */
export const vLuxuryTooltip: Directive = {
  mounted(el: HTMLElement, binding) {
    const options: Partial<Props> =
      typeof binding.value === 'string'
        ? { content: binding.value }
        : binding.value || {}

    // Create Tippy instance with luxury theme
    const instance = tippy(el, {
      ...luxuryTheme,
      ...options,
    })

    // Store instance for cleanup
    ;(el as HTMLElement & { _tippy?: Instance })._tippy = instance
  },

  updated(el: HTMLElement, binding) {
    const instance = (el as HTMLElement & { _tippy?: Instance })._tippy

    if (instance) {
      const content =
        typeof binding.value === 'string'
          ? binding.value
          : binding.value?.content

      if (content !== undefined) {
        instance.setContent(content)
      }

      // Update other props if provided as object
      if (typeof binding.value === 'object') {
        instance.setProps(binding.value)
      }
    }
  },

  unmounted(el: HTMLElement) {
    const elementWithTippy = el as HTMLElement & { _tippy?: Instance }
    const instance = elementWithTippy._tippy

    if (instance) {
      instance.destroy()
      delete elementWithTippy._tippy
    }
  },
}

/**
 * Creates a programmatic luxury tooltip
 *
 * @param element - Target element for the tooltip
 * @param content - Tooltip content
 * @param options - Additional Tippy options
 * @returns Tippy instance
 *
 * @example
 * ```typescript
 * const tooltip = createLuxuryTooltip(
 *   buttonElement,
 *   'Click to continue',
 *   { placement: 'right' }
 * )
 * ```
 *
 * @public
 */
export function createLuxuryTooltip(
  element: HTMLElement,
  content: string,
  options?: Partial<Props>
): Instance {
  return tippy(element, {
    ...luxuryTheme,
    content,
    ...options,
  })
}

/**
 * Plugin to register luxury tooltip directive globally
 *
 * @param app - Vue app instance
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue'
 * import { LuxuryTooltipPlugin } from './composables/useLuxuryTooltip'
 *
 * const app = createApp(App)
 * app.use(LuxuryTooltipPlugin)
 * ```
 *
 * @public
 */
export const LuxuryTooltipPlugin = {
  install(app: App) {
    app.directive('luxury-tooltip', vLuxuryTooltip)
  },
}

/**
 * Composable for using luxury tooltips in components
 *
 * @returns Object with tooltip utilities
 *
 * @example
 * ```typescript
 * const { createTooltip } = useLuxuryTooltip()
 *
 * onMounted(() => {
 *   createTooltip(buttonRef.value, 'Save changes')
 * })
 * ```
 *
 * @public
 */
export function useLuxuryTooltip() {
  return {
    createTooltip: createLuxuryTooltip,
    directive: vLuxuryTooltip,
  }
}
