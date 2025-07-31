# Changelog

All notable changes to this project will be documented in this file.

## [0.3.5] - 2025-07-30

### Added

#### Core Application UI & Theming

- **New Professional IDE Shell** introduced a completely redesigned, multi-panel user interface that serves as the foundation for all core workflows.
- **Light & Dark Themes** Hatcher now includes meticulously designed light and dark themes to accommodate developer preferences and reduce eye strain.
- **Foundations for Four Core Modes** The new UI establishes the distinct workspaces for Hatcher's primary functions, each with a unique contextual sidebar:
  - Generative Mode: A focused environment for AI-driven code generation, featuring a **"Background Tasks"** panel to monitor configurable quality pipelines (linting, testing, etc.).
  - Visual Mode: The groundwork for our Visual-to-Code bridge, featuring a "Layers" panel inspired by professional design tools to manage the UI hierarchy.
  - Code Mode: A dedicated space for the future AI-powered editor, complete with a familiar file "Explorer".
  - Timeline:
- **Timeline Mode** A complete Git control center designed for "Intelligent Commits" and assisted code reviews, featuring a "Changes" and "History" panel.

### Development Experience

- **Platform Simulation Mode:** Added a new menu for development builds that allows simulating how the application's UI will look and feel on macOS, Windows, and Linux, streamlining cross-platform development.

### Improved

- **Test Coverage Increased:** Project-wide test coverage has been significantly increased to over 79% for Statements and Lines, with a major focus on improving Branch coverage to ensure the reliability of the core application shell.

## [0.3.0] - 2025-07-24

### Added

#### Documentation & Internationalization

- **Multi-language documentation system** supporting 13 languages:
  - Arabic (العربية), Chinese Simplified (简体中文), Spanish (Español)
  - Portuguese (Português), French (Français), German (Deutsch)
  - Hindi (हिन्दी), Indonesian (Bahasa Indonesia), Japanese (日本語)
  - Korean (한국어), Persian (فارسی), Russian (Русский), Turkish (Türkçe)
- **Advanced translation automation** with granular YAML frontmatter protection
- **File-by-file translation strategy** ensuring completeness across all languages
- **Intelligent markdown normalization** with 22+ automatic formatting corrections
- **Localized VitePress navigation** with language-specific UI translations
- **RTL language support** with proper typography for Arabic, Persian, and Hebrew scripts
- **Language-specific font optimization** (Noto Sans family for various scripts)

#### GitHub Community Templates

- **Bug report template** with structured information gathering and environment details
- **Feature request template** for enhancement proposals with solution alternatives
- **Pull request template** with comprehensive checklist and testing guidelines
- **Automated issue labeling** with `bug, needs-triage` and `enhancement, needs-triage` labels

#### Infrastructure & Deployment

- GitHub Pages deployment for VitePress documentation at hatche.rs domain
- Automatic documentation deployment on push to main branch
- Custom domain configuration with CNAME and DNS setup instructions
- SEO optimization with sitemap generation, robots.txt, and clean URLs
- Comprehensive ESLint configuration with TypeScript and Vue support
- GitHub Actions CI workflow for automated linting, building, and format checking
- ESLint integration across all packages with Turbo orchestration
- Automated code quality checks on push and pull requests
- Prettier formatting validation in CI pipeline
- Created `scripts/setup-env.js` to automate `.env` file creation from examples

#### Core Application

- Electron application with native desktop support
- VitePress documentation site with custom theme
- Complete branding system (logos, icons, favicons)
- Monorepo structure with pnpm workspaces
- TypeScript strict mode across all packages
- Build and packaging scripts for multi-platform distribution
- Icon generation automation script

#### Translation Tools & Scripts

