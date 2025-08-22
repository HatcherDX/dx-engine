<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="webgl-diff-viewer">
    <div class="diff-header">
      <div class="diff-info">
        <h4 class="diff-title">{{ currentFile || 'Select a file' }}</h4>
        <div v-if="diffStats" class="diff-stats">
          <span class="additions">+{{ diffStats.additions }}</span>
          <span class="deletions">-{{ diffStats.deletions }}</span>
        </div>
      </div>
    </div>

    <div class="diff-viewport">
      <!-- Diff content area -->
      <div class="diff-content-area">
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-spinner" />
          <span class="loading-text">Loading diff...</span>
        </div>

        <div v-else-if="diffData" class="diff-content" @wheel="handleWheel">
          <div class="diff-container">
            <!-- Old version (left side) -->
            <div class="diff-side-content old-content">
              <template
                v-for="(item, index) in processedOldSide"
                :key="`old-${index}`"
              >
                <!-- Expandable section header -->
                <div
                  v-if="item.type === 'expandable'"
                  class="diff-expandable-section old-side"
                >
                  <span class="expand-icon old-expand">◀</span>
                  <span class="expand-text old-range">
                    -{{ item.startLine }},{{ item.lineCount }}
                  </span>
                  <span class="expand-hint">{{
                    getExpandHintText(item.hunkIndex)
                  }}</span>
                  <div class="expand-controls">
                    <button
                      v-if="
                        item.hunkIndex !== undefined &&
                        canExpandUp(item.hunkIndex)
                      "
                      class="expand-btn expand-up"
                      :disabled="
                        item.hunkIndex === undefined ||
                        !hasLinesUp(item.hunkIndex)
                      "
                      @click.stop="
                        handleUpButtonClick(
                          item.hunkIndex,
                          item.startLine,
                          item.endLine,
                          $event
                        )
                      "
                    >
                      ↑
                    </button>
                    <button
                      v-if="
                        item.hunkIndex !== undefined &&
                        canExpandDown(item.hunkIndex)
                      "
                      class="expand-btn expand-down"
                      :disabled="
                        item.hunkIndex === undefined ||
                        !hasLinesDown(item.hunkIndex)
                      "
                      @click.stop="
                        handleDownButtonClick(
                          item.hunkIndex,
                          item.startLine,
                          item.endLine,
                          $event
                        )
                      "
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <!-- Regular diff line -->
                <div
                  v-else
                  class="diff-line"
                  :class="[
                    item.lineType,
                    {
                      'diff-line-hovered': isLineHighlighted(
                        item.hunkIndex,
                        item.lineNumber ?? null,
                        'old'
                      ),
                    },
                  ]"
                  @mouseenter="
                    handleLineHover(
                      'old',
                      item.hunkIndex,
                      item.lineNumber ?? null,
                      true
                    )
                  "
                  @mouseleave="
                    handleLineHover(
                      'old',
                      item.hunkIndex,
                      item.lineNumber ?? null,
                      false
                    )
                  "
                >
                  <span class="line-number">{{ item.lineNumber }}</span>
                  <span
                    class="line-content"
                    v-html="
                      getHighlightedContent(
                        alignedDiffRows.findIndex((row) => row.old === item),
                        'old',
                        item.content || ''
                      )
                    "
                  ></span>
                </div>
              </template>
            </div>

            <!-- Divider -->
            <div class="diff-content-divider" />

            <!-- New version (right side) -->
            <div class="diff-side-content new-content">
              <template
                v-for="(item, index) in processedNewSide"
                :key="`new-${index}`"
              >
                <!-- Expandable section header -->
                <div
                  v-if="item.type === 'expandable'"
                  class="diff-expandable-section new-side"
                >
                  <span class="expand-icon new-expand">▶</span>
                  <span class="expand-text new-range">
                    +{{ item.startLine }},{{ item.lineCount }}
                  </span>
                  <span class="expand-hint">{{
                    getExpandHintText(item.hunkIndex)
                  }}</span>
                  <div class="expand-controls">
                    <button
                      v-if="
                        item.hunkIndex !== undefined &&
                        canExpandUp(item.hunkIndex)
                      "
                      class="expand-btn expand-up"
                      :disabled="
                        item.hunkIndex === undefined ||
                        !hasLinesUp(item.hunkIndex)
                      "
                      @click.stop="
                        handleUpButtonClick(
                          item.hunkIndex,
                          item.startLine,
                          item.endLine,
                          $event
                        )
                      "
                    >
                      ↑
                    </button>
                    <button
                      v-if="
                        item.hunkIndex !== undefined &&
                        canExpandDown(item.hunkIndex)
                      "
                      class="expand-btn expand-down"
                      :disabled="
                        item.hunkIndex === undefined ||
                        !hasLinesDown(item.hunkIndex)
                      "
                      @click.stop="
                        handleDownButtonClick(
                          item.hunkIndex,
                          item.startLine,
                          item.endLine,
                          $event
                        )
                      "
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <!-- Regular diff line -->
                <div
                  v-else
                  class="diff-line"
                  :class="[
                    item.lineType,
                    {
                      'diff-line-hovered': isLineHighlighted(
                        item.hunkIndex,
                        item.lineNumber ?? null,
                        'new'
                      ),
                    },
                  ]"
                  @mouseenter="
                    handleLineHover(
                      'new',
                      item.hunkIndex,
                      item.lineNumber ?? null,
                      true
                    )
                  "
                  @mouseleave="
                    handleLineHover(
                      'new',
                      item.hunkIndex,
                      item.lineNumber ?? null,
                      false
                    )
                  "
                >
                  <span class="line-number">{{ item.lineNumber }}</span>
                  <span
                    class="line-content"
                    v-html="
                      getHighlightedContent(
                        alignedDiffRows.findIndex((row) => row.new === item),
                        'new',
                        item.content || ''
                      )
                    "
                  ></span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="no-diff-message">
          <p>Select a file to view diff</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import type { GitCommitData, GitDiffData } from '@hatcherdx/shared-rendering'
import { useProjectContext } from '../../composables/useProjectContext'
import { useGitIntegration } from '../../composables/useGitIntegration'
// Use Prism.js for CSP-friendly syntax highlighting with inline styles
import { createPrismDiffHighlighter } from '../../utils/prismHighlighter'

// Partial expansion state for expandable sections
interface PartialExpansionState {
  expandedFromTop: number
  expandedFromBottom: number
  totalLines: number
  sectionStart: number
  sectionEnd: number
}

/**
 * Properties for WebGL diff viewer component.
 *
 * @public
 */
interface Props {
  /** Current file path being viewed */
  currentFile?: string
  /** Array of commit data for navigation */
  commits?: GitCommitData[]
  /** Current commit index */
  currentCommitIndex?: number
  /** Diff data for current file */
  diffData?: GitDiffData | null
  /** Whether diff is loading */
  isLoading?: boolean
  /** Old version label */
  oldVersion?: string
  /** New version label */
  newVersion?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentFile: '',
  commits: () => [],
  currentCommitIndex: 0,
  diffData: null,
  isLoading: false,
  oldVersion: 'Previous',
  newVersion: 'Current',
})

// Interface for processed diff items (lines + expandable sections)
interface DiffItemDisplay {
  type: 'line' | 'expandable'
  // For line items
  content?: string
  highlightedContent?: string // Syntax highlighted HTML content
  lineType?: 'context' | 'added' | 'removed' | 'empty'
  lineNumber?: number | null
  hunkIndex?: number // For line correspondence tracking
  lineIndex?: number // Line index within the hunk for synchronized hover
  // For expandable items
  startLine?: number
  endLine?: number
  lineCount?: number
}

