#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Script to check and display coverage information
 * Useful for local development and CI verification
 */

const coverageDir = join(process.cwd(), 'coverage')
const coverageSummaryPath = join(coverageDir, 'coverage-summary.json')

function checkCoverageReport() {
  console.log('🔍 Checking coverage report...')

  if (!existsSync(coverageDir)) {
    console.error('❌ Coverage directory not found. Run: pnpm test:coverage')
    process.exit(1)
  }

  if (!existsSync(coverageSummaryPath)) {
    console.error('❌ Coverage summary not found. Run: pnpm test:coverage')
    process.exit(1)
  }

  try {
    const summaryContent = readFileSync(coverageSummaryPath, 'utf8')
    const summary = JSON.parse(summaryContent)

    console.log('✅ Coverage report found!')
    console.log('\n📊 Coverage Summary:')
    console.log('─'.repeat(50))

    const { total } = summary
    if (total) {
      console.log(`📈 Statements: ${total.statements.pct}%`)
      console.log(`🌿 Branches:   ${total.branches.pct}%`)
      console.log(`⚡ Functions:  ${total.functions.pct}%`)
      console.log(`📝 Lines:      ${total.lines.pct}%`)
    }

    console.log('─'.repeat(50))
    console.log('\n🔗 Badge URL:')
    const badgeUrl = `https://img.shields.io/badge/dynamic/json?label=Coverage&query=%24.total.statements.pct&suffix=%25&url=https%3A%2F%2Fraw.githubusercontent.com%2FHatcherDX%2Fdx-engine%2Fcoverage-reports%2Fcoverage-summary.json&colorB=brightgreen&colorA=gray&style=flat`
    console.log(badgeUrl)

    // Check coverage thresholds
    const statementsPct = total.statements.pct
    if (statementsPct >= 80) {
      console.log('\n🎉 Excellent coverage!')
    } else if (statementsPct >= 60) {
      console.log('\n👍 Good coverage!')
    } else if (statementsPct >= 40) {
      console.log('\n📈 Improving coverage!')
    } else {
      console.log('\n⚠️  Coverage needs improvement')
    }

    return summary
  } catch (error) {
    console.error('❌ Error reading coverage summary:', error)
    process.exit(1)
  }
}

// Run the check
if (import.meta.url === `file://${process.argv[1]}`) {
  checkCoverageReport()
}

export { checkCoverageReport }
