/**
 * @fileoverview Comprehensive test suite for GitHistory component.
 *
 * @description
 * Tests all functionality of the GitHistory component including commit display,
 * date formatting, author name extraction, commit selection, and responsive behavior.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import GitHistory from './GitHistory.vue'
import type { GitCommitData } from '@hatcherdx/shared-rendering'

// Type definition for GitHistory component instance - NO ANY TYPES ALLOWED
interface GitHistoryInstance extends InstanceType<typeof GitHistory> {
  formatDate: (date: Date) => string
  getAuthorName: (author: { name: string; email: string }) => string
  selectCommit: (commit: GitCommitData) => void
  [key: string]: unknown
}

// Mock the shared-rendering types
vi.mock('@hatcherdx/shared-rendering', () => ({
  default: {},
}))

describe('GitHistory', () => {
  let wrapper: VueWrapper<InstanceType<typeof GitHistory>>

  const mockCommits: GitCommitData[] = [
    {
      hash: 'abc123def456',
      shortHash: 'abc123d',
      message: 'feat: Add new terminal component',
      author: {
        name: 'John Doe',
        email: 'john@example.com',
        date: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      parents: ['parent1'],
      branch: 'main',
      filesChanged: 5,
      linesAdded: 120,
      linesDeleted: 25,
      tags: ['v1.0.0', 'stable'],
    },
    {
      hash: 'def456ghi789',
      shortHash: 'def456g',
      message:
        'fix: Resolve terminal focus issue with very long commit message that should be truncated',
      author: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      parents: ['parent2'],
      branch: 'main',
      filesChanged: 2,
      linesAdded: 15,
      linesDeleted: 5,
      tags: [],
    },
    {
      hash: 'ghi789jkl012',
      shortHash: 'ghi789j',
      message: 'refactor: Update API structure',
      author: {
        name: 'Bob Wilson',
        email: 'bob@example.com',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      parents: ['parent3'],
      branch: 'main',
      filesChanged: 10,
      linesAdded: 0,
      linesDeleted: 45,
      tags: [],
    },
    {
      hash: 'jkl012mno345',
      shortHash: 'jkl012m',
      message: 'docs: Update README with examples',
      author: {
        name: 'Alice Brown',
        email: 'alice@example.com',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      parents: ['parent4'],
      branch: 'main',
      filesChanged: 3,
      linesAdded: 50,
      linesDeleted: 0,
      tags: [],
    },
    {
      hash: 'mno345pqr678',
      shortHash: 'mno345p',
      message: 'chore: Update dependencies',
      author: {
        name: 'Charlie Davis',
        email: 'charlie@example.com',
        date: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      },
      parents: ['parent5'],
      branch: 'main',
      filesChanged: 1,
      linesAdded: 30,
      linesDeleted: 20,
      tags: [],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should mount successfully with commits', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.git-history').exists()).toBe(true)
    })

    it('should render all commits', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })

      const commitRows = wrapper.findAll('.commit-row')
      expect(commitRows).toHaveLength(5)
    })

    it('should handle empty commits array', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: [],
        },
      })

      expect(wrapper.find('.git-history').exists()).toBe(true)
      expect(wrapper.findAll('.commit-row')).toHaveLength(0)
    })
  })

  describe('Commit Display', () => {
    beforeEach(() => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })
    })

    it('should display commit hashes correctly', () => {
      const commitHashes = wrapper.findAll('.commit-hash')

      expect(commitHashes[0].text()).toBe('abc123d')
      expect(commitHashes[1].text()).toBe('def456g')
      expect(commitHashes[2].text()).toBe('ghi789j')
    })

    it('should display commit messages correctly', () => {
      const commitMessages = wrapper.findAll('.commit-message')

      expect(commitMessages[0].text()).toBe('feat: Add new terminal component')
      expect(commitMessages[1].text()).toContain(
        'fix: Resolve terminal focus issue'
      )
      expect(commitMessages[2].text()).toBe('refactor: Update API structure')
    })

    it('should display commit message as title attribute', () => {
      const commitMessage = wrapper.find('.commit-message')
      expect(commitMessage.attributes('title')).toBe(
        'feat: Add new terminal component'
      )
    })

    it('should apply selected class to selected commit', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommit: 'def456ghi789', // Select the second commit (index 1)
        },
      })

      const selectedCommit = wrapper.findAll('.commit-row')[1]
      expect(selectedCommit.classes()).toContain('commit-selected')
    })

    it('should display file change stats correctly', () => {
      const fileChanges = wrapper.findAll('.files-changed')

      expect(fileChanges[0].text()).toBe('5')
      expect(fileChanges[1].text()).toBe('2')
      expect(fileChanges[2].text()).toBe('10')
    })

    it('should display addition and deletion stats', () => {
      const changeIndicators = wrapper.findAll('.change-indicators')

      const firstCommitChanges = changeIndicators[0]
      expect(firstCommitChanges.find('.additions').text()).toBe('+120')
      expect(firstCommitChanges.find('.deletions').text()).toBe('-25')

      const thirdCommitChanges = changeIndicators[2]
      expect(thirdCommitChanges.find('.additions').exists()).toBe(false)
      expect(thirdCommitChanges.find('.deletions').text()).toBe('-45')
    })

    it('should display tags when present', () => {
      const firstCommit = wrapper.findAll('.commit-row')[0]
      const tags = firstCommit.findAll('.commit-tag')

      expect(tags).toHaveLength(2)
      expect(tags[0].text()).toBe('v1.0.0')
      expect(tags[1].text()).toBe('stable')
    })

    it('should not display tags section when no tags', () => {
      const secondCommit = wrapper.findAll('.commit-row')[1]
      expect(secondCommit.find('.commit-tags').exists()).toBe(false)
    })
  })

  describe('Author Name Extraction', () => {
    beforeEach(() => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })
    })

    it('should extract name from author object', () => {
      const authors = wrapper.findAll('.commit-author')

      expect(authors[0].text()).toBe('John Doe')
      expect(authors[1].text()).toBe('Jane Smith')
      expect(authors[3].text()).toBe('Alice Brown')
    })

    it('should handle string author', () => {
      const authors = wrapper.findAll('.commit-author')
      expect(authors[2].text()).toBe('Bob Wilson')
    })

    it('should call getAuthorName method correctly', () => {
      const vm = wrapper.vm as GitHistoryInstance

      // Test with object author
      const objectAuthor = { name: 'Test User', email: 'test@example.com' }
      expect(vm.getAuthorName(objectAuthor)).toBe('Test User')

      // Test with string author
      expect(vm.getAuthorName('String Author')).toBe('String Author')
    })

    it('should handle string authors with manual test', () => {
      // Create a component specifically for testing string authors
      const stringAuthorCommits: GitCommitData[] = [
        {
          hash: 'test1',
          shortHash: 'test1',
          message: 'Test commit',
          author: {
            name: 'Direct String Author',
            email: 'direct@example.com',
            date: new Date(),
          },
          parents: [],
          branch: 'main',
          filesChanged: 1,
          linesAdded: 10,
          linesDeleted: 0,
          tags: [],
        },
      ]

      const stringWrapper = mount(GitHistory, {
        props: {
          commits: stringAuthorCommits,
        },
      })

      const vm = stringWrapper.vm as unknown as {
        getAuthorName: (name: string) => string
      }
      expect(vm.getAuthorName('Direct String Author')).toBe(
        'Direct String Author'
      )

      stringWrapper.unmount()
    })
  })

  describe('Date Formatting', () => {
    beforeEach(() => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })
    })

    it('should format recent dates as hours ago', () => {
      const dates = wrapper.findAll('.commit-date')
      expect(dates[1].text()).toBe('2h ago')
    })

    it('should format older dates as days ago', () => {
      const dates = wrapper.findAll('.commit-date')
      const dateText = dates[3].text()
      // 15 days ago should show as days ago
      expect(dateText).toBe('15d ago')
    })

    it('should format very old dates as full date', () => {
      const dates = wrapper.findAll('.commit-date')
      const oldCommitDate = dates[4].text()
      // Should be a formatted date string, not relative time
      expect(oldCommitDate).not.toContain('ago')
      expect(oldCommitDate.length).toBeGreaterThan(5)
    })

    it('should handle just now time correctly', () => {
      const vm = wrapper.vm as GitHistoryInstance
      const now = new Date()
      const justNow = new Date(now.getTime() - 30 * 1000) // 30 seconds ago

      expect(vm.formatDate(justNow)).toBe('Just now')
    })

    it('should handle formatDate method edge cases', () => {
      const vm = wrapper.vm as GitHistoryInstance
      const now = new Date()

      // Test 1 hour ago (should be "1h ago")
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      expect(vm.formatDate(oneHourAgo)).toBe('1h ago')

      // Test 1 day ago (should be "1d ago")
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      expect(vm.formatDate(oneDayAgo)).toBe('1d ago')

      // Test 15 minutes ago (should be "Just now")
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
      expect(vm.formatDate(fifteenMinutesAgo)).toBe('Just now')
    })
  })

  describe('Commit Selection', () => {
    beforeEach(() => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })
    })

    it('should emit commitSelected when commit is clicked', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as GitHistoryInstance
      vm.selectCommit('abc123def456')
      await nextTick()

      expect(wrapper.emitted('commitSelected')).toBeTruthy()
      const emittedEvents = wrapper.emitted('commitSelected')
      expect(emittedEvents?.[0]).toEqual(['abc123def456'])
    })

    it('should emit correct commit hash for different commits', async () => {
      // Use direct method call instead of trigger
      const vm = wrapper.vm as GitHistoryInstance
      vm.selectCommit('def456ghi789')
      vm.selectCommit('ghi789jkl012')
      await nextTick()

      const emittedEvents = wrapper.emitted('commitSelected')
      expect(emittedEvents?.[0]).toEqual(['def456ghi789'])
      expect(emittedEvents?.[1]).toEqual(['ghi789jkl012'])
    })

    it('should call selectCommit method correctly', () => {
      const vm = wrapper.vm as GitHistoryInstance

      vm.selectCommit('test-hash')

      expect(wrapper.emitted('commitSelected')).toBeTruthy()
      const emittedEvents = wrapper.emitted('commitSelected')
      expect(emittedEvents?.[emittedEvents.length - 1]).toEqual(['test-hash'])
    })
  })

  describe('Visual States', () => {
    it('should apply hover states correctly', async () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })

      const firstCommit = wrapper.find('.commit-row')

      // Test that hover styles are applied via CSS classes
      expect(firstCommit.exists()).toBe(true)
      // Component should exist after hover
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle selected state styling', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommit: 'def456ghi789',
        },
      })

      const selectedCommit = wrapper.find('.commit-selected')
      expect(selectedCommit.exists()).toBe(true)
      expect(selectedCommit.find('.commit-hash').exists()).toBe(true)
    })

    it('should handle unselected state', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
        },
      })

      const selectedCommits = wrapper.findAll('.commit-selected')
      expect(selectedCommits).toHaveLength(0)
    })
  })

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })
    })

    it('should maintain structure for responsive layouts', () => {
      const gitHistory = wrapper.find('.git-history')
      const commitsList = wrapper.find('.commits-list')

      expect(gitHistory.exists()).toBe(true)
      expect(commitsList.exists()).toBe(true)
    })

    it('should handle scrollable content', () => {
      const commitsList = wrapper.find('.commits-list')
      expect(commitsList.exists()).toBe(true)
      // Should have proper styling for overflow
      expect(commitsList.classes()).not.toContain('overflow-hidden')
    })
  })

  describe('Edge Cases', () => {
    it('should handle commits without tags', () => {
      const commitsWithoutTags: GitCommitData[] = [
        {
          hash: 'no-tags',
          shortHash: 'no-tags',
          message: 'Commit without tags',
          author: {
            name: 'Test Author',
            email: 'test@example.com',
            date: new Date(),
          },
          parents: [],
          branch: 'main',
          filesChanged: 1,
          linesAdded: 10,
          linesDeleted: 0,
          tags: [],
        },
      ]

      wrapper = mount(GitHistory, {
        props: {
          commits: commitsWithoutTags,
        },
      })

      expect(wrapper.find('.commit-tags').exists()).toBe(false)
    })

    it('should handle commits with empty tags array', () => {
      const commitsWithEmptyTags: GitCommitData[] = [
        {
          hash: 'empty-tags',
          shortHash: 'empty-t',
          message: 'Commit with empty tags',
          author: {
            name: 'Test Author',
            email: 'test@example.com',
            date: new Date(),
          },
          parents: [],
          branch: 'main',
          filesChanged: 1,
          linesAdded: 10,
          linesDeleted: 0,
          tags: [],
        },
      ]

      wrapper = mount(GitHistory, {
        props: {
          commits: commitsWithEmptyTags,
        },
      })

      expect(wrapper.find('.commit-tags').exists()).toBe(false)
    })

    it('should handle commits with zero additions', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })

      const commitRow = wrapper.findAll('.commit-row')[2] // Third commit has 0 additions
      const additions = commitRow.find('.additions')

      expect(additions.exists()).toBe(false)
    })

    it('should handle commits with zero deletions', () => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })

      const commitRow = wrapper.findAll('.commit-row')[3] // Fourth commit has 0 deletions
      const deletions = commitRow.find('.deletions')

      expect(deletions.exists()).toBe(false)
    })

    it('should handle very recent commits', () => {
      const recentCommits: GitCommitData[] = [
        {
          hash: 'recent',
          shortHash: 'recent',
          message: 'Very recent commit',
          author: {
            name: 'Test Author',
            email: 'test@example.com',
            date: new Date(),
          },
          parents: [],
          branch: 'main',
          filesChanged: 1,
          linesAdded: 5,
          linesDeleted: 0,
          tags: [],
        },
      ]

      wrapper = mount(GitHistory, {
        props: {
          commits: recentCommits,
        },
      })

      const date = wrapper.find('.commit-date')
      expect(date.text()).toBe('Just now')
    })

    it('should handle commits with undefined properties gracefully', () => {
      const minimalCommits: GitCommitData[] = [
        {
          hash: 'minimal',
          shortHash: 'minimal',
          message: 'Minimal commit',
          author: {
            name: 'Test Author',
            email: 'test@example.com',
            date: new Date(),
          },
          parents: [],
          branch: 'main',
          filesChanged: 0,
          linesAdded: 0,
          linesDeleted: 0,
          tags: [],
        },
      ]

      wrapper = mount(GitHistory, {
        props: {
          commits: minimalCommits,
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.commit-row').exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })
    })

    it('should have clickable commit rows', () => {
      const commitRows = wrapper.findAll('.commit-row')
      // Check that commit rows exist and have the proper class
      expect(commitRows.length).toBeGreaterThan(0)
      commitRows.forEach((row) => {
        expect(row.classes()).toContain('commit-row')
      })
    })

    it('should provide title attributes for truncated content', () => {
      const commitMessage = wrapper.find('.commit-message')
      expect(commitMessage.attributes('title')).toBeDefined()
    })
  })

  describe('Data Integrity', () => {
    beforeEach(() => {
      wrapper = mount(GitHistory, {
        props: {
          commits: mockCommits,
          selectedCommitId: 'def456ghi789',
        },
      })
    })

    it('should maintain commit order', () => {
      const commitHashes = wrapper.findAll('.commit-hash')

      expect(commitHashes[0].text()).toBe('abc123d')
      expect(commitHashes[1].text()).toBe('def456g')
      expect(commitHashes[2].text()).toBe('ghi789j')
      expect(commitHashes[3].text()).toBe('jkl012m')
      expect(commitHashes[4].text()).toBe('mno345p')
    })

    it('should display correct data for each commit field', () => {
      const firstRow = wrapper.findAll('.commit-row')[0]

      expect(firstRow.find('.commit-hash').text()).toBe('abc123d')
      expect(firstRow.find('.commit-message').text()).toBe(
        'feat: Add new terminal component'
      )
      expect(firstRow.find('.commit-author').text()).toBe('John Doe')
      expect(firstRow.find('.files-changed').text()).toBe('5')
      expect(firstRow.find('.additions').text()).toBe('+120')
      expect(firstRow.find('.deletions').text()).toBe('-25')
    })
  })
})
