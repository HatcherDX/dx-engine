import { describe, it, expect } from 'vitest'
import { MarkdownProtectionService } from '../services/MarkdownProtectionService.js'
import { DEFAULT_PROTECTION_CONFIG } from '../types/index.js'

describe('MarkdownProtectionService', () => {
  let service: MarkdownProtectionService

  beforeEach(() => {
    service = new MarkdownProtectionService()
  })

  describe('protect', () => {
    it('should protect code blocks with unified tokens', () => {
      const content = `# Title
\`\`\`js
console.log('test')
\`\`\`
Some text`

      const result = service.protect(content, DEFAULT_PROTECTION_CONFIG)

      expect(result.content).not.toContain('console.log')
      expect(result.content).toContain('[#c1#]')
      expect(result.protectedElements.codeBlocks).toHaveLength(1)
      expect(result.protectedElements.codeBlocks[0]).toContain('console.log')
    })

    it('should protect inline code with unified tokens', () => {
      const content = 'Use `console.log()` for debugging'

      const result = service.protect(content)

      expect(result.content).not.toContain('console.log()')
      expect(result.content).toContain('[#i1#]')
      expect(result.protectedElements.inlineCode).toHaveLength(1)
    })

    it('should protect YAML frontmatter preserving structure', () => {
      const content = `---
title: Test Page
description: A test page
tags: [test, example]
---

# Content`

      const result = service.protect(content)

      expect(result.content).toContain('[#f0#]')
      expect(result.protectedElements.frontmatter).toHaveLength(1)
      expect(result.yamlTexts).toContain('Test Page')
      expect(result.yamlTexts).toContain('A test page')

      // Check that structure is preserved in protected frontmatter
      const protectedFrontmatter = result.protectedElements.frontmatter[0]
      expect(protectedFrontmatter).toContain('[#y1#]') // title token
      expect(protectedFrontmatter).toContain('[#y2#]') // description token
      expect(protectedFrontmatter).toContain('tags: [test, example]') // non-translatable preserved
    })

    it('should protect HTML tags with unified tokens', () => {
      const content = 'Text with <strong>bold</strong> and <em>italic</em>'

      const result = service.protect(content)

      expect(result.content).not.toContain('<strong>')
      expect(result.content).toContain('[#h1#]')
      expect(result.content).toContain('[#h2#]')
      expect(result.protectedElements.htmlTags).toHaveLength(4) // <strong>, </strong>, <em>, </em>
    })

    it('should protect markdown links with unified tokens', () => {
      const content =
        'Check [documentation](https://example.com) and [local](/docs)'

      const result = service.protect(content)

      expect(result.content).not.toContain('https://example.com')
      expect(result.content).toContain('[#l1#]')
      expect(result.content).toContain('[#l2#]')
      expect(result.protectedElements.links).toHaveLength(2)
    })

    it('should handle complex markdown with multiple protection types', () => {
      const content = `---
title: API Reference
---

# API Documentation

Use \`fetch('/api/users')\` to get users:

\`\`\`js
const response = await fetch('/api/users')
const users = await response.json()
\`\`\`

See <a href="/docs">documentation</a> for more info.`

      const result = service.protect(content)

      expect(result.protectedElements.frontmatter).toHaveLength(1)
      expect(result.protectedElements.inlineCode).toHaveLength(1)
      expect(result.protectedElements.codeBlocks).toHaveLength(1)
      expect(result.protectedElements.htmlTags).toHaveLength(2) // <a>, </a>
      expect(result.yamlTexts).toContain('API Reference')
    })

    it('should extract translatable YAML texts', () => {
      const content = `---
title: My Page
description: Page description
author: John Doe
date: 2024-01-01
published: true
---`

      const result = service.protect(content)

      expect(result.yamlTexts).toContain('My Page')
      expect(result.yamlTexts).toContain('Page description')
      expect(result.yamlTexts).not.toContain('John Doe') // author names shouldn't be translated
      expect(result.yamlTexts).not.toContain('2024-01-01') // dates shouldn't be translated
      expect(result.yamlTexts).not.toContain('true') // booleans shouldn't be translated
    })
  })

  describe('restore', () => {
    it('should restore protected elements correctly', () => {
      const originalContent = `# Title
\`\`\`js
console.log('test')
\`\`\`
Use \`fetch()\` for API calls`

      const protectedContent = service.protect(originalContent)
      const translatedContent = protectedContent.content.replace(
        'Title',
        'Título'
      )

      const restoredProtected = {
        ...protectedContent,
        content: translatedContent,
      }

      const restored = service.restore(restoredProtected, [])

      expect(restored).toContain('Título')
      expect(restored).toContain("console.log('test')")
      expect(restored).toContain('`fetch()`')
    })

    it('should restore YAML frontmatter with translations', () => {
      const content = `---
title: Test Page
description: A test description
---

# Content`

      const protectedContent = service.protect(content)

      // Simulate translated content with YAML block containing translations
      const translatedContent = protectedContent.content.replace(
        /\[#yaml#\]\nTest Page\nA test description\n\[#yaml#\]/,
        '[#yaml#]\nPágina de Prueba\nUna descripción de prueba\n[#yaml#]'
      )

      const translatedProtectedContent = {
        ...protectedContent,
        content: translatedContent,
      }

      const restored = service.restore(translatedProtectedContent, [])

      expect(restored).toContain('title: Página de Prueba')
      expect(restored).toContain('description: Una descripción de prueba')
    })

    it('should restore content without automatic corrections (preserving original)', () => {
      const content = `# Title
Text with spaces and formatting`

      const protectedContent = service.protect(content)
      // Simulate translation
      const translatedContent = protectedContent.content
        .replace('Title', 'Título')
        .replace('spaces', 'espacios')

      const restoredProtected = {
        ...protectedContent,
        content: translatedContent,
      }

      const restored = service.restore(restoredProtected, [])

      expect(restored).toContain('Título')
      expect(restored).toContain('espacios')
      // New system preserves original structure without "corrections"
    })

    it('should handle empty translations gracefully', () => {
      const content = '# Title\nSome content'
      const protectedContent = service.protect(content)

      const restored = service.restore(protectedContent, [])

      expect(restored).toBe(content) // Should return original if no translations
    })
  })

  describe('custom patterns', () => {
    it('should support custom protection patterns', () => {
      const customConfig = {
        ...DEFAULT_PROTECTION_CONFIG,
        customPatterns: [
          {
            name: 'version',
            pattern: /v\d+\.\d+\.\d+/g,
            placeholder: 'version',
          },
        ],
      }

      const content = 'Version v1.2.3 is now available'
      const result = service.protect(content, customConfig)

      expect(result.content).not.toContain('v1.2.3')
      expect(result.content).toContain('[#version1#]')
      expect(result.protectedElements.version).toHaveLength(1)
    })
  })

  describe('chunking', () => {
    it('should create single chunk for small content', () => {
      const content = 'Short content that fits in one chunk'
      const chunks = service.createChunks(content)

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toBe(content)
    })

    it('should create multiple chunks for large content', () => {
      // Create content larger than MAX_CHUNK_SIZE (4500) with multiple lines
      const longContent = 'This is a long line of text.\n'.repeat(200) // About 5600 chars
      const chunks = service.createChunks(longContent)

      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(4500)
      })
    })

    it('should not break tokens when chunking', () => {
      const content =
        'Line 1\n'.repeat(300) + '[#c1#]' + '\nLine after token\n'.repeat(300)
      const chunks = service.createChunks(content)

      // Find chunk containing the token
      const tokenChunk = chunks.find((chunk) => chunk.includes('[#c1#]'))
      expect(tokenChunk).toBeDefined()
      expect(tokenChunk).toContain('[#c1#]')
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = service.protect('')

      expect(result.content).toBe('')
      expect(Object.keys(result.protectedElements)).toHaveLength(0)
      expect(result.yamlTexts).toEqual([])
    })

    it('should handle content with no protectable elements', () => {
      const content = 'Simple text with no special elements'
      const result = service.protect(content)

      expect(result.content).toBe(content)
      expect(Object.keys(result.protectedElements)).toHaveLength(0)
    })

    it('should handle malformed YAML frontmatter', () => {
      const content = `---
invalid: yaml: content
---

# Content`

      const result = service.protect(content)

      // Should still protect the frontmatter block even if YAML is invalid
      expect(result.protectedElements.frontmatter).toHaveLength(1)
    })
  })
})
