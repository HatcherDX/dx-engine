import type {
  MarkdownProtectionServiceInterface,
  MarkdownProtectionConfig,
  ProtectedContent,
  ProtectionPattern,
} from '../types/index.js'
import {
  DEFAULT_PROTECTION_CONFIG,
  TranslationSystemError,
  TRANSLATION_ERROR_CODES,
} from '../types/index.js'

/**
 * Unified token-based markdown protection service
 * Uses consistent [#type#] tokens: [#c1#] [#i1#] [#h1#] [#y1#] [#l1#]
 * Eliminates complex parsing and normalization in favor of simple token replacement
 */
export class MarkdownProtectionService
  implements MarkdownProtectionServiceInterface
{
  private static readonly MAX_CHUNK_SIZE = 4500 // Safe limit for Google Translate

  /**
   * Protect markdown content using unified token system
   * Tokens: [#c1#]=code, [#i1#]=inline, [#h1#]=html, [#y1#]=yaml, [#l1#]=links
   */
  protect(
    content: string,
    config: MarkdownProtectionConfig = DEFAULT_PROTECTION_CONFIG
  ): ProtectedContent {
    try {
      const effectiveConfig = { ...DEFAULT_PROTECTION_CONFIG, ...config }
      let protectedContent = content
      const protectedElements: Record<string, string[]> = {}
      let yamlTexts: string[] = []

      // Counters for each token type
      let codeIndex = 0
      let inlineIndex = 0
      let htmlIndex = 0
      let yamlIndex = 0
      let linkIndex = 0

      // 1. Protect code blocks first (highest priority)
      if (effectiveConfig.protectCodeBlocks) {
        const codeElements: string[] = []

        // Protect ```code``` blocks
        protectedContent = protectedContent.replace(
          /```[\s\S]*?```/g,
          (match) => {
            codeElements.push(match)
            return `[#c${++codeIndex}#]`
          }
        )

        // Protect <style> blocks
        protectedContent = protectedContent.replace(
          /<style[\s\S]*?<\/style>/gi,
          (match) => {
            codeElements.push(match)
            return `[#c${++codeIndex}#]`
          }
        )

        // Protect <css> blocks
        protectedContent = protectedContent.replace(
          /<css[\s\S]*?<\/css>/gi,
          (match) => {
            codeElements.push(match)
            return `[#c${++codeIndex}#]`
          }
        )

        if (codeElements.length > 0) protectedElements.codeBlocks = codeElements
      }

      // 2. Protect inline code
      if (effectiveConfig.protectInlineCode) {
        const inlineElements: string[] = []
        protectedContent = protectedContent.replace(/`[^`\n]+`/g, (match) => {
          inlineElements.push(match)
          return `[#i${++inlineIndex}#]`
        })
        if (inlineElements.length > 0)
          protectedElements.inlineCode = inlineElements
      }

      // 3. Protect HTML tags
      if (effectiveConfig.protectHtmlTags) {
        const htmlElements: string[] = []
        protectedContent = protectedContent.replace(/<[^>]+>/g, (match) => {
          htmlElements.push(match)
          return `[#h${++htmlIndex}#]`
        })
        if (htmlElements.length > 0) protectedElements.htmlTags = htmlElements
      }

      // 4. Protect YAML frontmatter values (preserve structure exactly)
      if (effectiveConfig.protectYamlFrontmatter) {
        const frontmatterElements: string[] = []

        protectedContent = protectedContent.replace(
          /^---[\s\S]*?^---/m,
          (frontmatter) => {
            let processedFrontmatter = frontmatter

            // Extract translatable YAML values while preserving key structure
            // NOTE: YAML keys (title:, description:, etc.) are preserved in English
            // but their values are extracted for translation
            processedFrontmatter = processedFrontmatter.replace(
              /(\s+(?:title|name|text|tagline|details|description):\s*['"]?)([^'"\n]+)(['"]?)/g,
              (match, prefix, value, suffix) => {
                const trimmedValue = value.trim()
                if (
                  trimmedValue &&
                  !trimmedValue.startsWith('[#') &&
                  trimmedValue.length > 1
                ) {
                  yamlTexts.push(trimmedValue)
                  return `${prefix}[#y${++yamlIndex}#]${suffix}`
                }
                return match
              }
            )

            frontmatterElements.push(processedFrontmatter)
            return `[#f0#]` // Single frontmatter token
          }
        )

        if (frontmatterElements.length > 0)
          protectedElements.frontmatter = frontmatterElements
      }

      // 5. Protect links
      if (effectiveConfig.protectLinks) {
        const linkElements: string[] = []
        protectedContent = protectedContent.replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          (match) => {
            linkElements.push(match)
            return `[#l${++linkIndex}#]`
          }
        )
        if (linkElements.length > 0) protectedElements.links = linkElements
      }

      // 6. Apply custom patterns
      if (effectiveConfig.customPatterns?.length) {
        for (const pattern of effectiveConfig.customPatterns) {
          const customElements: string[] = []
          let customIndex = 0
          protectedContent = protectedContent.replace(
            pattern.pattern,
            (match) => {
              customElements.push(match)
              return `[#${pattern.placeholder}${++customIndex}#]`
            }
          )
          if (customElements.length > 0)
            protectedElements[pattern.name] = customElements
        }
      }

      // 7. Add YAML texts for translation if present
      if (yamlTexts.length > 0) {
        protectedContent += `\n\n[#yaml#]\n${yamlTexts.join('\n')}\n[#yaml#]`
      }

      return {
        content: protectedContent,
        protectedElements,
        yamlTexts,
        originalContent: content,
      }
    } catch (error) {
      throw new TranslationSystemError(
        `Failed to protect markdown content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.PROTECTION_FAILED,
        undefined,
        error
      )
    }
  }

  /**
   * Create intelligent chunks for large content respecting token boundaries
   */
  createChunks(content: string): string[] {
    if (content.length <= MarkdownProtectionService.MAX_CHUNK_SIZE) {
      return [content]
    }

    const lines = content.split('\n')
    const chunks: string[] = []
    let currentChunk = ''

    for (const line of lines) {
      const proposedChunk = currentChunk + (currentChunk ? '\n' : '') + line

      // If adding this line would exceed limit
      if (proposedChunk.length > MarkdownProtectionService.MAX_CHUNK_SIZE) {
        // Only break if we're not in the middle of a token and have content
        if (currentChunk.trim() && !this.hasOpenToken(currentChunk)) {
          chunks.push(currentChunk.trim())
          currentChunk = line
        } else {
          // Continue accumulating if we're in a token or have no content yet
          currentChunk = proposedChunk
        }
      } else {
        currentChunk = proposedChunk
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * Check if content has an unclosed token
   */
  private hasOpenToken(content: string): boolean {
    // Look for token patterns [#type] without closing #]
    const openTokens = content.match(/\[#[cihylf]\d*$/g)
    return openTokens !== null
  }

  /**
   * Restore protected content by replacing tokens with original elements
   */
  restore(
    protectedContent: ProtectedContent,
    translatedTexts: string[]
  ): string {
    try {
      let restoredContent = protectedContent.content
      const { protectedElements } = protectedContent

      // 1. Extract and process translated YAML texts
      const processedYamlTexts = this.extractTranslatedYamlTexts(
        restoredContent,
        translatedTexts
      )

      // 2. Restore frontmatter with translated YAML values
      if (protectedElements.frontmatter?.length) {
        protectedElements.frontmatter.forEach((frontmatter, index) => {
          let restoredFrontmatter = frontmatter

          // Replace YAML tokens with translated texts one by one
          processedYamlTexts.forEach((translatedText, yamlIndex) => {
            const yamlToken = `[#y${yamlIndex + 1}#]`
            restoredFrontmatter = restoredFrontmatter.replace(
              new RegExp(yamlToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              translatedText
            )
          })

          restoredContent = restoredContent.replace(
            `[#f${index}#]`,
            restoredFrontmatter
          )
        })
      }

      // 3. Restore all other protected elements
      restoredContent = this.restoreTokenElements(
        restoredContent,
        protectedElements.codeBlocks,
        'c'
      )
      restoredContent = this.restoreTokenElements(
        restoredContent,
        protectedElements.inlineCode,
        'i'
      )
      restoredContent = this.restoreTokenElements(
        restoredContent,
        protectedElements.htmlTags,
        'h'
      )
      restoredContent = this.restoreTokenElements(
        restoredContent,
        protectedElements.links,
        'l'
      )

      // 4. Restore custom patterns
      Object.entries(protectedElements).forEach(([patternName, elements]) => {
        if (
          ![
            'frontmatter',
            'codeBlocks',
            'inlineCode',
            'htmlTags',
            'links',
          ].includes(patternName)
        ) {
          elements?.forEach((element, index) => {
            const token = `[#${patternName}${index + 1}#]`
            restoredContent = restoredContent.replace(token, element)
          })
        }
      })

      // 5. Remove YAML block used for translation
      restoredContent = restoredContent.replace(
        /\n\n\[#yaml#\]\n[\s\S]*?\n\[#yaml#\]/g,
        ''
      )

      return restoredContent
    } catch (error) {
      throw new TranslationSystemError(
        `Failed to restore markdown content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.RESTORATION_FAILED,
        undefined,
        error
      )
    }
  }

  /**
   * Restore token-based elements
   */
  private restoreTokenElements(
    content: string,
    elements: string[] | undefined,
    tokenType: string
  ): string {
    if (!elements?.length) return content

    elements.forEach((element, index) => {
      const token = `[#${tokenType}${index + 1}#]`
      content = content.replace(token, element)
    })

    return content
  }

  /**
   * Extract translated YAML texts from content
   */
  private extractTranslatedYamlTexts(
    content: string,
    translatedTexts: string[]
  ): string[] {
    const yamlBlockMatch = content.match(/\[#yaml#\]\n([\s\S]*?)\n\[#yaml#\]/)
    if (yamlBlockMatch && yamlBlockMatch[1]) {
      // Check if using special separator or newlines
      const yamlContent = yamlBlockMatch[1].trim()
      if (yamlContent.includes('|||YAML_SEPARATOR|||')) {
        return yamlContent
          .split('|||YAML_SEPARATOR|||')
          .filter((text) => text.trim())
      } else {
        return yamlContent.split('\n').filter((line) => line.trim())
      }
    }
    return translatedTexts
  }
}