// Interface for expanded context lines
interface ExpandedContextLine {
  content: string
  lineNumber: number
  type: 'context'
}

interface ExpandedContextLinePair {
  old?: ExpandedContextLine
  new?: ExpandedContextLine
}

// Project context and Git integration
const { projectRoot } = useProjectContext()
const { getFileContent } = useGitIntegration()

// State for tracking expanded sections - PER FILE to avoid cross-file contamination
const expandedSections = ref<Set<string>>(new Set())

// State for expanded context content - PER FILE with file-specific keys
const expandedContext = ref<Map<string, ExpandedContextLine[]>>(new Map())

// Removed simpleExpansionState - using partiallyExpanded instead

// Force reactivity trigger
const expansionTrigger = ref(0)

// State for tracking partially expanded sections (bidirectional expansion from ends)
const partiallyExpanded = ref<Map<string, PartialExpansionState>>(new Map())

// State for synchronized hover effects
const hoveredLineId = ref<string | null>(null)

// State for syntax highlighting
const diffHighlighter = ref<ReturnType<
  typeof createPrismDiffHighlighter
> | null>(null)
const highlightCache = ref<Map<string, string>>(new Map())
const highlightedRows = ref<Map<number, { old?: string; new?: string }>>(
  new Map()
)

/**
 * Initializes the syntax highlighter for the current file.
 *
 * @private
 */
const initializeSyntaxHighlighter = async (): Promise<void> => {
  if (!props.currentFile) {
    console.log(
      '[WebGL Diff Viewer] No current file, skipping highlighter initialization'
    )
    return
  }

  try {
    console.log(
      '[WebGL Diff Viewer] Initializing syntax highlighter for:',
      props.currentFile
    )

    // Use Prism.js for highlighting
    const newHighlighter = createPrismDiffHighlighter(props.currentFile)
    const detectedLang = newHighlighter.getLanguage()

    console.log(
      `[WebGL Diff Viewer] Detected language: ${detectedLang} for file: ${props.currentFile}`
    )

    // Test the highlighter with a simple example
    const testResult = newHighlighter.highlightLine('const test = "hello";')
    console.log('[WebGL Diff Viewer] Test highlight result:', testResult)
    console.log(
      '[WebGL Diff Viewer] Test has inline styles:',
      testResult.includes('style=')
    )

    // Only set the highlighter if it's working properly
    diffHighlighter.value = newHighlighter

    // Clear cache when file changes
    highlightCache.value.clear()
    console.log(
      '[WebGL Diff Viewer] ✅ Syntax highlighter initialized successfully'
    )
  } catch (error) {
    console.warn(
      '[WebGL Diff Viewer] Failed to initialize syntax highlighter:',
      error
    )
    diffHighlighter.value = null
  }
}

/**
 * Highlights code content with syntax highlighting.
 * Uses caching to avoid re-highlighting the same content.
 *
 * @param content - Code content to highlight
 * @returns Highlighted HTML or original content
 * @private
 */
const highlightContent = (content: string): string => {
  if (!content.trim() || !diffHighlighter.value) {
    return escapeHtml(content)
  }

  const cacheKey = content
  if (highlightCache.value.has(cacheKey)) {
    return highlightCache.value.get(cacheKey)!
  }

  try {
    const highlighted = diffHighlighter.value.highlightLine(content)
    if (highlighted && highlighted.includes('style=')) {
      console.log(
        '[WebGL Diff Viewer] ✅ Content highlighted with inline styles for:',
        content.substring(0, 30)
      )
      highlightCache.value.set(cacheKey, highlighted)
      return highlighted
    } else {
      console.log(
        '[WebGL Diff Viewer] ⚠️ No highlighting applied for:',
        content.substring(0, 30)
      )
      const escaped = escapeHtml(content)
      highlightCache.value.set(cacheKey, escaped)
      return escaped
    }
  } catch (error) {
    console.warn('[WebGL Diff Viewer] Failed to highlight content:', error)
    return escapeHtml(content)
  }
}

/**
 * Escapes HTML special characters for safe display.
 *
 * @param text - Text to escape
 * @returns HTML-escaped text
 * @private
 */
const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Highlights all visible diff rows.
 * Updates the highlightedRows ref with highlighted content.
 *
 * @private
 */
const highlightVisibleRows = async () => {
  if (!diffHighlighter.value) {
    console.log(
      '[WebGL Diff Viewer] No highlighter available, skipping highlighting'
    )
    return
  }

  // Guard check for alignedDiffRows initialization
  if (!alignedDiffRows.value || alignedDiffRows.value.length === 0) {
    console.log(
      '[WebGL Diff Viewer] No aligned diff rows available, skipping highlighting'
    )
    return
  }

  const rows = alignedDiffRows.value
  console.log(
    `[WebGL Diff Viewer] Starting to highlight ${rows.length} rows...`
  )

  const newHighlightedRows = new Map<number, { old?: string; new?: string }>()
  let highlightedCount = 0

  // Process rows in batches to avoid blocking the UI
  const batchSize = 50
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)

    for (const row of batch) {
      if (row.type === 'line') {
        const highlighted: { old?: string; new?: string } = {}

        if (row.old?.content && row.old.content.trim()) {
          const originalContent = row.old.content
          highlighted.old = highlightContent(originalContent)
          if (
            highlighted.old !== originalContent &&
            highlighted.old.includes('style=')
          ) {
            highlightedCount++
            console.log(
              `[WebGL Diff Viewer] ✅ Old side highlighted for row ${row.rowIndex}:`,
              originalContent.substring(0, 30)
            )
          }
        }

        if (row.new?.content && row.new.content.trim()) {
          const originalContent = row.new.content
          highlighted.new = highlightContent(originalContent)
          if (
            highlighted.new !== originalContent &&
            highlighted.new.includes('style=')
          ) {
            highlightedCount++
            console.log(
              `[WebGL Diff Viewer] ✅ New side highlighted for row ${row.rowIndex}:`,
              originalContent.substring(0, 30)
            )
          }
        }

        if (highlighted.old || highlighted.new) {
          newHighlightedRows.set(row.rowIndex, highlighted)
        }
      }
    }

    // Allow the UI to update between batches
    if (i + batchSize < rows.length) {
      await nextTick()
    }
  }

  highlightedRows.value = newHighlightedRows
  console.log(
    `[WebGL Diff Viewer] ✅ Completed highlighting: ${highlightedCount} highlighted lines out of ${rows.length} total rows`
  )

  // Force a reactivity update
  await nextTick()
}

/**
 * Gets highlighted content for a specific row and side.
 * Falls back to original content if highlighting is not available.
 *
 * @param rowIndex - Index of the row
 * @param side - Side of the diff ('old' or 'new')
 * @param originalContent - Original content to fall back to
 * @returns Highlighted content or original content
 * @private
 */
const getHighlightedContent = (
  rowIndex: number,
  side: 'old' | 'new',
  originalContent: string
): string => {
  const highlighted = highlightedRows.value.get(rowIndex)
  const highlightedContent = highlighted?.[side]

  if (highlightedContent && highlightedContent.includes('style=')) {
    console.log(
      `[WebGL Diff Viewer] ✅ Serving highlighted ${side} content for row ${rowIndex}`
    )
    return highlightedContent
  }

  // Fallback: try to highlight on-demand if not in cache
  if (originalContent && originalContent.trim()) {
    const onDemandHighlight = highlightContent(originalContent)
    if (onDemandHighlight.includes('style=')) {
      console.log(
        `[WebGL Diff Viewer] ✅ On-demand highlight for ${side} row ${rowIndex}`
      )
      return onDemandHighlight
    }
  }

  // Final fallback: escape original content for safety
  return escapeHtml(originalContent)
}

