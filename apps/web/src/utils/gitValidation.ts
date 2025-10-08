/**
 * @fileoverview Git branch name validation utilities.
 *
 * @description
 * Provides comprehensive validation for Git branch names according to Git's rules
 * and conventions. Includes validation for invalid characters, reserved names,
 * and provides helpful error messages for users.
 *
 * @example
 * ```typescript
 * const result = validateBranchName('feature/add-login')
 * if (!result.isValid) {
 *   console.error(result.error)
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Result of branch name validation.
 *
 * @remarks
 * Contains validation status and optional error message for invalid names.
 *
 * @public
 * @since 1.0.0
 */
export interface BranchValidationResult {
  /**
   * Whether the branch name is valid.
   */
  isValid: boolean

  /**
   * Error message if the branch name is invalid.
   * @defaultValue undefined
   */
  error?: string

  /**
   * Sanitized version of the branch name that would be valid.
   * @defaultValue undefined
   */
  suggestion?: string
}

/**
 * Reserved branch names that cannot be used.
 *
 * @remarks
 * These names have special meaning in Git and cannot be used as branch names.
 *
 * @internal
 * @since 1.0.0
 */
const RESERVED_NAMES = new Set([
  'HEAD',
  'FETCH_HEAD',
  'ORIG_HEAD',
  'MERGE_HEAD',
  'REBASE_HEAD',
  'CHERRY_PICK_HEAD',
])

/**
 * Invalid patterns for branch names.
 *
 * @remarks
 * These patterns are not allowed in Git branch names.
 *
 * @internal
 * @since 1.0.0
 */
const INVALID_PATTERNS = [
  /^\./, // Cannot start with dot
  /\.$/, // Cannot end with dot
  /^\//, // Cannot start with slash
  /\/$/, // Cannot end with slash
  /\.{2,}/, // Cannot contain consecutive dots
  /\/{2,}/, // Cannot contain consecutive slashes
  /\.lock$/, // Cannot end with .lock
  /@\{/, // Cannot contain @{
  // eslint-disable-next-line no-control-regex
  /[\x00-\x1F\x7F]/, // Cannot contain control characters
  /[~^:?*[\]\\]/, // Cannot contain these special characters
  /\s/, // Cannot contain spaces
]

/**
 * Validates a Git branch name.
 *
 * @remarks
 * Checks the branch name against Git's naming rules and conventions.
 * Provides detailed error messages for invalid names.
 *
 * @param branchName - The branch name to validate
 * @returns Validation result with status and optional error message
 *
 * @example
 * ```typescript
 * const result = validateBranchName('feature/add-user-auth')
 * if (result.isValid) {
 *   await git.checkoutBranch(branchName)
 * } else {
 *   showError(result.error)
 * }
 * ```
 *
 * @throws Never throws - all errors are returned in the result
 *
 * @public
 * @since 1.0.0
 */
export function validateBranchName(branchName: string): BranchValidationResult {
  // Check for empty or undefined
  if (!branchName || branchName.trim().length === 0) {
    return {
      isValid: false,
      error: 'Branch name cannot be empty',
    }
  }

  // Check length (Git has a practical limit around 250 characters)
  if (branchName.length > 250) {
    return {
      isValid: false,
      error: 'Branch name is too long (max 250 characters)',
      suggestion: branchName.substring(0, 250),
    }
  }

  // Check for reserved names
  if (RESERVED_NAMES.has(branchName.toUpperCase())) {
    return {
      isValid: false,
      error: `"${branchName}" is a reserved Git name`,
      suggestion: `branch-${branchName.toLowerCase()}`,
    }
  }

  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(branchName)) {
      const errorMessages: Record<string, string> = {
        '/^\\./': 'Branch name cannot start with a dot',
        '/\\.$/': 'Branch name cannot end with a dot',
        '/^\\//': 'Branch name cannot start with a slash',
        '/\\/$/': 'Branch name cannot end with a slash',
        '/\\.{2,}/': 'Branch name cannot contain consecutive dots',
        '/\\/{2,}/': 'Branch name cannot contain consecutive slashes',
        '/\\.lock$/': 'Branch name cannot end with ".lock"',
        '/@\\{/': 'Branch name cannot contain "@{"',
        '/[\\x00-\\x1F\\x7F]/': 'Branch name cannot contain control characters',
        '/[~^:?*\\[\\]\\\\]/':
          'Branch name cannot contain special characters (~^:?*[]\\)',
        '/\\s/': 'Branch name cannot contain spaces',
      }

      const patternString = pattern.toString()
      const errorMessage =
        errorMessages[patternString] ||
        'Branch name contains invalid characters'

      return {
        isValid: false,
        error: errorMessage,
        suggestion: sanitizeBranchName(branchName),
      }
    }
  }

  // Check for component restrictions (parts between slashes)
  const components = branchName.split('/')
  for (const component of components) {
    // No empty components (would mean consecutive slashes, but double-check)
    if (component.length === 0) {
      return {
        isValid: false,
        error: 'Branch name contains empty components',
        suggestion: sanitizeBranchName(branchName),
      }
    }

    // Components cannot end with .lock
    if (component.endsWith('.lock')) {
      return {
        isValid: false,
        error: 'Branch name components cannot end with ".lock"',
        suggestion: branchName.replace(/\.lock/g, ''),
      }
    }
  }

  // If all checks pass, the branch name is valid
  return {
    isValid: true,
  }
}

