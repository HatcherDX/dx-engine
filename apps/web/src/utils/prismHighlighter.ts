/**
 * @fileoverview Prism.js-based syntax highlighting utility for code diff viewer.
 *
 * @description
 * Provides syntax highlighting capabilities using Prism.js for the WebGLDiffViewer.
 * This implementation is CSP-friendly and generates inline styles directly.
 *
 * @example
 * ```typescript
 * const html = highlightCode('const a = 1', 'javascript')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import Prism from 'prismjs'

// Import language components
import 'prismjs/components/prism-bash.js'
import 'prismjs/components/prism-c.js'
import 'prismjs/components/prism-cpp.js'
import 'prismjs/components/prism-css.js'
import 'prismjs/components/prism-docker.js'
import 'prismjs/components/prism-go.js'
import 'prismjs/components/prism-ini.js'
import 'prismjs/components/prism-java.js'
import 'prismjs/components/prism-javascript.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-jsx.js'
import 'prismjs/components/prism-less.js'
import 'prismjs/components/prism-markdown.js'
import 'prismjs/components/prism-markup.js' // HTML/XML
import 'prismjs/components/prism-php.js'
import 'prismjs/components/prism-python.js'
import 'prismjs/components/prism-ruby.js'
import 'prismjs/components/prism-rust.js'
import 'prismjs/components/prism-sass.js'
import 'prismjs/components/prism-scss.js'
import 'prismjs/components/prism-sql.js'
import 'prismjs/components/prism-toml.js'
import 'prismjs/components/prism-tsx.js'
import 'prismjs/components/prism-typescript.js'
import 'prismjs/components/prism-yaml.js'

/**
 * Defines a custom Vue language for Prism.js to properly highlight Vue SFC files.
 * This handles template, script, and style blocks with their respective syntaxes.
 *
 * @private
 */
function defineVueLanguage(): void {
  // Start with markup as base
  Prism.languages.vue = Prism.languages.extend('markup', {})

  // Add Vue-specific patterns with high priority (processed first)
  Prism.languages.insertBefore('vue', 'tag', {
    // Vue interpolations {{ ... }}
    'vue-interpolation': {
      pattern: /\{\{[^}]*\}\}/,
      greedy: true,
      inside: {
        'interpolation-punctuation': {
          pattern: /^\{\{|\}\}$/,
          alias: 'punctuation',
        },
        'interpolation-expression': {
          pattern: /[\s\S]+/,
          inside: Prism.languages.javascript,
        },
      },
    },
  })

  // Override the tag pattern to better handle Vue components and directives
  interface PrismVueLanguage {
    tag?: unknown
    [key: string]: unknown
  }
  ;(Prism.languages.vue as PrismVueLanguage).tag = {
    pattern: /<\/?(?:[\w-]+:)?[\w-]+(?:\s+[^>]*)?>/,
    greedy: true,
    inside: {
      tag: {
        pattern: /^<\/?(?:[\w-]+:)?[\w-]+/,
        inside: {
          punctuation: /^<\/?/,
          'vue-component': {
            pattern: /^[A-Z][\w-]*/,
            alias: 'class-name',
          },
          'tag-name': {
            pattern: /^[a-z][\w-]*/,
            alias: 'tag',
          },
          namespace: /^[\w-]+:/,
        },
      },

      // Vue event handlers (@click, @submit, etc.)
      'vue-event': {
        pattern:
          /@[\w-]+(?:\.[a-z]+)*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+))?/,
        greedy: true,
        inside: {
          'event-name': {
            pattern: /^@[\w-]+(?:\.[a-z]+)*/,
            alias: 'keyword',
          },
          punctuation: /=/,
          'event-value': {
            pattern: /(?<==)[\s\S]+/,
            inside: {
              punctuation: /^["']|["']$/,
              'event-handler': {
                pattern: /[\s\S]+/,
                inside: Prism.languages.javascript,
              },
            },
          },
        },
      },

      // Vue prop bindings (:prop, :data-attr, etc.)
      'vue-binding': {
        pattern: /:[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+))?/,
        greedy: true,
        inside: {
          'binding-name': {
            pattern: /^:[\w-]+/,
            alias: 'attr-name',
          },
          punctuation: /=/,
          'binding-value': {
            pattern: /(?<==)[\s\S]+/,
            inside: {
              punctuation: /^["']|["']$/,
              'binding-expression': {
                pattern: /[\s\S]+/,
                inside: Prism.languages.javascript,
              },
            },
          },
        },
      },

      // Vue directives (v-if, v-for, v-model, etc.)
      'vue-directive': {
        pattern:
          /v-[\w-]+(?:\.[a-z]+)*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+))?/,
        greedy: true,
        inside: {
          'directive-name': {
            pattern: /^v-[\w-]+(?:\.[a-z]+)*/,
            alias: 'keyword',
          },
          punctuation: /=/,
          'directive-value': {
            pattern: /(?<==)[\s\S]+/,
            inside: {
              punctuation: /^["']|["']$/,
              'directive-expression': {
                pattern: /[\s\S]+/,
                inside: Prism.languages.javascript,
              },
            },
          },
        },
      },

      // Regular HTML attributes
      'attr-value': {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
        inside: {
          punctuation: [
            {
              pattern: /^=/,
              alias: 'attr-equals',
            },
            /^["']|["']$/,
          ],
          value: /[\s\S]+/,
        },
      },

      punctuation: /\/?>/,

      'attr-name': {
        pattern: /[\w-]+/,
        inside: {
          namespace: /^[\w-]+:/,
        },
      },
    },
  }
}

