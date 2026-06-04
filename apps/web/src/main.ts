import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'
import { terminalInputBridge } from './composables/useTerminalInputBridge'
import disableTerminalDirective from './directives/disableTerminal'
import VueTippy from 'vue-tippy'
import 'tippy.js/dist/tippy.css'
import './styles/luxury-tooltips.css'
import type { Ref } from 'vue'
import type { TaskDetails } from './composables/useTerminalInputBridge'

/**
 * Terminal input bridge interface for global window access.
 *
 * @public
 */
interface TerminalInputBridge {
  updateInput: (input: string, cursorPos?: number) => void
  handleCharacter: (char: string) => boolean
  getTaskDetails: () => Readonly<TaskDetails>
  getRawInput: () => { input: string; cursor: number }
  subscribe: (listener: (details: TaskDetails) => void) => () => void
  clear: () => void
  useTaskDetails: () => {
    taskName: Ref<string>
    branchName: Ref<string | null>
  }
  state: Readonly<
    Ref<{
      rawInput: string
      cursorPosition: number
      taskDetails: TaskDetails
    }>
  >
}

// Make terminal input bridge globally available for terminal strategies
declare global {
  interface Window {
    terminalInputBridge: TerminalInputBridge
    resetOnboarding?: () => void
  }
}
window.terminalInputBridge = terminalInputBridge

const app = createApp(App)

// Register global directives
app.directive('disable-terminal', disableTerminalDirective)

// Register VueTippy plugin with default options
app.use(VueTippy, {
  directive: 'tippy',
  component: 'tippy',
  defaultProps: {
    theme: 'luxury',
    animation: 'shift-away-subtle',
    duration: [275, 250],
    delay: [500, 0],
    arrow: true,
    offset: [0, 10],
    maxWidth: 200,
  },
})

app.mount('#app')
