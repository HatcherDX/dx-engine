/**
 * @fileoverview Action configuration loader from YAML files.
 *
 * @description
 * Loads and parses .hatcher/actions.yaml configuration files,
 * converting them into ActionDefinition objects for the scheduler.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { parse as parseYAML } from 'yaml'
import type { ActionsConfig, ActionDefinition } from './types'

/**
 * Action configuration loader
 *
 * @remarks
 * Parses YAML configuration and validates schema.
 * Converts flat YAML structure into ActionDefinition objects.
 *
 * @example
 * ```typescript
 * const loader = new ActionLoader()
 * const actions = loader.parseConfig(yamlContent)
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class ActionLoader {
  /**
   * Parse YAML configuration string
   *
   * @param yamlContent - Raw YAML file content
   * @returns ActionsConfig object
   *
   * @throws {@link SyntaxError}
   * Thrown when YAML is malformed
   *
   * @public
   */
  parseConfig(yamlContent: string): ActionsConfig {
    try {
      const config = parseYAML(yamlContent) as ActionsConfig
      this.validateConfig(config)
      return config
    } catch (error) {
      throw new Error(
        `Failed to parse actions config: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Convert ActionsConfig to ActionDefinition array
   *
   * @param config - Parsed configuration object
   * @returns Array of ActionDefinition objects
   *
   * @remarks
   * Converts the YAML structure (Record<string, ActionDef>) into
   * an array with IDs embedded in each definition.
   *
   * @public
   */
  toActionDefinitions(config: ActionsConfig): ActionDefinition[] {
    return Object.entries(config.actions).map(([id, action]) => ({
      id,
      name: action.name,
      description: action.description,
      command: action.command,
      icon: action.icon,
      dependencies: action.dependencies || [],
      parallel: action.parallel ?? false,
      estimatedDuration: action.estimatedDuration || 5000,
    }))
  }

  /**
   * Get actions for a specific group
   *
   * @param config - Parsed configuration object
   * @param groupName - Group identifier (e.g., "pre-commit")
   * @returns Array of ActionDefinition objects in the group
   *
   * @throws {@link Error}
   * Thrown when group doesn't exist
   *
   * @public
   */
  getGroupActions(
    config: ActionsConfig,
    groupName: string
  ): ActionDefinition[] {
    const actionIds = config.groups[groupName]

    if (!actionIds) {
      throw new Error(`Action group "${groupName}" not found`)
    }

    return actionIds
      .map((id) => {
        const action = config.actions[id]
        if (!action) {
          console.warn(`Action "${id}" referenced in group but not defined`)
          return null
        }
        return {
          id,
          ...action,
          dependencies: action.dependencies || [],
          parallel: action.parallel,
          estimatedDuration: action.estimatedDuration,
          icon: action.icon,
          affectedBy: action.affectedBy,
          matrix: action.matrix,
          cache: action.cache,
        } as ActionDefinition
      })
      .filter((action): action is ActionDefinition => action !== null)
  }

  /**
   * Validate configuration schema
   *
   * @param config - Configuration to validate
   *
   * @throws {@link Error}
   * Thrown when configuration is invalid
   *
   * @private
   */
  private validateConfig(config: ActionsConfig): void {
    if (!config.version) {
      throw new Error('Config missing required field: version')
    }

    if (!config.project) {
      throw new Error('Config missing required field: project')
    }

    if (!config.actions || typeof config.actions !== 'object') {
      throw new Error('Config missing or invalid field: actions')
    }

    // Validate each action has required fields
    for (const [id, action] of Object.entries(config.actions)) {
      if (!action.name) {
        throw new Error(`Action "${id}" missing required field: name`)
      }

      if (!action.command) {
        throw new Error(`Action "${id}" missing required field: command`)
      }

      // Validate dependencies exist
      if (action.dependencies) {
        for (const depId of action.dependencies) {
          if (!config.actions[depId]) {
            throw new Error(
              `Action "${id}" has invalid dependency: "${depId}" not found`
            )
          }
        }
      }
    }

    // Validate no circular dependencies
    this.detectCircularDependencies(config)
  }

  /**
   * Detect circular dependencies in action graph
   *
   * @param config - Configuration to check
   *
   * @throws {@link Error}
   * Thrown when circular dependency is detected
   *
   * @private
   */
  private detectCircularDependencies(config: ActionsConfig): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const visit = (actionId: string, path: string[] = []): void => {
      if (recursionStack.has(actionId)) {
        const cycle = [...path, actionId].join(' -> ')
        throw new Error(`Circular dependency detected: ${cycle}`)
      }

      if (visited.has(actionId)) {
        return
      }

      visited.add(actionId)
      recursionStack.add(actionId)

      const action = config.actions[actionId]
      if (action?.dependencies) {
        for (const depId of action.dependencies) {
          visit(depId, [...path, actionId])
        }
      }

      recursionStack.delete(actionId)
    }

    // Visit all actions
    for (const actionId of Object.keys(config.actions)) {
      if (!visited.has(actionId)) {
        visit(actionId)
      }
    }
  }
}
