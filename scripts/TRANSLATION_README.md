# 🌍 Multi-Language Documentation System

This system provides automated translation for VitePress documentation using Google Translate via Puppeteer.

## Supported Languages

The documentation is automatically translated into the following languages (ordered A-Z):

- 🇸🇦 **Arabic** (`ar`) - العربية
- 🇨🇳 **Chinese Simplified** (`zh-cn`) - 简体中文
- 🇬🇧 **English** (`en`) - English _(source)_
- 🇫🇷 **French** (`fr`) - Français
- 🇩🇪 **German** (`de`) - Deutsch
- 🇮🇳 **Hindi** (`hi`) - हिन्दी
- 🇮🇩 **Indonesian** (`id`) - Bahasa Indonesia
- 🇯🇵 **Japanese** (`ja`) - 日本語
- 🇰🇷 **Korean** (`ko`) - 한국어
- 🇮🇷 **Persian** (`fa`) - فارسی
- 🇵🇹 **Portuguese** (`pt`) - Português
- 🇷🇺 **Russian** (`ru`) - Русский
- 🇪🇸 **Spanish** (`es`) - Español
- 🇹🇷 **Turkish** (`tr`) - Türkçe

## Usage

### Translate All Documentation

From the project root:

```bash
pnpm translate:docs
```

From the docs directory:

```bash
cd apps/docs
pnpm translate
```

### Manual Translation

```bash
node scripts/translate-docs.mjs
```

## How It Works

1. **Source Detection**: Scans all `.md` files in the docs directory
2. **Smart Parsing**: Identifies translatable content vs. code blocks, frontmatter, etc.
3. **Translation**: Uses Google Translate API via Puppeteer for accurate translations
4. **Rate Limiting**: Implements 2-second delays between requests to avoid API limits
5. **Incremental Updates**: Only translates files that have changed since last run
6. **VitePress Integration**: Automatically updates VitePress config with language settings

## Features

- ✅ **Automatic Language Detection**: VitePress will detect browser language and redirect accordingly
- ✅ **Fallback to English**: If language not supported, defaults to English
- ✅ **Smart Content Parsing**: Preserves code blocks, frontmatter, and special markdown syntax
- ✅ **Incremental Updates**: Only retranslates modified files
- ✅ **Rate Limiting**: Built-in delays to respect API limits
- ✅ **Error Handling**: Graceful fallbacks if translation fails
- ✅ **RTL Support**: Proper right-to-left support for Arabic and Persian

## File Structure

After running translation, your docs will be organized as:

```
apps/docs/
├── index.md                 # English (source)
├── getting-started.md       # English (source)
├── ar/                      # Arabic
│   ├── index.md
│   └── getting-started.md
├── zh-cn/                   # Chinese Simplified
│   ├── index.md
│   └── getting-started.md
├── es/                      # Spanish
│   ├── index.md
│   └── getting-started.md
└── ...                      # Other languages
```

## Configuration

The translation system automatically updates `.vitepress/config.mts` with:

- Language configuration for all supported languages
- Proper language codes and native names
- RTL support for Arabic and Persian
- Automatic language detection based on browser settings

## Best Practices

1. **Write in English First**: Always create content in English as the source language
2. **Run After Major Changes**: Execute translation after significant documentation updates
3. **Review Translations**: While automated, consider reviewing critical pages manually
4. **Code Preservation**: The system preserves code blocks, but double-check technical content

## Troubleshooting

### Rate Limiting

If you encounter rate limiting:

- The script includes 2-second delays by default
- For heavy usage, consider increasing `DELAY_BETWEEN_REQUESTS` in the script

### Translation Quality

- The system uses Google Translate, which is generally accurate for documentation
- Technical terms may need manual review
- Code examples and API references are preserved as-is

### File Updates

- The system only retranslates files that have been modified
- To force complete retranslation, delete the target language directories

## Technical Details

- **Translation Engine**: Google Translate via `@hatcherdx/puppeteer-google-translate`
- **Content Parsing**: Smart markdown parsing that preserves code and metadata
- **Rate Limiting**: Configurable delays between API calls
- **Error Handling**: Graceful fallbacks and detailed logging
- **VitePress Integration**: Automatic configuration updates

## Contributing

When adding new documentation:

1. Write the content in English first
2. Run `pnpm translate:docs` to generate translations
3. Commit both English and translated files
4. The system will handle language routing automatically

For translation improvements or new language support, see the main project contributing guidelines.
