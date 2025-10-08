/**
 * Terminal Echo Handler - Centralized echo management for subprocess terminals
 *
 * @remarks
 * Provides consistent echo behavior for subprocess-based terminals that don't have
 * built-in PTY echo support. Handles special characters, backspace, and proper
 * visual feedback for user input.
 *
 * @public
 * @since 1.0.0
 */
export class TerminalEchoHandler {
  private commandBuffer: string = ''

  /**
   * Process user input and determine what should be echoed back
   *
   * @param data - The input data from the user
   * @returns Object containing echo data and whether to send to process
   *
   * @example
   * ```typescript
   * const handler = new TerminalEchoHandler()
   * const result = handler.processInput('a')
   * console.log(result) // { echo: 'a', sendToProcess: true, commandBuffer: 'a' }
   * ```
   */
  processInput(data: string): {
    echo: string | null
    sendToProcess: boolean
    commandBuffer: string
    clearBuffer?: boolean
  } {
    const charCode = data.charCodeAt(0)

    // Handle Enter key
    if (data === '\r' || data === '\n') {
      const command = this.commandBuffer
      this.commandBuffer = ''
      return {
        echo: '\r\n',
        sendToProcess: true,
        commandBuffer: command,
        clearBuffer: true,
      }
    }

    // Handle Backspace (127) or Delete (8)
    if (
      charCode === 127 ||
      charCode === 8 ||
      data === '\x7f' ||
      data === '\b'
    ) {
      if (this.commandBuffer.length > 0) {
        this.commandBuffer = this.commandBuffer.slice(0, -1)
        return {
          echo: '\b \b', // Move back, space to clear, move back again
          sendToProcess: false, // Don't send backspace to process yet
          commandBuffer: this.commandBuffer,
        }
      }
      return {
        echo: null,
        sendToProcess: false,
        commandBuffer: this.commandBuffer,
      }
    }

    // Handle Ctrl+C (SIGINT)
    if (charCode === 3) {
      this.commandBuffer = ''
      return {
        echo: '^C\r\n',
        sendToProcess: true, // Send Ctrl+C to process
        commandBuffer: '',
        clearBuffer: true,
      }
    }

    // Handle Ctrl+D (EOF)
    if (charCode === 4) {
      return {
        echo: null,
        sendToProcess: true, // Send EOF to process
        commandBuffer: this.commandBuffer,
      }
    }

    // Handle Tab (for autocompletion - just echo spaces for now)
    if (charCode === 9) {
      const spaces = '    '
      this.commandBuffer += spaces
      return {
        echo: spaces,
        sendToProcess: false, // Don't send tab to subprocess
        commandBuffer: this.commandBuffer,
      }
    }

    // Handle regular printable characters
    if (charCode >= 32 && charCode <= 126) {
      this.commandBuffer += data
      return {
        echo: data,
        sendToProcess: false, // Buffer until Enter is pressed
        commandBuffer: this.commandBuffer,
      }
    }

    // Handle other control characters - don't echo but might send to process
    return {
      echo: null,
      sendToProcess: true,
      commandBuffer: this.commandBuffer,
    }
  }

  /**
   * Reset the command buffer
   *
   * @remarks
   * Should be called when the terminal is cleared or reset
   */
  reset(): void {
    this.commandBuffer = ''
  }

  /**
   * Get the current command buffer
   *
   * @returns The current buffered command
   */
  getBuffer(): string {
    return this.commandBuffer
  }

  /**
   * Set the command buffer directly
   *
   * @param buffer - The new buffer content
   */
  setBuffer(buffer: string): void {
    this.commandBuffer = buffer
  }
}
