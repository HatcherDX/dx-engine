/**
 * @fileoverview Expands matrix configuration into individual action instances (GitHub Actions pattern).
 *
 * @description
 * Implements GitHub Actions-style matrix strategy:
 * - Generates Cartesian product of all matrix dimensions
 * - Creates unique action instance for each combination
 * - Injects matrix values as environment variables
 *
 * Context7 Pattern: GitHub Actions matrix builds
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import type { ActionDefinition } from './types'

/**
 * Action instance generated from matrix expansion
 *
 * @remarks
 * Represents a single job instance with matrix variables injected.
 *
 * @public
 * @since 2.0.0
 */
export interface ActionInstance extends ActionDefinition {
  /** Original action ID before matrix expansion */
  originalId: string

  /** Matrix variables for this instance */
  matrixVars: Record<string, string | number>
}

/**
 * Expands matrix configuration into individual action instances
 *
 * @remarks
 * Follows GitHub Actions matrix strategy pattern - creates
 * Cartesian product of all matrix dimensions.
 *
 * @example
 * ```typescript
 * const expander = new MatrixExpander()
 * const instances = expander.expand({
 *   id: 'test',
 *   name: 'Test',
 *   command: 'pnpm test',
 *   matrix: { os: ['linux', 'windows'], node: [18, 20] }
 * })
 * // Returns 4 instances:
 * // - test-linux-18 (os=linux, node=18)
 * // - test-linux-20 (os=linux, node=20)
 * // - test-windows-18 (os=windows, node=18)
 * // - test-windows-20 (os=windows, node=20)
 * ```
 *
 * @public
 * @since 2.0.0
 */
export class MatrixExpander {
  /**
   * Expand action with matrix into individual instances
   *
   * @param action - Action definition with matrix configuration
   * @returns Array of action instances (one per matrix combination)
   *
   * @remarks
   * If action has no matrix, returns single instance.
   * Matrix variables are injected as environment variables.
   *
   * @public
   */
  expand(action: ActionDefinition): ActionInstance[] {
    // No matrix - return single instance
    if (!action.matrix || Object.keys(action.matrix).length === 0) {
      return [
        {
          ...action,
          originalId: action.id,
          matrixVars: {},
        },
      ]
    }

    // Generate all combinations
    const combinations = this.cartesian(action.matrix)

    // Create action instance for each combination
    return combinations.map((vars) => {
      const matrixId = this.generateMatrixId(vars)

      return {
        ...action,
        id: `${action.id}-${matrixId}`,
        originalId: action.id,
        name: `${action.name} (${matrixId})`,
        matrixVars: vars,
      }
    })
  }

  /**
   * Generate Cartesian product of matrix dimensions
   *
   * @param matrix - Matrix configuration
   * @returns Array of all possible combinations
   *
   * @example
   * ```typescript
   * const combinations = expander.cartesian({
   *   os: ['linux', 'windows'],
   *   node: [18, 20]
   * })
   * // Returns:
   * // [
   * //   { os: 'linux', node: 18 },
   * //   { os: 'linux', node: 20 },
   * //   { os: 'windows', node: 18 },
   * //   { os: 'windows', node: 20 }
   * // ]
   * ```
   *
   * @private
   */
  private cartesian(
    matrix: Record<string, (string | number)[]>
  ): Record<string, string | number>[] {
    const keys = Object.keys(matrix)

    if (keys.length === 0) {
      return [{}]
    }

    // Recursive Cartesian product
    const combine = (index: number): Record<string, string | number>[] => {
      if (index >= keys.length) {
        return [{}]
      }

      const key = keys[index]
      const values = matrix[key]
      const rest = combine(index + 1)

      const result: Record<string, string | number>[] = []

      for (const value of values) {
        for (const combo of rest) {
          result.push({ [key]: value, ...combo })
        }
      }

      return result
    }

    return combine(0)
  }

  /**
   * Generate matrix ID from variable values
   *
   * @param vars - Matrix variables
   * @returns Hyphenated ID (e.g., "linux-18")
   *
   * @example
   * ```typescript
   * const id = expander.generateMatrixId({ os: 'linux', node: 18 })
   * // Returns: "linux-18"
   * ```
   *
   * @private
   */
  private generateMatrixId(vars: Record<string, string | number>): string {
    return Object.values(vars).join('-')
  }

  /**
   * Expand multiple actions with matrices
   *
   * @param actions - Array of action definitions
   * @returns Array of action instances (expanded)
   *
   * @remarks
   * Convenience method for batch expansion.
   *
   * @public
   */
  expandAll(actions: ActionDefinition[]): ActionInstance[] {
    const instances: ActionInstance[] = []

    for (const action of actions) {
      instances.push(...this.expand(action))
    }

    return instances
  }

  /**
   * Get total instance count without expanding
   *
   * @param action - Action definition with matrix
   * @returns Total number of instances that will be generated
   *
   * @example
   * ```typescript
   * const count = expander.getInstanceCount({
   *   matrix: { os: ['linux', 'windows', 'macos'], node: [18, 20, 22] }
   * })
   * // Returns: 9 (3 OS × 3 Node versions)
   * ```
   *
   * @public
   */
  getInstanceCount(action: ActionDefinition): number {
    if (!action.matrix || Object.keys(action.matrix).length === 0) {
      return 1
    }

    return Object.values(action.matrix).reduce(
      (product, values) => product * values.length,
      1
    )
  }
}
