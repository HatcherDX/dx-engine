<template>
  <div class="adaptive-breadcrumb">
    <!-- Modo Generativo: Filesystem path -->
    <template v-if="currentMode === 'generative'">
      <div class="breadcrumb-segment filesystem">
        <BaseIcon name="Menu" size="sm" class="breadcrumb-icon" />
        <span class="breadcrumb-path">{{
          projectPath || '/home/usuario/mi-proyecto/'
        }}</span>
      </div>
    </template>

    <!-- Modo Visual: URL like browser -->
    <template v-else-if="currentMode === 'visual'">
      <div class="breadcrumb-segment url">
        <BaseIcon name="Eye" size="sm" class="breadcrumb-icon" />
        <span class="breadcrumb-url">{{
          currentUrl || 'https://example.com/dashboard'
        }}</span>
      </div>
    </template>

    <!-- Modo Code: Project name + file path -->
    <template v-else-if="currentMode === 'code'">
      <div class="breadcrumb-segment project-file">
        <div class="project-badge">
          {{ projectName || 'mi-proyecto' }}
        </div>
        <div v-if="filePath" class="file-path">
          <span
            v-for="(segment, index) in pathSegments"
            :key="index"
            class="path-segment"
          >
            <span class="segment-text">{{ segment }}</span>
            <span v-if="index < pathSegments.length - 1" class="path-separator"
              >></span
            >
          </span>
        </div>
      </div>
    </template>

    <!-- Modo Git: Project name + branch -->
    <template v-else>
      <div class="breadcrumb-segment project-git">
        <div class="project-badge">
          {{ projectName || 'mi-proyecto' }}
        </div>
        <div class="git-branch">
          <BaseIcon name="GitBranch" size="xs" class="branch-icon" />
          <span class="branch-text">{{ gitBranch || 'main' }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModeType } from './ModeSelector.vue'
import BaseIcon from '../atoms/BaseIcon.vue'

interface Props {
  currentMode: ModeType
  projectPath?: string
  currentUrl?: string
  projectName?: string
  filePath?: string
  gitBranch?: string
}

const props = withDefaults(defineProps<Props>(), {
  projectPath: '',
  currentUrl: '',
  projectName: '',
  filePath: '',
  gitBranch: '',
})

const pathSegments = computed(() => {
  if (!props.filePath) return ['src', 'components', 'atoms', 'Button.vue']

  return props.filePath.split('/').filter((segment) => segment.length > 0)
})
</script>

<style scoped>
.adaptive-breadcrumb {
  display: flex;
  align-items: center;
  min-width: 0; /* Allow shrinking */
}

.breadcrumb-segment {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.breadcrumb-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

/* Filesystem mode styles */
.filesystem .breadcrumb-path {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* URL mode styles */
.url .breadcrumb-url {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Project + file mode styles */
.project-file,
.project-git {
  gap: 12px;
}

.project-badge {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.dark .project-badge {
  background-color: var(--bg-primary);
}

.file-path {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.path-segment {
  display: flex;
  align-items: center;
  gap: 6px;
}

.segment-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
  white-space: nowrap;
}

.path-separator {
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 400;
}

/* Git branch styles */
.git-branch {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.branch-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.branch-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .filesystem .breadcrumb-path,
  .url .breadcrumb-url {
    font-size: 12px;
  }

  .project-badge {
    font-size: 11px;
    padding: 3px 6px;
  }

  .segment-text {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .breadcrumb-segment {
    gap: 6px;
  }

  .project-file {
    gap: 8px;
  }

  /* Hide middle segments on mobile, show only first and last */
  .file-path .path-segment:not(:first-child):not(:last-child) {
    display: none;
  }

  .file-path .path-segment:first-child:not(:last-child)::after {
    content: '...';
    color: var(--text-tertiary);
    margin: 0 4px;
  }
}

/* Light mode adjustments - make breadcrumb text lighter and more readable */
:not(.dark) .filesystem .breadcrumb-path {
  color: var(--text-tertiary); /* Use tertiary text color for better contrast */
}

:not(.dark) .url .breadcrumb-url {
  color: var(--text-tertiary); /* Use tertiary text color for better contrast */
}

:not(.dark) .segment-text {
  color: var(--text-tertiary); /* Use tertiary text color for better contrast */
}

:not(.dark) .branch-text {
  color: var(--text-tertiary); /* Use tertiary text color for better contrast */
}

:not(.dark) .path-separator {
  color: #94a3b8; /* Lighter gray for separators in light mode */
}

/* Make breadcrumb icon more visible in light mode */
:not(.dark) .breadcrumb-icon {
  color: var(--text-primary); /* Use primary text color for better visibility */
}
</style>
