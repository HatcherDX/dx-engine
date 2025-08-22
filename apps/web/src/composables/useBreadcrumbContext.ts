import { reactive, watch, computed } from 'vue'
import type { ModeType } from '../components/molecules/ModeSelector.vue'
import { useProjectContext } from './useProjectContext'

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
  const { openedProject, isProjectLoaded } = useProjectContext()

  // Computed project display name from package.json
  const projectDisplayName = computed(() => {
    if (!isProjectLoaded.value || !openedProject.value) {
      return 'no-project'
    }

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
        }
      case 'visual':
        return {
          currentUrl: context.visual.currentUrl,
        }
      case 'code':
        return {
          projectName: projectDisplayName.value,
          filePath: context.code.filePath,
        }
      case 'timeline':
        return {
          projectName: projectDisplayName.value,
          currentPeriod: context.timeline.currentPeriod,
        }
      default:
        return {}
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
  }
}