// Initialize syntax highlighter when file changes
watch(
  () => props.currentFile,
  async (newFile) => {
    if (newFile) {
      await initializeSyntaxHighlighter()
      // Re-highlight after initializing the highlighter
      if (props.diffData && diffHighlighter.value) {
        await highlightVisibleRows()
      }
    }
  },
  { immediate: false }
)

// Highlight rows when diff data or highlighter changes
watch(
  [() => props.diffData, diffHighlighter, expansionTrigger],
  async () => {
    console.log(
      '[WebGL Diff Viewer] Diff data or highlighter changed, re-highlighting...'
    )
    if (props.diffData && diffHighlighter.value) {
      await highlightVisibleRows()
    } else {
      console.log(
        '[WebGL Diff Viewer] Skipping highlighting - missing diffData or highlighter'
      )
    }
  },
  { immediate: false }
)

// Clear expansion state when file changes to prevent cross-file contamination
watch(
  () => props.currentFile,
  (newFile, oldFile) => {
    if (newFile !== oldFile) {
      // Clear all expansion state for the old file to prevent leakage
      if (oldFile) {
        const oldFileKey = oldFile.replace(/[^a-zA-Z0-9]/g, '_')
        // Remove all keys related to the old file
        const keysToRemove = Array.from(expandedSections.value).filter((key) =>
          key.startsWith(oldFileKey)
        )
        keysToRemove.forEach((key) => {
          expandedSections.value.delete(key)
          expandedContext.value.delete(key)
        })

        // Clear partial expansion tracking for old file
        const partialKeysToRemove = Array.from(
          partiallyExpanded.value.keys()
        ).filter((key) => key.startsWith(oldFileKey))
        partialKeysToRemove.forEach((key) => {
          partiallyExpanded.value.delete(key)
        })
      }
    }
  },
  { immediate: false }
)

// Line correspondence mapping for GitHub Desktop-style highlighting
// Future enhancement: Could use this for advanced correspondence highlighting
// const lineCorrespondenceMap = computed(() => { ... })

const diffStats = computed(() => {
  if (!props.diffData) return null

  let additions = 0
  let deletions = 0

  props.diffData.hunks.forEach((hunk) => {
    hunk.lines.forEach((line) => {
      if (line.type === 'added') additions++
      if (line.type === 'removed') deletions++
    })
  })

  return { additions, deletions }
})

// Legacy side-by-side format (kept for reference, replaced by processedOldSide/processedNewSide)
// const oldSideLines = computed((): DiffLineDisplay[] => { ... })
// const newSideLines = computed((): DiffLineDisplay[] => { ... })
// These have been replaced with processedOldSide and processedNewSide for expandable diff support

// Aligned row structure for proper split view
interface AlignedDiffRow {
  type: 'line' | 'expandable'
  old?: DiffItemDisplay
  new?: DiffItemDisplay
  rowIndex: number
  hunkIndex?: number
}

