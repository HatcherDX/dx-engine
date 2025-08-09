/**
 * @fileoverview Core module exports for Git Genius.
 *
 * @description
 * Exports core Git Genius functionality including engines, managers,
 * and integration components.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

export { GitEngine } from './GitEngine'
export {
  RepositoryManager,
  type RepositoryInstance,
  type RepositoryManagerConfig,
} from './RepositoryManager'
export { EnhancedGitRunner } from './EnhancedGitRunner'