// Define custom Vue language for better SFC support
defineVueLanguage()

// Color scheme for vitesse-dark theme
const VITESSE_DARK_COLORS: Record<string, string> = {
  comment: '#758575',
  prolog: '#758575',
  doctype: '#758575',
  cdata: '#758575',
  punctuation: '#C9D1D9',
  namespace: '#CB7676',
  tag: '#4D9375',
  operator: '#C98A7D',
  number: '#4C9A91',
  property: '#BD976A',
  function: '#80A665',
  'tag-id': '#EEEBFF',
  selector: '#BD976A',
  'atrule-id': '#EEEBFF',
  'attr-name': '#BD976A',
  boolean: '#4D9375',
  string: '#C98A7D',
  entity: '#4D9375',
  url: '#4D9375',
  'attr-value': '#C98A7D',
  control: '#4D9375',
  directive: '#4D9375',
  unit: '#4D9375',
  statement: '#CB7676',
  regex: '#4C9A91',
  atrule: '#4D9375',
  keyword: '#CB7676',
  placeholder: '#4D9375',
  variable: '#BD976A',
  deleted: '#CE5D97',
  inserted: '#4D9375',
  italic: '#758575',
  important: '#CB7676',
  bold: '#CB7676',
  // Vue-specific tokens
  'vue-component': '#80A665', // Green for Vue components
  'vue-directive': '#CB7676', // Red for v-directives
  'vue-binding': '#BD976A', // Yellow for :props
  'vue-event': '#4D9375', // Cyan for @events
  'vue-interpolation': '#BD976A', // Yellow for {{ }}
  'class-name': '#80A665', // Green for classes/components
  'event-name': '#4D9375', // Cyan for event names
  'binding-name': '#BD976A', // Yellow for binding names
  'directive-name': '#CB7676', // Red for directive names
  'tag-name': '#4D9375', // Green for regular HTML tags
  'interpolation-punctuation': '#C9D1D9', // Gray for {{ }}
  'interpolation-expression': '#BD976A', // Yellow for expressions
  'event-handler': '#80A665', // Green for event handler functions
  'binding-expression': '#BD976A', // Yellow for binding expressions
  'directive-expression': '#CB7676', // Red for directive expressions
  value: '#C98A7D', // Orange for regular attribute values
}

/**
 * Language mapping from file extensions to Prism language identifiers.
 *
 * @private
 */
const languageMap: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.vue': 'vue', // Use custom Vue language
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.html': 'markup',
  '.xml': 'markup',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.py': 'python',
  '.go': 'go',
  '.rust': 'rust',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.php': 'php',
  '.rb': 'ruby',
  '.sh': 'bash',
  '.sql': 'sql',
  '.dockerfile': 'docker',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'ini',
}

/**
 * Detects the programming language from a file path.
 *
 * @param filePath - Path to the file
 * @returns Language identifier or 'plaintext' if not recognized
 *
 * @example
 * ```typescript
 * const lang = detectLanguage('src/component.vue') // 'markup'
 * const lang = detectLanguage('utils.ts') // 'typescript'
 * ```
 *
 * @public
 */
export function detectLanguage(filePath: string): string {
  const extension = filePath.includes('.')
    ? '.' + filePath.split('.').pop()?.toLowerCase()
    : ''

  return languageMap[extension] || 'plaintext'
}

/**
 * Converts a Prism token to HTML with inline styles.
 *
 * @param token - Prism token or string
 * @returns HTML string with inline styles
 * @private
 */
function tokenToHTML(token: Prism.Token | string): string {
  if (typeof token === 'string') {
    return escapeHtml(token)
  }

  const content = Array.isArray(token.content)
    ? token.content.map(tokenToHTML).join('')
    : typeof token.content === 'string'
      ? escapeHtml(token.content)
      : tokenToHTML(token.content as Prism.Token)

  const color = VITESSE_DARK_COLORS[token.type] || '#C9D1D9'

  return `<span style="color:${color}">${content}</span>`
}

