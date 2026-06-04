/**
 * @fileoverview WelcomeMessageProvider for terminal initialization.
 *
 * @description
 * Provides configurable welcome messages and prompts for terminal sessions.
 * Supports custom templates, system information injection, and shell-specific
 * prompt generation for a consistent and professional terminal experience.
 *
 * @example
 * ```typescript
 * const provider = new WelcomeMessageProvider({
 *   appName: 'Hatcher DX',
 *   showSystemInfo: true
 * });
 * const message = provider.getWelcomeMessage();
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import * as os from 'os'

/**
 * Configuration options for welcome message generation.
 *
 * @interface WelcomeMessageOptions
 * @public
 * @since 1.0.0
 */
export interface WelcomeMessageOptions {
  /** Application name to display in welcome message */
  appName?: string
  /** Version string to display */
  version?: string
  /** Whether to show system information (hostname, user, etc.) */
  showSystemInfo?: boolean
  /** Custom welcome template (supports {variables}) */
  customTemplate?: string
  /** Shell type for prompt generation */
  shell?: 'bash' | 'zsh' | 'fish' | 'powershell' | 'cmd' | 'sh'
  /** Current working directory */
  cwd?: string
  /** Whether to include emoji in messages */
  useEmoji?: boolean
  /** Custom color codes for ANSI formatting */
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
}

/**
 * Manages welcome message generation for terminal sessions.
 *
 * @remarks
 * This class provides a centralized way to generate consistent welcome messages
 * and prompts across different terminal implementations. It supports customization
 * through templates and automatic system information injection.
 *
 * @public
 * @since 1.0.0
 */
export class WelcomeMessageProvider {
  private options: Required<WelcomeMessageOptions>
  private readonly defaultColors = {
    primary: '\x1b[36m', // Cyan
    secondary: '\x1b[33m', // Yellow
    accent: '\x1b[32m', // Green
    reset: '\x1b[0m',
  }

  /**
   * Creates a new WelcomeMessageProvider instance.
   *
   * @param options - Configuration options for message generation
   *
   * @example
   * ```typescript
   * const provider = new WelcomeMessageProvider({
   *   appName: 'My Terminal App',
   *   useEmoji: true
   * });
   * ```
   */
  constructor(options: WelcomeMessageOptions = {}) {
    this.options = {
      appName: options.appName || 'Terminal',
      version: options.version || '1.0.0',
      showSystemInfo: options.showSystemInfo ?? true,
      customTemplate: options.customTemplate || '',
      shell: options.shell || this.detectShell(),
      cwd: options.cwd || this.safeCwd(),
      useEmoji: options.useEmoji ?? true,
      colors: {
        primary: options.colors?.primary || this.defaultColors.primary,
        secondary: options.colors?.secondary || this.defaultColors.secondary,
        accent: options.colors?.accent || this.defaultColors.accent,
      },
    }
  }

  /**
   * Generates a complete welcome message for terminal initialization.
   *
   * @returns Formatted welcome message with ANSI escape codes
   *
   * @example
   * ```typescript
   * const message = provider.getWelcomeMessage();
   * terminal.write(message);
   * ```
   */
  getWelcomeMessage(): string {
    if (this.options.customTemplate) {
      return this.processTemplate(this.options.customTemplate)
    }

    const parts: string[] = []
    const colors = this.options.colors
    const reset = this.defaultColors.reset

    // Header with app name
    if (this.options.useEmoji) {
      parts.push(`${colors.primary}🚀 ${this.options.appName} Terminal${reset}`)
    } else {
      parts.push(`${colors.primary}${this.options.appName} Terminal${reset}`)
    }

    // Version info
    parts.push(`${colors.secondary}Version ${this.options.version}${reset}`)

    // System info if enabled
    if (this.options.showSystemInfo) {
      parts.push('')
      parts.push(`${colors.accent}System Information:${reset}`)
      parts.push(`  User: ${os.userInfo().username}`)
      parts.push(`  Host: ${os.hostname()}`)
      parts.push(`  Platform: ${os.platform()} ${os.arch()}`)
      parts.push(`  Node: ${process.version}`)
    }

    // Add spacing before prompt
    parts.push('')

    return parts.join('\r\n') + '\r\n'
  }

