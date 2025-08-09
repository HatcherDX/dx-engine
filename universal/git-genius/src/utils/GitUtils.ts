/**
 * @fileoverview Git utility functions for common operations.
 *
 * @description
 * Provides utility functions for common Git operations, path handling,
 * and data transformations used throughout the Git Genius library.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Utility functions for Git operations and data handling.
 *
 * @public
 */
export class GitUtils {
  /**
   * Validates if a string is a valid Git commit hash.
   *
   * @param hash - Hash string to validate
   * @returns Whether the hash is valid
   */
  static isValidCommitHash(hash: string): boolean {
    return /^[a-f0-9]{7,40}$/i.test(hash)
  }

  /**
   * Shortens a Git commit hash to the standard 7 characters.
   *
   * @param hash - Full commit hash
   * @returns Shortened hash
   */
  static shortenHash(hash: string): string {
    return hash.substring(0, 7)
  }

  /**
   * Extracts the first line of a commit message.
   *
   * @param fullMessage - Full commit message
   * @returns First line of the message
   */
  static getCommitSummary(fullMessage: string): string {
    return fullMessage.split('\n')[0] || ''
  }

  /**
   * Normalizes a file path for cross-platform compatibility.
   *
   * @param filePath - File path to normalize
   * @returns Normalized file path
   */
  static normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/')
  }

  /**
   * Checks if a file path represents a binary file based on extension.
   *
   * @param filePath - File path to check
   * @returns Whether the file is likely binary
   */
  static isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.ico',
      '.svg',
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.zip',
      '.tar',
      '.gz',
      '.7z',
      '.rar',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.mp3',
      '.mp4',
      '.avi',
      '.mov',
      '.mkv',
      '.ttf',
      '.otf',
      '.woff',
      '.woff2',
    ]

    const extension = filePath.toLowerCase().match(/\.[^.]*$/)?.[0]
    return extension ? binaryExtensions.includes(extension) : false
  }

  /**
   * Detects the programming language from a file path.
   *
   * @param filePath - File path to analyze
   * @returns Detected language identifier
   */
  static detectLanguage(filePath: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.vue': 'vue',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'bash',
      '.fish': 'bash',
      '.ps1': 'powershell',
      '.html': 'html',
      '.htm': 'html',
      '.xml': 'xml',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.ini': 'ini',
      '.cfg': 'ini',
      '.conf': 'ini',
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.sql': 'sql',
      '.dockerfile': 'dockerfile',
      '.r': 'r',
      '.m': 'matlab',
      '.tex': 'latex',
      '.vim': 'vim',
    }

    const extension = filePath.toLowerCase().match(/\.[^.]*$/)?.[0]
    return extension ? languageMap[extension] || 'text' : 'text'
  }

  /**
   * Formats a timestamp to a human-readable relative time.
   *
   * @param timestamp - ISO timestamp string
   * @returns Human-readable relative time
   */
  static formatRelativeTime(timestamp: string): string {
    const now = Date.now()
    const time = new Date(timestamp).getTime()
    const diff = now - time

    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const week = 7 * day
    const month = 30 * day
    const year = 365 * day

    if (diff < minute) {
      return 'just now'
    } else if (diff < hour) {
      const minutes = Math.floor(diff / minute)
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    } else if (diff < day) {
      const hours = Math.floor(diff / hour)
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    } else if (diff < week) {
      const days = Math.floor(diff / day)
      return `${days} day${days === 1 ? '' : 's'} ago`
    } else if (diff < month) {
      const weeks = Math.floor(diff / week)
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`
    } else if (diff < year) {
      const months = Math.floor(diff / month)
      return `${months} month${months === 1 ? '' : 's'} ago`
    } else {
      const years = Math.floor(diff / year)
      return `${years} year${years === 1 ? '' : 's'} ago`
    }
  }

  /**
   * Generates a unique identifier for caching purposes.
   *
   * @param components - Components to include in the ID
   * @returns Unique identifier string
   */
  static generateCacheKey(
    ...components: (string | number | boolean)[]
  ): string {
    return components
      .map((c) => String(c))
      .join(':')
      .replace(/[^a-zA-Z0-9:_-]/g, '_')
  }

  /**
   * Safely parses JSON with error handling.
   *
   * @param jsonString - JSON string to parse
   * @param fallback - Fallback value if parsing fails
   * @returns Parsed object or fallback
   */
  static safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
      return JSON.parse(jsonString) as T
    } catch {
      return fallback
    }
  }

  /**
   * Debounces a function to limit the rate of execution.
   *
   * @param func - Function to debounce
   * @param delay - Debounce delay in milliseconds
   * @returns Debounced function
   */
  static debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | undefined

    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        func(...args)
      }, delay)
    }
  }

  /**
   * Throttles a function to limit the rate of execution.
   *
   * @param func - Function to throttle
   * @param limit - Throttle limit in milliseconds
   * @returns Throttled function
   */
  static throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let lastExecution = 0

    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastExecution >= limit) {
        lastExecution = now
        func(...args)
      }
    }
  }

  /**
   * Retries an async operation with exponential backoff.
   *
   * @param operation - Async operation to retry
   * @param maxRetries - Maximum number of retries
   * @param baseDelay - Base delay in milliseconds
   * @returns Promise resolving to operation result
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt === maxRetries) {
          throw lastError
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}
