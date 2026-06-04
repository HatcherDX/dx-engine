import { reactive, watch, computed, ref } from 'vue'
import type { ModeType } from '../components/molecules/ModeSelector.vue'
import { useProjectContext } from './useProjectContext'
import { useGitIntegration } from './useGitIntegration'
import { useFileWatcher } from './useFileWatcher'

interface BreadcrumbContext {
  generative: {
    projectPath: string
  }
  visual: {
    currentUrl: string
  }
  code: {
    projectName: string
    filePath: string
  }
  timeline: {
    projectName: string
    currentPeriod: string
  }
}

const STORAGE_KEY = 'hatcher-breadcrumb-context'

export function useBreadcrumbContext() {
  // Get project context for real data
  const { openedProject, isProjectLoaded, refreshFiles } = useProjectContext()

  // Get Git integration for branch information
  const { getGitBranches } = useGitIntegration()

  // Current Git branch
  const currentGitBranch = ref<string>('main')

  // Flag to track if we've already triggered onboarding for missing project
  const hasTriggeredOnboarding = ref(false)

  // Throttle timer for file refresh to prevent performance issues
  let fileRefreshTimer: NodeJS.Timeout | null = null
  const FILE_REFRESH_THROTTLE = 5000 // Only refresh files every 5 seconds max

  // Computed project display name from package.json
  const projectDisplayName = computed(() => {
    if (!isProjectLoaded.value || !openedProject.value) {
      // Don't trigger onboarding immediately - the onboarding composable
      // will handle checking for workspace and activating if needed
      // This prevents the flash of onboarding on startup
      return 'Workspace'
    }

    // Reset flag when project is loaded
    hasTriggeredOnboarding.value = false

    const packageJson = openedProject.value.packageJson
    if (packageJson && packageJson.name) {
      return String(packageJson.name)
    }

    // Fallback to directory name
    return openedProject.value.name || 'unknown-project'
  })

  // Default context data
  const defaultContext: BreadcrumbContext = {
    generative: {
      projectPath: '/home/usuario/mi-proyecto/',
    },
    visual: {
      currentUrl: 'https://example.com/dashboard',
    },
    code: {
      projectName: 'mi-proyecto',
      filePath: 'src/components/atoms/Button.vue',
    },
    timeline: {
      projectName: 'mi-proyecto',
      currentPeriod: 'Last 24 hours',
    },
  }

  // Load context from localStorage or use defaults
  const loadContext = (): BreadcrumbContext => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...defaultContext, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load breadcrumb context from storage:', error)
    }
    return defaultContext
  }

  // Reactive context state
  const context = reactive<BreadcrumbContext>(loadContext())

  // Save context to localStorage
  const saveContext = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(context))
    } catch (error) {
      console.warn('Failed to save breadcrumb context to storage:', error)
    }
  }

  // Watch for changes and save automatically
  watch(context, saveContext, { deep: true })

  // Function to update Git branch
  const updateGitBranch = async () => {
    if (!isProjectLoaded.value || !openedProject.value?.rootPath) {
      currentGitBranch.value = 'main'
      return
    }

    try {
      const branches = await getGitBranches(openedProject.value.rootPath)
      if (branches && branches.current) {
        currentGitBranch.value = branches.current
        console.log('[BreadcrumbContext] Current Git branch:', branches.current)
      } else {
        currentGitBranch.value = 'main'
      }
    } catch (error) {
      console.warn('[BreadcrumbContext] Failed to get Git branch:', error)
      currentGitBranch.value = 'main'
    }
  }

  // Set up file watcher for Git changes instead of polling
  const { startWatching, onFileChange } = useFileWatcher()

  // Watch for project changes, update Git branch and start file watcher
  watch(
    [isProjectLoaded, openedProject],
    async ([loaded, project]) => {
      // Always update git branch when project changes
      await updateGitBranch()

      // Set up file watcher if project is loaded
      if (loaded && project?.rootPath) {
        try {
          await startWatching(project.rootPath)

          // Listen for Git-related file changes
          onFileChange('git', async () => {
            console.log(
              '[BreadcrumbContext] Git file change detected, updating branch'
            )
            await updateGitBranch()
          })

          // Listen for source file changes to refresh file tree (throttled)
          onFileChange('source', async () => {
            // Clear existing timer if any
            if (fileRefreshTimer) {
              clearTimeout(fileRefreshTimer)
            }

            // Set new throttled refresh
            fileRefreshTimer = setTimeout(async () => {
              console.log(
                '[BreadcrumbContext] Source file changes detected (throttled), refreshing files'
              )
              try {
                await refreshFiles()
                fileRefreshTimer = null
              } catch (error) {
                console.warn(
                  '[BreadcrumbContext] Failed to refresh files:',
                  error
                )
              }
            }, FILE_REFRESH_THROTTLE)
          })

          // Listen for config file changes to refresh file tree (throttled)
          onFileChange('config', async () => {
            // Clear existing timer if any
            if (fileRefreshTimer) {
              clearTimeout(fileRefreshTimer)
            }

            // Set new throttled refresh
            fileRefreshTimer = setTimeout(async () => {
              console.log(
                '[BreadcrumbContext] Config file changes detected (throttled), refreshing files'
              )
              try {
                await refreshFiles()
                fileRefreshTimer = null
              } catch (error) {
                console.warn(
                  '[BreadcrumbContext] Failed to refresh files:',
                  error
                )
              }
            }, FILE_REFRESH_THROTTLE)
          })

          console.log(
            '[BreadcrumbContext] File watcher started for:',
            project.rootPath
          )
        } catch (error) {
          console.warn(
            '[BreadcrumbContext] Failed to start file watcher:',
            error
          )
          // Fallback to manual updates if file watching fails
        }
      }
    },
    { immediate: true }
  )

  // Methods to update specific mode contexts
  const updateGenerativePath = (projectPath: string) => {
    context.generative.projectPath = projectPath
  }

  const updateVisualUrl = (currentUrl: string) => {
    context.visual.currentUrl = currentUrl
  }

  const updateCodeContext = (projectName: string, filePath: string) => {
    context.code.projectName = projectName
    context.code.filePath = filePath
  }

  const updateTimelineContext = (
    projectName: string,
    currentPeriod: string
  ) => {
    context.timeline.projectName = projectName
    context.timeline.currentPeriod = currentPeriod
  }

  // Get context for specific mode
  const getContextForMode = (mode: ModeType) => {
    switch (mode) {
      case 'generative':
        return {
          projectPath: isProjectLoaded.value
            ? openedProject.value?.rootPath
            : context.generative.projectPath,
          gitBranch: currentGitBranch.value,
        }
      case 'visual':
        return {
          currentUrl: context.visual.currentUrl,
          gitBranch: currentGitBranch.value,
        }
      case 'code':
        return {
          projectName: projectDisplayName.value,
          filePath: context.code.filePath,
          gitBranch: currentGitBranch.value,
        }
      case 'timeline':
        return {
          projectName: projectDisplayName.value,
          gitBranch: currentGitBranch.value,
          currentPeriod: context.timeline.currentPeriod,
        }
      default:
        return {
          gitBranch: currentGitBranch.value,
        }
    }
  }

  // Simulate navigation/file changes (for demo purposes)
  const simulateFileChange = (mode: ModeType) => {
    const demoFiles = {
      code: [
        'src/components/atoms/BaseButton.vue',
        'src/components/molecules/ModeSelector.vue',
        'src/composables/useTheme.ts',
        'src/stores/theme.ts',
        'src/App.vue',
      ],
      timeline: [
        'Last 24 hours',
        'Last week',
        'Last month',
        'Last 3 months',
        'Last year',
      ],
    }

    if (mode === 'code') {
      const files = demoFiles.code
      const randomFile = files[Math.floor(Math.random() * files.length)]
      updateCodeContext(projectDisplayName.value, randomFile)
    } else if (mode === 'timeline') {
      const periods = demoFiles.timeline
      const randomPeriod = periods[Math.floor(Math.random() * periods.length)]
      updateTimelineContext(projectDisplayName.value, randomPeriod)
    } else if (mode === 'generative') {
      const demoPaths = [
        '/home/usuario/mi-proyecto/',
        '/home/usuario/mi-proyecto/src/',
        '/home/usuario/mi-proyecto/src/components/',
        '/home/usuario/documents/otro-proyecto/',
      ]
      const randomPath = demoPaths[Math.floor(Math.random() * demoPaths.length)]
      updateGenerativePath(randomPath)
    } else if (mode === 'visual') {
      const demoUrls = [
        'https://example.com/dashboard',
        'https://example.com/settings',
        'https://github.com/user/repo',
        'https://docs.example.com/api',
      ]
      const randomUrl = demoUrls[Math.floor(Math.random() * demoUrls.length)]
      updateVisualUrl(randomUrl)
    }
  }

  return {
    context,
    getContextForMode,
    updateGenerativePath,
    updateVisualUrl,
    updateCodeContext,
    updateTimelineContext,
    simulateFileChange,
    projectDisplayName,
    currentGitBranch,
    updateGitBranch,
  }
}