  /**
   * Generates a shell-specific prompt string.
   *
   * @param cwd - Current working directory (optional, uses configured cwd if not provided)
   * @returns Formatted prompt string appropriate for the configured shell
   *
   * @example
   * ```typescript
   * const prompt = provider.getPrompt();
   * terminal.write(prompt);
   * ```
   */
  getPrompt(cwd?: string): string {
    const workingDir = cwd || this.options.cwd
    const user = os.userInfo().username
    const hostname = os.hostname().split('.')[0] // Remove domain
    const homeDir = os.homedir()

    // Simplify path display
    let displayPath = workingDir
    if (workingDir.startsWith(homeDir)) {
      displayPath = '~' + workingDir.slice(homeDir.length)
    }

    const colors = this.options.colors
    const reset = this.defaultColors.reset

    switch (this.options.shell) {
      case 'zsh':
        return `${colors.accent}${user}@${hostname}${reset} ${colors.primary}${displayPath}${reset} %% `

      case 'fish':
        return `${colors.accent}${user}@${hostname}${reset} ${colors.primary}${displayPath}${reset} > `

      case 'powershell':
        return `PS ${displayPath}> `

      case 'cmd':
        return `${displayPath}>`

      case 'bash':
      case 'sh':
      default:
        return `${colors.accent}${user}@${hostname}${reset} ${colors.primary}${displayPath}${reset} $ `
    }
  }

  /**
   * Generates a simple message without system information.
   *
   * @param message - Custom message to display
   * @returns Formatted message with basic styling
   *
   * @example
   * ```typescript
   * const msg = provider.getSimpleMessage('Ready to accept commands');
   * terminal.write(msg);
   * ```
   */
  getSimpleMessage(message: string): string {
    const colors = this.options.colors
    const reset = this.defaultColors.reset
    const emoji = this.options.useEmoji ? '✨ ' : ''

    return `${colors.primary}${emoji}${message}${reset}\r\n`
  }

  /**
   * Processes a custom template with variable substitution.
   *
   * @param template - Template string with {variable} placeholders
   * @returns Processed template with variables replaced
   */
  private processTemplate(template: string): string {
    const variables: Record<string, string> = {
      appName: this.options.appName,
      version: this.options.version,
      user: os.userInfo().username,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cwd: this.options.cwd,
      home: os.homedir(),
      ...this.getColorVariables(),
    }

    let processed = template
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }

    return processed
  }

  /**
   * Gets color variables for template processing.
   */
  private getColorVariables(): Record<string, string> {
    return {
      colorPrimary: this.options.colors.primary || this.defaultColors.primary,
      colorSecondary:
        this.options.colors.secondary || this.defaultColors.secondary,
      colorAccent: this.options.colors.accent || this.defaultColors.accent,
      colorReset: this.defaultColors.reset,
    }
  }

  /**
   * Detects the current shell type.
   */
  private detectShell(): 'bash' | 'zsh' | 'fish' | 'powershell' | 'cmd' | 'sh' {
    const shell = process.env.SHELL || ''

    if (shell.includes('zsh')) return 'zsh'
    if (shell.includes('fish')) return 'fish'
    if (shell.includes('bash')) return 'bash'
    if (process.platform === 'win32') {
      if (process.env.PSModulePath) return 'powershell'
      return 'cmd'
    }

    return 'sh'
  }

  /**
   * Updates configuration options.
   *
   * @param options - Partial options to update
   */
  updateOptions(options: Partial<WelcomeMessageOptions>): void {
    Object.assign(this.options, options)
  }

  /**
   * Gets the current configuration.
   *
   * @returns Current configuration options
   */
  getOptions(): Readonly<Required<WelcomeMessageOptions>> {
    return { ...this.options }
  }

  /**
   * Safely gets the current working directory with error handling.
   *
   * @returns Current working directory or fallback directory
   * @private
   */
  private safeCwd(): string {
    try {
      return process.cwd()
    } catch {
      // Fallback to temp directory if process.cwd() fails
      return '/tmp'
    }
  }
}