/**
 * Sanitizes a branch name to make it valid.
 *
 * @remarks
 * Attempts to convert an invalid branch name to a valid one by replacing
 * invalid characters and patterns.
 *
 * @param branchName - The branch name to sanitize
 * @returns A sanitized version of the branch name
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeBranchName('Feature: Add Login!')
 * console.log(sanitized) // 'feature/add-login'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function sanitizeBranchName(branchName: string): string {
  const sanitized = branchName
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens, slashes, and dots
    .replace(/[^a-z0-9\-/.]/g, '')
    // Remove leading dots and slashes
    .replace(/^[./]+/, '')
    // Remove trailing dots and slashes
    .replace(/[./]+$/, '')
    // Replace consecutive slashes with single slash
    .replace(/\/+/g, '/')
    // Replace consecutive dots with single dot
    .replace(/\.+/g, '.')
    // Remove .lock suffix
    .replace(/\.lock$/, '')
    // Limit length
    .substring(0, 250)

  // If sanitization results in empty string, provide a default
  if (!sanitized) {
    return 'new-branch'
  }

  return sanitized
}

/**
 * Checks if a branch name already exists.
 *
 * @remarks
 * This is a placeholder for integration with Git to check existing branches.
 * Should be implemented with actual Git integration.
 *
 * @param branchName - The branch name to check
 * @param existingBranches - List of existing branch names
 * @returns Whether the branch already exists
 *
 * @example
 * ```typescript
 * const branches = await git.branchLocal()
 * if (branchExists('feature/login', branches.all)) {
 *   showError('Branch already exists')
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function branchExists(
  branchName: string,
  existingBranches: string[]
): boolean {
  return existingBranches.includes(branchName)
}

/**
 * Gets a branch name suggestion based on a task name.
 *
 * @remarks
 * Generates a valid branch name from a task description, following common
 * Git branch naming conventions.
 *
 * @param taskName - The task name to convert
 * @param prefix - Optional prefix for the branch (e.g., 'feature', 'bugfix')
 * @returns A valid branch name suggestion
 *
 * @example
 * ```typescript
 * const branchName = getBranchNameFromTask('Add user authentication', 'feature')
 * console.log(branchName) // 'feature/add-user-authentication'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function getBranchNameFromTask(
  taskName: string,
  prefix?: string
): string {
  const sanitized = sanitizeBranchName(taskName)

  if (prefix) {
    return `${prefix}/${sanitized}`
  }

  return sanitized
}
