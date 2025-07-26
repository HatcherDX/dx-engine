import * as ChromeLauncher from 'chrome-launcher'
import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'
import type { GoogleTranslatorConfig, IBrowserFactory } from '../types/index.js'
import { BrowserError, ERROR_CODES } from '../types/index.js'

/**
 * Factory for creating and configuring Puppeteer browser instances
 * Implements dependency injection pattern for better testability
 */
export class BrowserFactory implements IBrowserFactory {
  /**
   * Get Chrome executable path using chrome-launcher
   */
  getChromePath(): string {
    try {
      return ChromeLauncher.getChromePath()
    } catch (error) {
      throw new BrowserError(
        'Failed to find Chrome installation',
        ERROR_CODES.BROWSER_LAUNCH_FAILED,
        error
      )
    }
  }

  /**
   * Create a new browser instance with specified configuration
   */
  async createBrowser(config: GoogleTranslatorConfig): Promise<Browser> {
    try {
      const chromePath = this.getChromePath()

      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: config.headless ?? true,
        slowMo: config.slowMo ?? 0,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
        defaultViewport: {
          width: 1280,
          height: 720,
        },
      })

      // Set up browser error handling
      browser.on('disconnected', () => {
        if (config.verbose) {
          console.warn('Browser disconnected')
        }
      })

      return browser
    } catch (error) {
      throw new BrowserError(
        `Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.BROWSER_LAUNCH_FAILED,
        error
      )
    }
  }
}

/**
 * Mock browser factory for testing
 */
export class MockBrowserFactory implements IBrowserFactory {
  constructor(private mockBrowser: Browser) {}

  getChromePath(): string {
    return '/mock/chrome/path'
  }

  async createBrowser(): Promise<Browser> {
    return this.mockBrowser
  }
}
