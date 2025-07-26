# Utility Scripts

This directory contains useful scripts for project development and maintenance.

## 🔧 System Requirements

### Node.js

- **Required version**: Node.js ≥22.0.0
- **Recommended managers**: Volta, nvm, or manual installation

### TypeScript

- **Runtime**: `tsx` for direct execution of TypeScript
- **Configuration**: Inherited from the root [`tsconfig.json`](../tsconfig.json)

## 🎨 generate-icons.ts

Automatic icon generation system for the Electron application.

### Usage

```bash
# Generate icons for macOS and Windows from egg.png
npm run icons

# Use white image for better contrast in the dock
npm run icons:white

# Generate only for macOS
tsx scripts/generate-icons.ts egg-white.png apps/electron/build macos

# Generate in a custom directory
tsx scripts/generate-icons.ts my-icon.png output/icons macos,windows
```

### Requirements

- **macOS**: Requires `sips` and `iconutil` (included with macOS)
- **Multiplatform**: Works with limited tools on other systems

### Generated Formats

- **macOS**:
  - `icon.iconset/` - Complete set of PNGs in different sizes
  - `icon.icns` - Native macOS format
- **Windows**:
  - `icon.ico` - Native Windows format

### Generated sizes

- 16x16, 32x32, 128x128, 256x256, 512x512 (includes @2x versions for Retina)
- Total: 10 PNG files + 1 .icns file + 1 .ico file

## 🌐 translate-docs.ts

Automatic multi-language documentation translation system.

### Features

- **13 supported languages**: ar, zh-cn, es, pt, fr, de, hi, id, ja, ko, fa, ru, tr
- **Content Protection**: Preserves code, YAML, and Markdown structure
- **Automatic Normalization**: Post-translation format corrections
- **Robust Error Handling**: Fallbacks and automatic recovery

### Usage

```bash
# Translate all documentation
npm run translate:docs

# Direct execution with TypeScript
tsx scripts/translate-docs.ts

# Available options
tsx scripts/translate-docs.ts --language=es    # Only Spanish
tsx scripts/translate-docs.ts --file=index.md  # Only one file
tsx scripts/translate-docs.ts --clean          # Clean before translating
tsx scripts/translate-docs.ts --help           # See all options
```

### Technologies

- **Language**: TypeScript
- **Translation Engine**: Google Translate API
- **Content Protection**: Advanced token system
- **Processing**: Node.js with tsx runtime

## 🏗️ setup-env.ts

Initial development environment setup system.

### Usage

```bash
# Runs automatically during postinstall
npm run postinstall

# Manual execution
tsx scripts/setup-env.ts
```

### Features

- **Environment variables**: Automatic configuration from `.env.example`
- **Dependency verification**: Checks for required tools
- **Permission configuration**: Sets correct file permissions

## 📊 version-bump.ts

Automatic versioning management system following Semantic Versioning.

### Usage

```bash
# Increment version automatically
npm run version:bump

# Direct execution with a specific type
tsx scripts/version-bump.ts [patch|minor|major]
```

### Features

- **Semantic Versioning**: Complies with semver standards
- **Multi-package**: Updates versions across the entire monorepo
- **Git integration**: Creates commits and tags automatically

## 📂 Scripts Structure

```
scripts/
├── 🎨 generate-icons.ts         # Icon generation
├── 🌐 translate-docs.ts         # Translation system
├── 🏗️ setup-env.ts              # Environment setup
├── 📊 version-bump.ts           # Version management
├── 📁 translation/              # Translation utilities
├── 📖 README.md                 # This documentation
└── 📋 TRANSLATION_README.md     # Specific translation documentation
```

## 🚀 Tech Stack

- **TypeScript**: Main language with type safety
- **tsx**: Runtime for direct TypeScript execution
- **Node.js**: Version 22+ required
- **Monorepo**: Management with pnpm workspaces

## 📈 NPM Commands

```json
{
  "scripts": {
    "icons": "tsx scripts/generate-icons.ts",
    "icons:white": "tsx scripts/generate-icons.ts egg-white.png",
    "translate:docs": "tsx scripts/translate-docs.ts",
    "version:bump": "tsx scripts/version-bump.ts",
    "postinstall": "tsx scripts/setup-env.ts && npm run build:pkg"
  }
}
```
