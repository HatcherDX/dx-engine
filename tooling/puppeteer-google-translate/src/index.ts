// Core exports
export { GoogleTranslator } from './google-translator.js'
export {
  BrowserFactory,
  MockBrowserFactory,
} from './factories/BrowserFactory.js'

// Type exports
export type { ISO639Type } from './ISO-639-code.js'
export type {
  GoogleTranslatorConfig,
  TranslationRequest,
  TranslationResult,
  TranslationServiceInterface,
  BrowserFactoryInterface,
  ErrorCode,
} from './types/index.js'

// Error exports
export {
  TranslationError,
  BrowserError,
  ERROR_CODES,
  DEFAULT_CONFIG,
} from './types/index.js'

import { GoogleTranslator } from './google-translator.js'
import type { ISO639Type } from './ISO-639-code.js'

// Convenience function for simple translations
export async function translateText(
  text: string,
  from: string = 'auto',
  to: ISO639Type = 'en'
): Promise<string> {
  const translator = new GoogleTranslator({ headless: true, verbose: false })
  try {
    return await translator.translateText(text, from, to)
  } finally {
    await translator.close()
  }
}
