export default {
  fileProcessing: {
    sourceDir: './docs',
    targetDir: './docs',
    overwriteExisting: false,
    patterns: ['**/*.md'],
  },
  targetLanguages: ['es', 'fr'],
  strategy: 'file-by-file',
  frameworks: {
    vitepress: true,
  },
}