- **Professional TypeScript translation system** with integrated auto-cleanup
- **Single-command workflow** (`pnpm translate:docs`) for complete translation pipeline
- **Automatic pre-translation cleanup** eliminates manual intervention
- **Unified token-based protection system** ([#c1#], [#h1#], [#y1#] markers) for code, HTML, and YAML
- **Enhanced error handling** with comprehensive type safety
- **Intelligent chunking** for Google Translate 5000-character limit handling
- **Progress tracking** with real-time statistics and phase reporting
- **Enterprise-grade architecture** with dependency injection and modular services

### Changed

- Project structure converted to monorepo
- Application ID to `com.hatcherdx.engine`
- All email references to `chriss@hatche.rs`
- Domain references to `hatche.rs`
- Package names to `@hatcherdx/*` namespace

#### Professional TypeScript Standardization

- **Complete script migration** from JavaScript to TypeScript across all utility scripts
- **Renamed translation script** from `translate-docs-new.ts` to professional `translate-docs.ts`
- **Updated command behavior** - `translate:docs` now processes all 13 languages by default
- **Test flag implementation** - `--test` flag for quick 3-language validation during development
- **Comprehensive type safety** with interfaces, error boundaries, and typed function signatures
- **Professional error handling** replacing basic console.log with structured error reporting
- **Script cleanup** - removed all obsolete `.js` files and outdated command references

### Improved

#### User Experience

- **Language-preserving navigation** - links maintain current language context
- **Automatic capitalization** for translated titles and headings
- **Typography optimization** with language-specific font families
- **RTL layout support** for Arabic, Persian, and Hebrew
- **Responsive design** across all supported languages
- **Clean URL structure** without language codes in paths
- **Consistent formatting** with automated markdown normalization

### Technical

#### Translation & Localization Engine

- **Granular YAML protection system** using token-based extraction (`[#y1#]`, `[#y2#]` markers)
- **Google Translate integration** via @hatcherdx/puppeteer-google-translate
- **Intelligent fallback system** preserving original content when translation fails
- **Advanced markdown normalization** during content rehidration (22+ correction types)
- **VitePress multi-language configuration** with automatic navigation generation
- **Language-specific UI translations** and typography optimization
- **File-by-file processing strategy** ensuring translation completeness

#### Modern Translation Workflow

- **Simplified workflow** from 3 manual commands to 1 automated command
- **TypeScript-first approach** with complete type safety and professional interfaces
- **Integrated cleanup system** automatically removes old translations before generating new ones
- **Streamlined command interface** eliminates `--force`, `--clean` flags through intelligent automation
- **Professional error handling** with typed error boundaries and graceful degradation
- **Zero-configuration operation** with sensible defaults and automatic language detection

#### Infrastructure & DevOps

- VitePress deployment pipeline with custom domain support (hatche.rs)
- Automated sitemap generation and SEO optimization for documentation
- GitHub Pages integration with artifact deployment and caching
- Clean URL structure without base path for custom domain setup
- ESLint flat config with support for TypeScript, Vue, and Node.js environments
- Automated CI/CD pipeline with GitHub Actions for code quality enforcement
- Turbo-powered monorepo with coordinated linting across all packages
- Zero-tolerance policy for linting errors in CI (builds fail on lint errors)

#### Architecture

- 7 packages: electron, web, docs, preload, vite-plugin, puppeteer
- Vue 3 Composition API with TypeScript
- Electron Builder for app packaging
- Custom VitePress theme with responsive logos
- Automated icon generation from source assets

#### Available Commands

- `pnpm translate:docs` - Complete translation pipeline for all 13 languages (clean + translate)
- `pnpm translate:docs --test` - Quick translation test with 3 languages (es, fr, de)
- `pnpm clean:cache` - Clear build and module cache
- `pnpm clean:lib` - Remove all node_modules for fresh install
- `pnpm icons` - Generate application icons from source assets
- `pnpm build` - Build all packages in correct dependency order
- `pnpm dev` - Start development environment with hot reload

## [0.2.0] - 2025-07-23

### Added

- Basic repository structure
- Core documentation files
- Initial project configuration

## [0.1.0] - 2025-07-22

### Added

- Initial repository creation
- README and basic project files
