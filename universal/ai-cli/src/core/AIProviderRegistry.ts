/**
 * @fileoverview Registry for managing AI providers.
 *
 * @description
 * Central registry for all AI providers with support for registration,
 * discovery, and default provider management.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { AIProvider } from './AIProvider'

/**
 * Registry for managing AI providers.
 *
 * @public
 */
export class AIProviderRegistry {
  private providers = new Map<string, AIProvider>()
  private defaultProvider?: string

  /**
   * Register an AI provider.
   *
   * @param provider - Provider to register
   *
   * @public
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider)

    // Auto-set first provider as default
    if (!this.defaultProvider) {
      this.defaultProvider = provider.name
    }
  }

  /**
   * Get provider by name or return default.
   *
   * @param name - Provider name (optional)
   * @returns Provider instance if found
   *
   * @public
   */
  getProvider(name?: string): AIProvider | undefined {
    const providerName = name || this.defaultProvider
    return providerName ? this.providers.get(providerName) : undefined
  }

  /**
   * Get all registered providers.
   *
   * @returns Array of all providers
   *
   * @public
   */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get all available (installed and configured) providers.
   *
   * @returns Promise resolving to array of available providers
   *
   * @public
   */
  async getAvailableProviders(): Promise<AIProvider[]> {
    const providers = this.getAllProviders()
    const checks = await Promise.all(
      providers.map(async (p) => ({
        provider: p,
        available: await p.isAvailable(),
      }))
    )

    return checks.filter((c) => c.available).map((c) => c.provider)
  }

  /**
   * Set default provider.
   *
   * @param providerName - Name of provider to set as default
   *
   * @throws Error if provider not registered
   *
   * @public
   */
  setDefault(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider not registered: ${providerName}`)
    }
    this.defaultProvider = providerName
  }

  /**
   * Unregister a provider.
   *
   * @param providerName - Name of provider to unregister
   *
   * @public
   */
  unregister(providerName: string): void {
    this.providers.delete(providerName)

    // Reset default if we unregistered it
    if (this.defaultProvider === providerName) {
      const remaining = this.getAllProviders()
      this.defaultProvider = remaining[0]?.name
    }
  }
}

/**
 * Global singleton instance of AIProviderRegistry.
 *
 * @public
 */
export const aiProviderRegistry = new AIProviderRegistry()
