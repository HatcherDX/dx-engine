import type { Configuration } from 'electron-builder'
import { build, Platform } from 'electron-builder'
import type { CopySyncOptions } from 'node:fs'
import { cpSync } from 'node:fs'
import path from 'node:path'
import process, { exit, platform } from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const version = process.env.VITE_APP_VERSION
const isDev = process.env.NODE_ENV === 'development'
const appName = isDev ? 'Hatcher Dev' : 'Hatcher'
const appId = isDev ? 'com.hatcherdx.engine-dev' : 'com.hatcherdx.engine'
const shortcutName = isDev ? 'Hatcher Dev' : 'Hatcher'

console.log('Is development environment:', isDev, appName)
console.log('APP version:', version)

const workDir = path.join(__dirname, '../')

const copySyncOptions: CopySyncOptions = {
  recursive: true,
  /**
   * Filter source map files
   */
  filter: (src) => !src.endsWith('.map') && !src.endsWith('.d.ts'),
}

cpSync(
  path.join(workDir, '../web/dist'),
  path.join(workDir, './dist/web'),
  copySyncOptions
)
cpSync(
  path.join(workDir, '../preload/dist'),
  path.join(workDir, './dist/preload'),
  copySyncOptions
)

const config: Configuration = {
  appId: 'com.hatcherdx.engine',
  productName: 'Hatcher',
  copyright: 'Copyright © 2025 Hatcher',
  directories: {
    output: 'dist-final',
    buildResources: 'build',
  },
  files: [
    'dist/main.cjs',
    'dist/web/**/*',
    'dist/preload/**/*',
    'package.json',
  ],
  extraFiles: [
    {
      from: 'dist-vite/',
      to: 'dist-vite/',
      filter: ['**/*'],
    },
  ],
  mac: {
    icon: 'build/icon.icns',
    category: 'public.app-category.developer-tools',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
  },
  win: {
    icon: 'build/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
}

// Target platform to package
const targetPlatform: Platform = {
  darwin: Platform.MAC,
  win32: Platform.WINDOWS,
  linux: Platform.LINUX,
}[platform]

build({
  targets: targetPlatform.createTarget(),
  config: config,
  publish: process.env.CI ? 'always' : 'never',
})
  .then((result) => {
    console.log(JSON.stringify(result))
    const outDir = path.join(workDir, config.directories!.output!)
    console.log(
      '\x1B[32m',
      `Build completed 🎉🎉🎉 Your files are in ${outDir} directory 🤪🤪🤪`
    )
  })
  .catch((error) => {
    console.log('\x1B[31m', 'Build failed, error:', error)
    exit(1)
  })
