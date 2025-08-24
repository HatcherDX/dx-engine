import type { Configuration } from 'electron-builder'
import { build, Platform } from 'electron-builder'
import type { CopySyncOptions } from 'node:fs'
import { cpSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process, { exit, platform } from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read electron version from package.json
// In monorepo structure, node_modules is at the root, three levels up from scripts/
const electronPkgPath = path.join(
  __dirname,
  '../../../node_modules/electron/package.json'
)
const electronPkg = JSON.parse(readFileSync(electronPkgPath, 'utf8'))
const electronVersion = electronPkg.version

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

// Detect target architecture from environment or use default
const targetArch =
  process.env.npm_config_arch || process.env.TARGET_ARCH || 'x64'
const isARM64Build = targetArch === 'arm64'

console.log('Target architecture:', targetArch)
console.log('Building for ARM64:', isARM64Build)

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
    // Universal binary support for macOS (both x64 and ARM64)
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64', 'universal'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64', 'universal'],
      },
    ],
    // Minimum macOS version for ARM64 support
    minimumSystemVersion: '11.0',
    // Enable hardened runtime for notarization
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },
  win: {
    icon: 'build/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'portable',
        arch: ['x64', 'arm64'],
      },
    ],
  },
  linux: {
    icon: 'build/icon.png',
    category: 'Development',
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'snap',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'tar.gz',
        arch: ['x64', 'arm64'],
      },
    ],
  },
  // NSIS installer configuration for Windows
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    // Different installer names for different architectures
    artifactName: '${productName}-Setup-${version}-${arch}.${ext}',
  },
  // DMG configuration for macOS
  dmg: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },
  // Architecture-specific node modules rebuild
  // Skip rebuild for Windows ARM64 to avoid node-pty C2362 compilation errors
  npmRebuild: process.env.SKIP_NODE_PTY_REBUILD !== 'true',
  // Build for specific architecture if specified
  ...(isARM64Build && {
    electronDist: `node_modules/electron/dist`,
    electronVersion: electronVersion,
  }),
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
