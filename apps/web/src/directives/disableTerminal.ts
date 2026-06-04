/**
 * Vue custom directive for automatically disabling terminal easter egg
 * when interacting with UI elements.
 *
 * @remarks
 * This directive provides a reusable way to mark interactive elements
 * that should deactivate the terminal overlay when clicked or focused.
 * It eliminates the need to manually maintain class name lists.
 *
 * @example
 * ```vue
 * <button v-disable-terminal>Click me</button>
 * <input v-disable-terminal type="text" />
 * ```
 *
 * @public
 * @since 1.0.0
 */
import type { Directive } from 'vue'

/**
 * Custom event that is dispatched when an element with v-disable-terminal
 * is interacted with. The TerminalEasterEgg component listens for this event.
 */
const DISABLE_TERMINAL_EVENT = 'disable-terminal-interaction'

/**
 * Handles click events on elements with the v-disable-terminal directive.
 *
 * @param event - The click event
 */
const handleClick = (event: MouseEvent): void => {
  console.log(
    '[DisableTerminal Directive] Click detected on element with v-disable-terminal'
  )
  console.log('[DisableTerminal Directive] Click target:', event.target)
  console.log(
    '[DisableTerminal Directive] Current target:',
    event.currentTarget
  )

  // Dispatch a custom event that the terminal easter egg can listen for
  const customEvent = new CustomEvent(DISABLE_TERMINAL_EVENT, {
    detail: {
      type: 'click',
      target: event.target,
      currentTarget: event.currentTarget,
    },
    bubbles: true,
    composed: true,
  })
  console.log(
    '[DisableTerminal Directive] Dispatching custom event:',
    DISABLE_TERMINAL_EVENT
  )
  document.dispatchEvent(customEvent)
}

/**
 * Handles focus events on elements with the v-disable-terminal directive.
 *
 * @param event - The focus event
 */
const handleFocus = (event: FocusEvent): void => {
  // Only deactivate terminal on manual focus (e.g., user clicking on input)
  // Not on programmatic focus which happens when entering search mode
  const target = event.target as HTMLElement

  // Check if this focus event was triggered by user interaction
  // If the element is already focused and receives focus again, it's likely programmatic
  if (target.matches(':focus-visible') || event.isTrusted) {
    // Only dispatch if this appears to be user-initiated focus
    // Skip if the input is readonly or disabled (like in search mode)
    if (target.hasAttribute('readonly') || target.hasAttribute('disabled')) {
      return
    }

    // Dispatch a custom event that the terminal easter egg can listen for
    const customEvent = new CustomEvent(DISABLE_TERMINAL_EVENT, {
      detail: {
        type: 'focus',
        target: event.target,
      },
      bubbles: true,
      composed: true,
    })
    document.dispatchEvent(customEvent)
  }
}

/**
 * Vue directive that marks elements as terminal-disabling.
 * When these elements are interacted with, the terminal easter egg
 * should be deactivated.
 *
 * @remarks
 * The directive works by:
 * 1. Adding a data attribute for CSS/JS identification
 * 2. Listening for click and focus events
 * 3. Dispatching a custom event when interaction occurs
 * 4. The TerminalEasterEgg component listens for this event and deactivates
 *
 * @public
 */
export const disableTerminalDirective: Directive = {
  /**
   * Called when the directive is first bound to an element.
   *
   * @param el - The element the directive is bound to
   */
  mounted(el: HTMLElement): void {
    // Add a data attribute for easy identification
    el.setAttribute('data-disable-terminal', 'true')

    // Add event listeners
    el.addEventListener('click', handleClick)
    el.addEventListener('focus', handleFocus)

    // For elements like buttons that might have child elements,
    // ensure the parent handles the interaction
    el.style.position = el.style.position || 'relative'
  },

  /**
   * Called when the directive is unbound from an element.
   *
   * @param el - The element the directive is being unbound from
   */
  unmounted(el: HTMLElement): void {
    // Clean up event listeners
    el.removeEventListener('click', handleClick)
    el.removeEventListener('focus', handleFocus)

    // Remove the data attribute
    el.removeAttribute('data-disable-terminal')
  },
}

/**
 * Event name exported for use in components that need to listen
 * for terminal disable interactions.
 */
export const TERMINAL_DISABLE_EVENT = DISABLE_TERMINAL_EVENT

export default disableTerminalDirective