/**
 * Escapes HTML special characters for safe display.
 *
 * @param text - Text to escape
 * @returns HTML-escaped text
 * @private
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Highlights code using Prism.js with inline styles.
 *
 * @param code - Code content to highlight
 * @param language - Programming language identifier
 * @returns HTML string with inline styles
 *
 * @example
 * ```typescript
 * const html = highlightCode('const a = 1', 'javascript')
 * ```
 *
 * @public
 */
export function highlightCode(code: string, language: string): string {
  try {
    console.log(
      `[Prism Highlighter] Highlighting "${code.substring(0, 30)}..." as ${language}`
    )
    console.log(
      `[Prism Highlighter] Available languages:`,
      Object.keys(Prism.languages)
    )

    // Check if language is supported
    const grammar = Prism.languages[language]
    if (!grammar) {
      console.log(
        `[Prism Highlighter] Language ${language} not supported, available:`,
        Object.keys(Prism.languages)
      )

      // If it's plaintext, just escape and return
      if (language === 'plaintext') {
        return escapeHtml(code)
      }

      // Try to find a fallback language
      const fallbacks: Record<string, string> = {
        plaintext: 'markup',
      }

      const fallbackLang = fallbacks[language]
      if (fallbackLang && Prism.languages[fallbackLang]) {
        console.log(
          `[Prism Highlighter] Using fallback language: ${fallbackLang}`
        )
        return highlightCode(code, fallbackLang)
      }

      return escapeHtml(code)
    }

    // Tokenize the code
    const tokens = Prism.tokenize(code, grammar)
    console.log(`[Prism Highlighter] Tokenized into ${tokens.length} tokens`)
    console.log(`[Prism Highlighter] First few tokens:`, tokens.slice(0, 3))

    // Convert tokens to HTML with inline styles
    const html = tokens.map(tokenToHTML).join('')

    console.log(`[Prism Highlighter] ✅ Generated HTML with inline styles`)
    console.log(
      `[Prism Highlighter] Result has styles:`,
      html.includes('style=')
    )
    console.log(`[Prism Highlighter] Sample:`, html.substring(0, 200))

    return html
  } catch (error) {
    console.error(`[Prism Highlighter] Failed to highlight:`, error)
    return escapeHtml(code)
  }
}

/**
 * Creates a syntax highlighting utility specifically for diff viewing.
 *
 * @param filePath - Path to the file being diffed
 * @returns Object with highlighting methods
 *
 * @example
 * ```typescript
 * const diffHighlighter = createPrismDiffHighlighter('src/App.vue')
 * const html = diffHighlighter.highlightLine('const data = ref({})')
 * ```
 *
 * @public
 */
export function createPrismDiffHighlighter(filePath: string) {
  const language = detectLanguage(filePath)

  return {
    /**
     * Highlights a line of code for this specific file.
     *
     * @param code - Code content to highlight
     * @returns Highlighted HTML with inline styles
     */
    highlightLine: (code: string): string => {
      return highlightCode(code, language)
    },

    /**
     * Gets the detected language for this file.
     *
     * @returns Language identifier
     */
    getLanguage: (): string => language,
  }
}

/**
 * Test function to verify Prism highlighting works.
 * Call this from browser console: window.testPrismHighlighting()
 */
export function testPrismHighlighting() {
  console.log('🧪 Testing Prism syntax highlighting...')

  const testCases = [
    { code: 'const greeting = "Hello World";', lang: 'javascript' },
    { code: 'function test(): number { return 42; }', lang: 'typescript' },
    { code: '<div class="test">Hello</div>', lang: 'markup' },
    { code: '.test { color: red; }', lang: 'css' },
  ]

  for (const { code, lang } of testCases) {
    try {
      const result = highlightCode(code, lang)
      console.log(`✅ ${lang}: ${code}`)
      console.log('   HTML:', result)
      console.log('   Has inline styles:', result.includes('style='))

      // Create a test element to display the result
      const testDiv = document.createElement('div')
      testDiv.innerHTML = result
      testDiv.style.background = '#1e1e1e'
      testDiv.style.padding = '10px'
      testDiv.style.margin = '5px'
      testDiv.style.fontFamily = 'monospace'
      testDiv.style.borderRadius = '4px'
      testDiv.style.color = '#C9D1D9'

      // Append to body temporarily to see the result
      document.body.appendChild(testDiv)

      // Remove after 5 seconds
      setTimeout(() => testDiv.remove(), 5000)
    } catch (error) {
      console.error(`❌ Failed ${lang}:`, error)
    }
  }

  return 'Test complete - check console and page for results'
}

// Export to window for manual testing
if (typeof window !== 'undefined') {
  ;(
    window as unknown as { testPrismHighlighting: typeof testPrismHighlighting }
  ).testPrismHighlighting = testPrismHighlighting
}