// Create aligned rows for split view - inspired by react-diff-view's approach
const alignedDiffRows = computed((): AlignedDiffRow[] => {
  if (!props.diffData) return []
  // Force reactivity dependency on expansionTrigger
  void expansionTrigger.value

  const rows: AlignedDiffRow[] = []
  const hunks = props.diffData.hunks

  for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
    const hunk = hunks[hunkIndex]
    let rowIndex = 0

    // Handle expandable sections with file-specific keys to avoid cross-file issues
    const fileKey =
      props.currentFile?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'
    const oldSectionKey = `${fileKey}-${hunkIndex}-old`
    const newSectionKey = `${fileKey}-${hunkIndex}-new`
    const partialKey = `${fileKey}-${hunkIndex}`
    const partialExpansion = partiallyExpanded.value.get(partialKey)

    // Handle expandable section at the beginning of the file (lines before first hunk)
    if (hunkIndex === 0) {
      const oldStartsAfterLine1 = hunk.oldStart > 1
      const newStartsAfterLine1 = hunk.newStart > 1

      if (oldStartsAfterLine1 || newStartsAfterLine1) {
        const sectionStart = 1
        const sectionEnd = Math.max(hunk.oldStart - 1, hunk.newStart - 1)
        const totalHiddenLines = sectionEnd - sectionStart + 1

        // Initialize or get expansion state
        if (!partialExpansion && totalHiddenLines > 0) {
          partiallyExpanded.value.set(partialKey, {
            expandedFromTop: 0,
            expandedFromBottom: 0,
            totalLines: totalHiddenLines,
            sectionStart,
            sectionEnd,
          })
        }

        const expansion = partiallyExpanded.value.get(partialKey)
        const totalExpanded = expansion
          ? expansion.expandedFromTop + expansion.expandedFromBottom
          : 0
        const remainingLines = totalHiddenLines - totalExpanded

        // Add expanded lines from TOP first (↑ button expansions)
        const oldContextLines = expandedContext.value.get(oldSectionKey) || []
        const newContextLines = expandedContext.value.get(newSectionKey) || []

        // Separate lines expanded from top vs bottom based on line numbers
        const topExpandedLines: ExpandedContextLinePair[] = []
        const bottomExpandedLines: ExpandedContextLinePair[] = []

        if (expansion) {
          const topBoundary = expansion.sectionStart + expansion.expandedFromTop
          const bottomBoundary =
            expansion.sectionEnd - expansion.expandedFromBottom

          // Split context lines based on their position relative to the original section boundaries
          oldContextLines.forEach((line) => {
            if (
              line.lineNumber >= expansion.sectionStart &&
              line.lineNumber < topBoundary
            ) {
              topExpandedLines.push({
                old: line,
                new: newContextLines.find(
                  (n) => n.lineNumber === line.lineNumber
                ),
              })
            } else if (
              line.lineNumber > bottomBoundary &&
              line.lineNumber <= expansion.sectionEnd
            ) {
              bottomExpandedLines.push({
                old: line,
                new: newContextLines.find(
                  (n) => n.lineNumber === line.lineNumber
                ),
              })
            }
          })
        }

        // Show lines expanded from TOP (↑)
        topExpandedLines.forEach(({ old: oldContext, new: newContext }) => {
          rows.push({
            type: 'line',
            old: oldContext
              ? {
                  type: 'line',
                  content: oldContext.content,
                  lineType: 'context',
                  lineNumber: oldContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            new: newContext
              ? {
                  type: 'line',
                  content: newContext.content,
                  lineType: 'context',
                  lineNumber: newContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            rowIndex: rows.length,
            hunkIndex,
          })
          rowIndex++
        })

        // Show expandable section if there are remaining unexpanded lines (AFTER top expanded lines)
        if (totalHiddenLines > 0 && remainingLines > 0) {
          rows.push({
            type: 'expandable',
            old: oldStartsAfterLine1
              ? {
                  type: 'expandable',
                  startLine: sectionStart,
                  endLine: sectionEnd,
                  lineCount: remainingLines,
                }
              : undefined,
            new: newStartsAfterLine1
              ? {
                  type: 'expandable',
                  startLine: sectionStart,
                  endLine: sectionEnd,
                  lineCount: remainingLines,
                }
              : undefined,
            rowIndex: rows.length,
            hunkIndex,
          })
        }

        // Show lines expanded from BOTTOM (↑ button - UPWARD expansion)
        bottomExpandedLines.forEach(({ old: oldContext, new: newContext }) => {
          rows.push({
            type: 'line',
            old: oldContext
              ? {
                  type: 'line',
                  content: oldContext.content,
                  lineType: 'context',
                  lineNumber: oldContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            new: newContext
              ? {
                  type: 'line',
                  content: newContext.content,
                  lineType: 'context',
                  lineNumber: newContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            rowIndex: rows.length,
            hunkIndex,
          })
          rowIndex++
        })
      }
    }

    // Handle expandable sections between hunks
    if (hunkIndex > 0) {
      const prevHunk = hunks[hunkIndex - 1]
      const oldGap = hunk.oldStart - (prevHunk.oldStart + prevHunk.oldCount)
      const newGap = hunk.newStart - (prevHunk.newStart + prevHunk.newCount)

      if (oldGap > 3 || newGap > 3) {
        const sectionStart = prevHunk.oldStart + prevHunk.oldCount
        const sectionEnd = hunk.oldStart - 1
        const totalGapLines = sectionEnd - sectionStart + 1

        // Initialize or get expansion state
        if (!partialExpansion && totalGapLines > 0) {
          partiallyExpanded.value.set(partialKey, {
            expandedFromTop: 0,
            expandedFromBottom: 0,
            totalLines: totalGapLines,
            sectionStart,
            sectionEnd,
          })
        }

        const expansion = partiallyExpanded.value.get(partialKey)
        const totalExpanded = expansion
          ? expansion.expandedFromTop + expansion.expandedFromBottom
          : 0
        const remainingGap = totalGapLines - totalExpanded

        // Add expanded lines from TOP first (↑ button expansions) for between-hunk sections
        const oldContextLines = expandedContext.value.get(oldSectionKey) || []
        const newContextLines = expandedContext.value.get(newSectionKey) || []

        const topExpandedLines: ExpandedContextLinePair[] = []
        const bottomExpandedLines: ExpandedContextLinePair[] = []

        if (expansion) {
          const topBoundary = expansion.sectionStart + expansion.expandedFromTop
          const bottomBoundary =
            expansion.sectionEnd - expansion.expandedFromBottom

          // Split context lines based on their position relative to the original section boundaries
          oldContextLines.forEach((line) => {
            if (
              line.lineNumber >= expansion.sectionStart &&
              line.lineNumber < topBoundary
            ) {
              topExpandedLines.push({
                old: line,
                new: newContextLines.find(
                  (n) => n.lineNumber === line.lineNumber
                ),
              })
            } else if (
              line.lineNumber > bottomBoundary &&
              line.lineNumber <= expansion.sectionEnd
            ) {
              bottomExpandedLines.push({
                old: line,
                new: newContextLines.find(
                  (n) => n.lineNumber === line.lineNumber
                ),
              })
            }
          })
        }

        // Show lines expanded from TOP (↑)
        topExpandedLines.forEach(({ old: oldContext, new: newContext }) => {
          rows.push({
            type: 'line',
            old: oldContext
              ? {
                  type: 'line',
                  content: oldContext.content,
                  lineType: 'context',
                  lineNumber: oldContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            new: newContext
              ? {
                  type: 'line',
                  content: newContext.content,
                  lineType: 'context',
                  lineNumber: newContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            rowIndex: rows.length,
            hunkIndex,
          })
          rowIndex++
        })

        // Show expandable section if there are remaining unexpanded lines (AFTER top expanded lines)
        if (totalGapLines > 0 && remainingGap > 0) {
          rows.push({
            type: 'expandable',
            old: {
              type: 'expandable',
              startLine: sectionStart,
              endLine: sectionEnd,
              lineCount: remainingGap,
            },
            new: {
              type: 'expandable',
              startLine: prevHunk.newStart + prevHunk.newCount,
              endLine: hunk.newStart - 1,
              lineCount: remainingGap,
            },
            rowIndex: rows.length,
            hunkIndex,
          })
        }

        // Show lines expanded from BOTTOM (↑ button - UPWARD expansion for between-hunks)
        bottomExpandedLines.forEach(({ old: oldContext, new: newContext }) => {
          rows.push({
            type: 'line',
            old: oldContext
              ? {
                  type: 'line',
                  content: oldContext.content,
                  lineType: 'context',
                  lineNumber: oldContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            new: newContext
              ? {
                  type: 'line',
                  content: newContext.content,
                  lineType: 'context',
                  lineNumber: newContext.lineNumber,
                  lineIndex: rowIndex,
                }
              : undefined,
            rowIndex: rows.length,
            hunkIndex,
          })
          rowIndex++
        })
      }
    }

    // Expanded context is now handled above in the correct order

    // Process hunk lines with proper alignment using nearbySequences 'zip' pattern
    const groupedSequences = groupNearbyChanges(hunk.lines)

    groupedSequences.forEach((group) => {
      if (group.type === 'context') {
        const line = hunk.lines[group.lineIndex!]
        rows.push({
          type: 'line',
          old: {
            type: 'line',
            content: line.content,
            lineType: 'context',
            lineNumber: line.oldLineNumber || null,
            lineIndex: rowIndex,
          },
          new: {
            type: 'line',
            content: line.content,
            lineType: 'context',
            lineNumber: line.newLineNumber || null,
            lineIndex: rowIndex,
          },
          rowIndex: rows.length,
          hunkIndex,
        })
        rowIndex++
      } else if (group.type === 'paired-change') {
        // Align paired changes in same rows (zip pattern)
        const removedLines = group.removedIndices!.map((idx) => hunk.lines[idx])
        const addedLines = group.addedIndices!.map((idx) => hunk.lines[idx])
        const maxPairs = Math.max(removedLines.length, addedLines.length)

        for (let i = 0; i < maxPairs; i++) {
          const removedLine = removedLines[i]
          const addedLine = addedLines[i]

          rows.push({
            type: 'line',
            old: removedLine
              ? {
                  type: 'line',
                  content: removedLine.content,
                  lineType: 'removed',
                  lineNumber: removedLine.oldLineNumber || null,
                  lineIndex: rowIndex,
                }
              : {
                  type: 'line',
                  content: '',
                  lineType: 'empty',
                  lineNumber: null,
                  lineIndex: rowIndex,
                },
            new: addedLine
              ? {
                  type: 'line',
                  content: addedLine.content,
                  lineType: 'added',
                  lineNumber: addedLine.newLineNumber || null,
                  lineIndex: rowIndex,
                }
              : {
                  type: 'line',
                  content: '',
                  lineType: 'empty',
                  lineNumber: null,
                  lineIndex: rowIndex,
                },
            rowIndex: rows.length,
            hunkIndex,
          })
          rowIndex++
        }
      } else if (group.type === 'single-change') {
        const line = hunk.lines[group.lineIndex!]

        rows.push({
          type: 'line',
          old:
            group.changeType === 'removed'
              ? {
                  type: 'line',
                  content: line.content,
                  lineType: 'removed',
                  lineNumber: line.oldLineNumber || null,
                  lineIndex: rowIndex,
                }
              : {
                  type: 'line',
                  content: '',
                  lineType: 'empty',
                  lineNumber: null,
                  lineIndex: rowIndex,
                },
          new:
            group.changeType === 'added'
              ? {
                  type: 'line',
                  content: line.content,
                  lineType: 'added',
                  lineNumber: line.newLineNumber || null,
                  lineIndex: rowIndex,
                }
              : {
                  type: 'line',
                  content: '',
                  lineType: 'empty',
                  lineNumber: null,
                  lineIndex: rowIndex,
                },
          rowIndex: rows.length,
          hunkIndex,
        })
        rowIndex++
      }
    })
  }

  return rows
})

// Extract old side from aligned rows for backward compatibility
const processedOldSide = computed((): DiffItemDisplay[] => {
  return alignedDiffRows.value
    .map((row) => {
      if (row.old) {
        return { ...row.old, hunkIndex: row.hunkIndex }
      }
      return null
    })
    .filter(Boolean) as DiffItemDisplay[]
})

// Extract new side from aligned rows for backward compatibility
const processedNewSide = computed((): DiffItemDisplay[] => {
  return alignedDiffRows.value
    .map((row) => {
      if (row.new) {
        return { ...row.new, hunkIndex: row.hunkIndex }
      }
      return null
    })
    .filter(Boolean) as DiffItemDisplay[]
})

// Create correspondence mapping based on aligned rows for proper visual correspondence
const lineCorrespondenceMap = computed(() => {
  if (!props.diffData) return new Map()

  // Guard check for alignedDiffRows initialization
  if (!alignedDiffRows.value || alignedDiffRows.value.length === 0) {
    return new Map()
  }

  const map = new Map<string, string[]>()

  alignedDiffRows.value.forEach((row) => {
    if (row.type === 'line') {
      const correspondingKeys: string[] = []

      // Create keys for lines that exist in this aligned row
      if (row.old && row.old.lineNumber !== null) {
        const oldKey = `old-${row.hunkIndex}-${row.old.lineIndex}`
        correspondingKeys.push(oldKey)
      }

      if (row.new && row.new.lineNumber !== null) {
        const newKey = `new-${row.hunkIndex}-${row.new.lineIndex}`
        correspondingKeys.push(newKey)
      }

      // Only create correspondence if there are actual lines (not empty placeholders)
      if (correspondingKeys.length > 0) {
        // For context lines and paired changes, both sides should correspond
        if (
          row.old?.lineType === 'context' ||
          (row.old?.lineType === 'removed' && row.new?.lineType === 'added') ||
          (row.old?.lineType === 'added' && row.new?.lineType === 'removed')
        ) {
          // Both lines in this row correspond to each other
          correspondingKeys.forEach((key) => {
            map.set(key, correspondingKeys)
          })
        } else {
          // Single changes (isolated added/removed) only correspond to themselves
          correspondingKeys.forEach((key) => {
            map.set(key, [key])
          })
        }
      }
    }
  })

  return map
})

/**
 * Groups nearby changes using the "zip" pattern from react-diff-view.
 * Adjacent removals and additions are paired together as corresponding changes.
 *
 * @param lines - Array of diff lines in a hunk
 * @returns Array of grouped change sequences
 * @private
 */
const groupNearbyChanges = (
  lines: Array<{ type: 'context' | 'added' | 'removed' }>
): Array<{
  type: 'context' | 'paired-change' | 'single-change'
  lineIndex?: number
  removedIndices?: number[]
  addedIndices?: number[]
  changeType?: 'added' | 'removed'
}> => {
  const groups: Array<{
    type: 'context' | 'paired-change' | 'single-change'
    lineIndex?: number
    removedIndices?: number[]
    addedIndices?: number[]
    changeType?: 'added' | 'removed'
  }> = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.type === 'context') {
      groups.push({
        type: 'context',
        lineIndex: i,
      })
      i++
    } else if (line.type === 'removed') {
      // Look ahead for consecutive removed lines followed by added lines
      const removedIndices: number[] = []
      let j = i

      // Collect consecutive removed lines
      while (j < lines.length && lines[j].type === 'removed') {
        removedIndices.push(j)
        j++
      }

      // Look for consecutive added lines immediately after
      const addedIndices: number[] = []
      while (j < lines.length && lines[j].type === 'added') {
        addedIndices.push(j)
        j++
      }

      if (addedIndices.length > 0) {
        // We have both removals and additions - create a paired change
        groups.push({
          type: 'paired-change',
          removedIndices,
          addedIndices,
        })
      } else {
        // Only removals, no following additions - treat as single changes
        removedIndices.forEach((idx) => {
          groups.push({
            type: 'single-change',
            lineIndex: idx,
            changeType: 'removed',
          })
        })
      }

      i = j
    } else if (line.type === 'added') {
      // Isolated added line (not following a removal)
      groups.push({
        type: 'single-change',
        lineIndex: i,
        changeType: 'added',
      })
      i++
    } else {
      i++
    }
  }

  return groups
}

/**
 * Check if a line should be highlighted based on correspondence.
 *
 * @param hunkIndex - Hunk index of the line
 * @param lineNumber - Line number in the file
 * @param side - Which side of the diff ('old' or 'new')
 * @returns Whether the line should be highlighted
 * @private
 */
const isLineHighlighted = (
  hunkIndex: number | undefined,
  lineNumber: number | null,
  side: 'old' | 'new'
): boolean => {
  if (!hoveredLineId.value || hunkIndex === undefined || lineNumber === null) {
    return false
  }

  // For synchronized hover, we want to highlight corresponding lines on both sides
  // This is based on the hovered line's correspondence mapping
  const correspondingLines =
    lineCorrespondenceMap.value.get(hoveredLineId.value) || []

  // Create the line key for this specific line using content-based matching
  const hunk = props.diffData?.hunks[hunkIndex]
  if (!hunk) return false

  // Find the line index within the hunk
  const lineIndex = hunk.lines.findIndex((line) => {
    if (side === 'old') {
      return line.oldLineNumber === lineNumber
    } else {
      return line.newLineNumber === lineNumber
    }
  })

  if (lineIndex < 0) return false

  // Create simple line key
  const currentLineKey = `${side}-${hunkIndex}-${lineIndex}`
  return correspondingLines.includes(currentLineKey)
}

/**
 * Handle mouse enter/leave for synchronized hover effects.
 *
 * @param side - Which side of the diff ('old' or 'new')
 * @param hunkIndex - Hunk index for proper correspondence
 * @param lineNumber - Line number in the file
 * @param isEntering - Whether mouse is entering or leaving
 * @private
 */
const handleLineHover = (
  side: 'old' | 'new',
  hunkIndex: number | undefined,
  lineNumber: number | null,
  isEntering: boolean
): void => {
  if (isEntering && hunkIndex !== undefined && lineNumber !== null) {
    // Find the line index within the hunk for correspondence mapping
    const hunk = props.diffData?.hunks[hunkIndex]
    if (hunk) {
      const lineIndex = hunk.lines.findIndex((line) => {
        if (side === 'old') {
          return line.oldLineNumber === lineNumber
        } else {
          return line.newLineNumber === lineNumber
        }
      })
      if (lineIndex >= 0) {
        // Generate simple key to match correspondence map
        hoveredLineId.value = `${side}-${hunkIndex}-${lineIndex}`
      }
    }
  } else {
    hoveredLineId.value = null
  }
}

/**
 * Bidirectionally expand a collapsed section in 20-line chunks.
 * ↑ button expands from section start downward
 * ↓ button expands from section end upward
 * Both expansions meet in the middle.
 *
 * @param hunkIndex - Index of the hunk to expand
 * @param startLine - Starting line number for this section
 * @param endLine - Ending line number for this section
 * @param direction - Direction to expand ('up' from start, 'down' from end)
 * @private
 */
/**
 * Handle up button click with debugging
 */
const handleUpButtonClick = (
  hunkIndex: number | undefined,
  startLine: number | undefined,
  endLine: number | undefined,
  event?: MouseEvent
) => {
  event?.stopPropagation() // Prevent event bubbling
  if (hunkIndex !== undefined) {
    expandSection(hunkIndex, startLine ?? 0, endLine ?? 0, 'up')
  }
}

const handleDownButtonClick = (
  hunkIndex: number | undefined,
  startLine: number | undefined,
  endLine: number | undefined,
  event?: MouseEvent
) => {
  event?.stopPropagation() // Prevent event bubbling
  if (hunkIndex !== undefined) {
    expandSection(hunkIndex, startLine ?? 0, endLine ?? 0, 'down')
  }
}

/**
 * Expand a collapsed section bidirectionally from its boundaries.
 *
 * @description
 * In a diff viewer, collapsed sections show hidden lines between hunks.
 * Example: 1,2,3,4,[hidden 5-105],106,107
 *
 * EXPANSION BEHAVIOR:
 * - ↑ button: Expands upward from bottom boundary (shows lines 95-105)
 * - ↓ button: Expands downward from top boundary (shows lines 5-24)
 *
 * This is bidirectional expansion - both buttons expand from the edges
 * of the collapsed section toward the center, NOT contraction.
 *
 * Based on react-diff-view's expandFromRawCode pattern.
 *
 * @param hunkIndex - Index of the hunk containing the section
 * @param startLine - Starting line number of the hidden section (e.g., 5)
 * @param endLine - Ending line number of the hidden section (e.g., 105)
 * @param direction - Direction to expand:
 *   - 'up': Show lines before the bottom boundary (95-105)
 *   - 'down': Show lines after the top boundary (5-24)
 *
 * @example
 * ```typescript
 * // Hidden section: lines 5-105 (101 lines total)
 * expandSection(0, 5, 105, 'down')  // Shows lines 5-24 (20 lines)
 * expandSection(0, 5, 105, 'up')    // Shows lines 85-105 (20 lines from bottom)
 * ```
 *
 * @since 1.0.0
 * @private
 */
const expandSection = async (
  hunkIndex: number,
  startLine: number,
  endLine: number,
  direction: 'up' | 'down'
): Promise<void> => {
  if (!projectRoot.value || !props.currentFile) {
    // Cannot expand - missing project context
    return
  }

  // Create file-specific keys to avoid cross-file contamination
  const fileKey = props.currentFile.replace(/[^a-zA-Z0-9]/g, '_')
  const oldKey = `${fileKey}-${hunkIndex}-old`
  const newKey = `${fileKey}-${hunkIndex}-new`
  const partialKey = `${fileKey}-${hunkIndex}`

  try {
    // Fetch actual file content for context expansion
    const fileContent = await getFileContent(
      projectRoot.value,
      props.currentFile,
      null // Get HEAD version for now
    )

    if (fileContent.length === 0) {
      // File content is empty - cannot expand
      return
    }

    // Get current expansion state
    let expansion = partiallyExpanded.value.get(partialKey)
    if (!expansion) {
      // Initialize expansion state for this section if it doesn't exist
      expansion = {
        expandedFromTop: 0,
        expandedFromBottom: 0,
        totalLines: endLine - startLine + 1,
        sectionStart: startLine,
        sectionEnd: endLine,
      }
      partiallyExpanded.value.set(partialKey, expansion)
    }

    const CHUNK_SIZE = 20
    const existingLines = expandedContext.value.get(oldKey) || []
    let newLines: ExpandedContextLine[] = []

    const remainingLines =
      expansion.totalLines -
      expansion.expandedFromTop -
      expansion.expandedFromBottom

    // If only a few lines remain, expand all of them regardless of direction
    const maxExpansion = Math.min(CHUNK_SIZE, remainingLines)

    if (maxExpansion > 0) {
      // If only 1-3 lines remain, expand all of them regardless of direction
      if (remainingLines <= 3) {
        // Expand all remaining lines
        const topBoundary = expansion.sectionStart + expansion.expandedFromTop
        const bottomBoundary =
          expansion.sectionEnd - expansion.expandedFromBottom

        for (let lineNum = topBoundary; lineNum <= bottomBoundary; lineNum++) {
          const line = fileContent[lineNum - 1] || ''
          newLines.push({
            content: line,
            lineNumber: lineNum,
            type: 'context',
          })
        }

        // Mark all lines as expanded
        if (direction === 'up') {
          expansion.expandedFromBottom += remainingLines
        } else {
          expansion.expandedFromTop += remainingLines
        }
        partiallyExpanded.value.set(partialKey, { ...expansion })
      } else if (direction === 'up') {
        // ↑ button: Expand UPWARD from bottom boundary
        // Example: hidden lines 5-105, expand from bottom shows lines 85-105
        const currentBottomBoundary =
          expansion.sectionEnd - expansion.expandedFromBottom
        // Make sure we don't overlap with already expanded lines from top
        const topBoundary = expansion.sectionStart + expansion.expandedFromTop
        const expandStart = Math.max(
          currentBottomBoundary - maxExpansion + 1,
          topBoundary
        )
        const expandEnd = currentBottomBoundary

        if (expandStart <= expandEnd && expandStart >= 1) {
          for (let lineNum = expandStart; lineNum <= expandEnd; lineNum++) {
            const line = fileContent[lineNum - 1] || ''
            newLines.push({
              content: line,
              lineNumber: lineNum,
              type: 'context',
            })
          }

          expansion.expandedFromBottom += expandEnd - expandStart + 1
          // Update the reactive Map to trigger Vue reactivity
          partiallyExpanded.value.set(partialKey, { ...expansion })
        }
      } else {
        // ↓ button: Expand DOWNWARD from top boundary
        // Example: hidden lines 5-105, expand from top shows lines 5-24
        const currentTopBoundary =
          expansion.sectionStart + expansion.expandedFromTop
        const expandStart = currentTopBoundary
        // Make sure we don't overlap with already expanded lines from bottom
        const bottomBoundary =
          expansion.sectionEnd - expansion.expandedFromBottom
        const expandEnd = Math.min(
          currentTopBoundary + maxExpansion - 1,
          bottomBoundary
        )

        if (expandStart <= expandEnd && expandStart >= 1) {
          for (let lineNum = expandStart; lineNum <= expandEnd; lineNum++) {
            const line = fileContent[lineNum - 1] || ''
            newLines.push({
              content: line,
              lineNumber: lineNum,
              type: 'context',
            })
          }

          expansion.expandedFromTop += expandEnd - expandStart + 1
          // Update the reactive Map to trigger Vue reactivity
          partiallyExpanded.value.set(partialKey, { ...expansion })
        }
      }
    }

    if (newLines.length > 0) {
      // Combine existing and new lines, sort by line number
      const allLines = [...existingLines, ...newLines].sort(
        (a, b) => a.lineNumber - b.lineNumber
      )

      // Store expanded context for both sides with file-specific keys
      expandedContext.value.set(oldKey, allLines)
      expandedContext.value.set(newKey, allLines)

      // Mark sections as expanded
      expandedSections.value.add(oldKey)
      expandedSections.value.add(newKey)

      // Force reactivity update
      expansionTrigger.value++
    }
  } catch {
    // Failed to fetch expanded context
  }

  // Force Vue reactivity update
  await nextTick()
}

/**
 * Get the hint text for expansion buttons showing remaining lines.
 *
 * @param hunkIndex - Index of the hunk
 * @returns Hint text for the expansion section
 * @private
 */
const getExpandHintText = (hunkIndex: number | undefined): string => {
  if (!props.currentFile || hunkIndex === undefined) {
    return 'Click to expand'
  }

  const fileKey = props.currentFile.replace(/[^a-zA-Z0-9]/g, '_')
  const partialKey = `${fileKey}-${hunkIndex}`
  const expansion = partiallyExpanded.value.get(partialKey)

  if (!expansion) {
    return 'Click to expand'
  }

  const remaining =
    expansion.totalLines -
    expansion.expandedFromTop -
    expansion.expandedFromBottom

  if (remaining === 0) {
    return `All lines shown`
  }

  return `${remaining} lines hidden`
}

/**
 * Check if a section can expand upward (from start).
 */
const canExpandUp = (hunkIndex: number | undefined): boolean => {
  if (!props.currentFile || hunkIndex === undefined) {
    return false
  }

  const fileKey = props.currentFile.replace(/[^a-zA-Z0-9]/g, '_')
  const partialKey = `${fileKey}-${hunkIndex}`
  const expansion = partiallyExpanded.value.get(partialKey)

  // Show ↑ button if we haven't expanded from top or if there's gap
  if (!expansion) {
    const hunks = props.diffData?.hunks || []
    const hunk = hunks[hunkIndex]
    if (!hunk) {
      return false
    }

    // If no expansion state yet, determine if there are hidden lines that could be expanded
    if (hunkIndex === 0) {
      const sectionEnd = Math.max(hunk.oldStart - 1, hunk.newStart - 1)
      const hasHiddenLines = sectionEnd > 1
      return hasHiddenLines
    }

    // For sections between hunks
    const prevHunk = hunks[hunkIndex - 1]
    if (!prevHunk) {
      return false
    }
    const sectionStart = prevHunk.oldStart + prevHunk.oldCount + 1
    const hasHiddenLines = sectionStart < hunk.oldStart - 1
    return hasHiddenLines
  }

  // The ↑ button expands UPWARD from the bottom boundary, so don't restrict based on sectionStart

  // Check if we can expand more from the top - there must be space between top expansion and bottom expansion
  const remainingLines =
    expansion.totalLines -
    expansion.expandedFromTop -
    expansion.expandedFromBottom
  const topBoundary = expansion.sectionStart + expansion.expandedFromTop
  const bottomBoundary = expansion.sectionEnd - expansion.expandedFromBottom
  const result = remainingLines > 0 && topBoundary <= bottomBoundary

  return result
}

/**
 * Check if a section can expand downward (from end).
 */
const canExpandDown = (hunkIndex: number | undefined): boolean => {
  if (!props.currentFile || hunkIndex === undefined) {
    return false
  }

  const fileKey = props.currentFile.replace(/[^a-zA-Z0-9]/g, '_')
  const partialKey = `${fileKey}-${hunkIndex}`
  const expansion = partiallyExpanded.value.get(partialKey)

  if (!expansion) {
    const hunks = props.diffData?.hunks || []
    const hunk = hunks[hunkIndex]
    if (!hunk) {
      return false
    }

    // For the first hunk (beginning of file), always show ↓ button if there are hidden lines
    if (hunkIndex === 0) {
      const sectionEnd = Math.max(hunk.oldStart - 1, hunk.newStart - 1)
      const hasHiddenLines = sectionEnd > 0
      return hasHiddenLines
    }

    // For sections between hunks, always show ↓ button if there are hidden lines
    const prevHunk = hunks[hunkIndex - 1]
    if (!prevHunk) {
      return false
    }
    const sectionEnd = hunk.oldStart - 1
    const hasHiddenLines = sectionEnd > prevHunk.oldStart + prevHunk.oldCount
    return hasHiddenLines
  }

  // Check if we can expand more from the bottom - there must be space between expansions
  const remainingLines =
    expansion.totalLines -
    expansion.expandedFromTop -
    expansion.expandedFromBottom
  const topBoundary = expansion.sectionStart + expansion.expandedFromTop
  const bottomBoundary = expansion.sectionEnd - expansion.expandedFromBottom
  const result = remainingLines > 0 && topBoundary <= bottomBoundary

  return result
}

/**
 * Check if there are lines available upward for expansion.
 */
const hasLinesUp = (hunkIndex: number | undefined): boolean => {
  return canExpandUp(hunkIndex)
}

/**
 * Check if there are lines available downward for expansion.
 */
const hasLinesDown = (hunkIndex: number | undefined): boolean => {
  return canExpandDown(hunkIndex)
}

// No WebGL initialization needed for DOM-based diff viewer

/**
 * Handle mouse wheel events for scrolling.
 *
 * @param _event - Wheel event
 * @private
 */
// eslint-disable-next-line no-undef, @typescript-eslint/no-unused-vars
const handleWheel = (_event: WheelEvent): void => {
  // Let the browser handle natural scrolling for DOM content
  // event.preventDefault() is removed to allow natural scroll
}

// Export debug functions to window for testing
if (typeof window !== 'undefined') {
  const windowWithDebug = window as unknown as {
    testDiffHighlighting: () => string
    forceDiffHighlighting: () => Promise<string>
    getDiffHighlightedRows: () => Array<
      [number, { old?: string; new?: string }]
    >
  }

  windowWithDebug.testDiffHighlighting = () => {
    console.log('[Test] Current highlighter:', diffHighlighter.value)
    console.log('[Test] Current file:', props.currentFile)
    console.log('[Test] Has diff data:', !!props.diffData)

    if (!diffHighlighter.value) {
      console.log('[Test] No highlighter initialized, creating one...')
      initializeSyntaxHighlighter()

      if (!diffHighlighter.value) {
        console.log('[Test] Failed to create highlighter')
        return 'Failed to create highlighter'
      }
    }

    const testCode = '  const greeting = "Hello World";'
    console.log('[Test] Testing with code:', testCode)

    const result = diffHighlighter.value.highlightLine(testCode)
    console.log('[Test] Result:', result)
    console.log('[Test] Has inline styles:', result.includes('style='))

    // Create a test element
    const testDiv = document.createElement('div')
    testDiv.innerHTML = `<div style="background: #1e1e1e; padding: 10px; color: #d4d4d4; font-family: monospace;">
      <div>Original: ${testCode}</div>
      <div>Highlighted: ${result}</div>
    </div>`
    document.body.appendChild(testDiv)

    setTimeout(() => testDiv.remove(), 5000)

    return result
  }

  windowWithDebug.forceDiffHighlighting = async (): Promise<string> => {
    console.log('[Force] Forcing diff highlighting...')
    console.log('[Force] Current file:', props.currentFile)
    console.log('[Force] Has diff data:', !!props.diffData)
    console.log('[Force] Has highlighter:', !!diffHighlighter.value)

    if (!diffHighlighter.value && props.currentFile) {
      console.log('[Force] Initializing highlighter...')
      await initializeSyntaxHighlighter()
    }

    if (props.diffData && diffHighlighter.value) {
      console.log('[Force] Starting highlighting process...')
      await highlightVisibleRows()
      console.log('[Force] Highlighting complete')
      return 'Highlighting forced successfully'
    } else {
      return 'Cannot force highlighting - missing requirements'
    }
  }

  windowWithDebug.getDiffHighlightedRows = () => {
    const rows = Array.from(highlightedRows.value.entries())
    console.log(`[Debug] Highlighted rows count: ${rows.length}`)
    console.log('[Debug] Sample highlighted rows:', rows.slice(0, 5))
    return rows
  }
}

// Initialize component on mount
onMounted(async () => {
  // Initialize syntax highlighter if file is available
  if (props.currentFile) {
    await initializeSyntaxHighlighter()
  }

  // Initial highlighting if data is available
  if (props.diffData && diffHighlighter.value) {
    await highlightVisibleRows()
  }
})

// Expose component internals for testing
defineExpose({
  expandedSections,
  partiallyExpanded,
  expandedContext,
  alignedDiffRows,
  diffHighlighter,
  expandSection,
  handleUpButtonClick,
  handleDownButtonClick,
  hoveredLineId,
  initializeSyntaxHighlighter,
  highlightVisibleRows,
  groupNearbyChanges,
  lineCorrespondenceMap,
  escapeHtml,
  highlightContent,
  diffStats,
  getExpandHintText,
  canExpandUp,
  canExpandDown,
  hasLinesUp,
  hasLinesDown,
  isLineHighlighted,
  handleLineHover,
  handleWheel,
  processedOldSide,
  processedNewSide,
  getHighlightedContent,
})
</script>

<style scoped>
.webgl-diff-viewer {
  width: 100%;
  height: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
  box-sizing: border-box;
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.diff-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.diff-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.diff-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.additions {
  color: #10b981;
}

.deletions {
  color: #ef4444;
}

.diff-viewport {
  width: 100%;
  max-width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.diff-content-area {
  flex: 1;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.diff-content {
  width: 100%;
  height: 100%;
  max-width: 100%;
  overflow: auto;
  box-sizing: border-box;
}

.diff-container {
  display: flex;
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.45;
}

.diff-side-content {
  flex: 1;
  min-width: 0;
  max-width: 50%;
  overflow: hidden;
  background: var(--bg-primary);
}

.diff-content-divider {
  width: 1px;
  background: var(--border-primary);
  flex-shrink: 0;
}

.diff-line {
  display: flex;
  align-items: center;
  min-height: 20px;
  padding: 0 8px;
  border-left: 4px solid var(--bg-primary);
  transition: all var(--transition-fast);
}

.diff-line.context {
  background: var(--bg-primary);
  border-left-color: var(--bg-primary);
}

.diff-line.added {
  background: rgba(16, 185, 129, 0.1);
  border-left-color: #10b981;
}

.diff-line.removed {
  background: rgba(239, 68, 68, 0.1);
  border-left-color: #ef4444;
}

.diff-line.empty {
  background: var(--bg-secondary);
  border-left-color: var(--bg-secondary);
  opacity: 0.5;
}

/* Synchronized hover effects for both sides - More evident */
.diff-line:hover,
.diff-line.diff-line-hovered {
  background: rgba(59, 130, 246, 0.15);
}

.diff-line.added:hover,
.diff-line.added.diff-line-hovered {
  background: rgba(16, 185, 129, 0.25);
  border-left-color: #0f766e;
}

.diff-line.removed:hover,
.diff-line.removed.diff-line-hovered {
  background: rgba(239, 68, 68, 0.25);
  border-left-color: #dc2626;
}

.diff-line.context:hover,
.diff-line.context.diff-line-hovered {
  background: rgba(59, 130, 246, 0.12);
  border-left-color: rgba(59, 130, 246, 0.7);
}

.line-number {
  display: inline-block;
  width: 50px;
  text-align: right;
  padding-right: 12px;
  color: var(--text-tertiary);
  font-size: 11px;
  user-select: none;
  flex-shrink: 0;
}

.line-content {
  flex: 1;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  /* Default color for non-highlighted content - will be overridden by Shiki's inline styles */
  color: var(--text-primary);
}

/* Expandable section styling - More discrete to not compete with code */
.diff-expandable-section {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 8px;
  background: rgba(var(--text-tertiary-rgb, 107, 114, 126), 0.02);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin: 1px 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 11px;
  user-select: none;
  opacity: 1 !important;
  min-height: 24px;
  z-index: 1000 !important;
  position: relative !important;
}

/* Side-specific styling */
.diff-expandable-section.old-side {
  border-left: 2px solid rgba(239, 68, 68, 0.2); /* More subtle red for removed/old */
}

.diff-expandable-section.new-side {
  border-left: 2px solid rgba(16, 185, 129, 0.2); /* More subtle green for added/new */
}

.diff-expandable-section:hover {
  background: rgba(var(--text-tertiary-rgb, 107, 114, 126), 0.04);
  border-color: rgba(var(--border-primary-rgb, 229, 231, 235), 0.5);
  opacity: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.diff-expandable-section.old-side:hover {
  border-left-color: rgba(239, 68, 68, 0.4);
}

.diff-expandable-section.new-side:hover {
  border-left-color: rgba(16, 185, 129, 0.4);
}

.expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-weight: normal;
  margin-right: 6px;
  font-size: 10px;
  line-height: 1;
  vertical-align: middle;
}

.old-expand {
  color: rgba(239, 68, 68, 0.6); /* Red for old side */
}

.new-expand {
  color: rgba(16, 185, 129, 0.6); /* Green for new side */
}

.expand-text {
  font-weight: 500;
  margin-right: 8px;
  font-size: 11px;
}

.old-range {
  color: rgba(239, 68, 68, 0.8); /* Red for old side range */
}

.new-range {
  color: rgba(16, 185, 129, 0.8); /* Green for new side range */
}

.expand-hint {
  color: rgba(var(--text-tertiary-rgb, 107, 114, 126), 0.6);
  font-style: normal;
  font-size: 10px;
  flex: 1;
}

.expand-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  transition: all var(--transition-fast);
  user-select: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  opacity: 0.4;
  z-index: 9999 !important;
  position: relative !important;
}

.expand-btn:hover:not(:disabled) {
  background: rgba(var(--accent-primary-rgb, 59, 130, 246), 0.1);
  color: var(--accent-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  opacity: 1;
}

.expand-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  opacity: 1;
}

.expand-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: rgba(var(--bg-secondary-rgb, 248, 250, 252), 0.5);
  color: rgba(var(--text-tertiary-rgb, 107, 114, 126), 0.5);
}

.expand-up {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.expand-down {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: none;
}

/* Hover effects for expandable sections - More subtle */
.diff-expandable-section:hover .old-expand {
  color: rgba(239, 68, 68, 0.9);
  transform: none;
}

.diff-expandable-section:hover .new-expand {
  color: rgba(16, 185, 129, 0.9);
  transform: none;
}

.diff-expandable-section:hover .old-range {
  color: rgba(239, 68, 68, 1);
}

.diff-expandable-section:hover .new-range {
  color: rgba(16, 185, 129, 1);
}

.diff-expandable-section:hover .expand-hint {
  color: rgba(var(--text-tertiary-rgb, 107, 114, 126), 0.8);
}

.no-diff-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-style: italic;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-primary);
  border-top: 2px solid var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.rotate-180 {
  transform: rotate(180deg);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Dark theme optimizations */
@media (prefers-color-scheme: dark) {
  .diff-canvas {
    filter: contrast(1.1);
  }
}

/* Performance optimizations */
.diff-canvas {
  will-change: transform;
  contain: layout style paint;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .diff-header {
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .diff-controls {
    width: 100%;
    justify-content: space-between;
  }

  .commit-info {
    order: -1;
  }

  .commit-message {
    max-width: 150px;
  }

  .diff-sides {
    height: 35px;
  }

  .side-title {
    font-size: 11px;
  }
}

/* Shiki syntax highlighting styles - CRITICAL: No color overrides */
/* Shiki provides inline styles like style="color:#xxx" that must take precedence */

/* Ensure all Shiki inline styles are preserved - NO color override */
.line-content :deep(span) {
  /* Only set non-color properties */
  background: transparent;
  font-family: inherit;
}
</style>
