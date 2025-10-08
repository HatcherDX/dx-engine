<template>
  <div class="project-breadcrumb">
    <span class="project-name">{{ projectName }}</span>
    <BaseIcon name="GitBranch" size="xs" class="branch-icon" />
    <span class="branch-name">{{ branchName }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * @fileoverview Compact project and branch breadcrumb display component.
 *
 * @description
 * A minimal breadcrumb component that shows the current project name
 * and Git branch in a compact format. Used as a replacement for the
 * logo in the header to provide contextual information.
 *
 * @example
 * ```vue
 * <template>
 *   <ProjectBreadcrumb
 *     project-name="my-project"
 *     branch-name="feature/new-ui"
 *   />
 * </template>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import BaseIcon from './BaseIcon.vue'

interface Props {
  /**
   * The name of the current project.
   * @defaultValue 'dx-engine'
   */
  projectName?: string

  /**
   * The name of the current Git branch.
   * @defaultValue 'main'
   */
  branchName?: string
}

withDefaults(defineProps<Props>(), {
  projectName: 'dx-engine',
  branchName: 'main',
})
</script>

<style scoped>
.project-breadcrumb {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  flex: 0 1 auto; /* Take only needed space but can shrink if needed */
  min-width: 0;
  overflow: hidden;
  letter-spacing: -0.01em;
  padding: 0 2px;
  max-width: 300px; /* Limit maximum width but allow natural sizing */
  /* Allow header dragging through this element since it's not interactive */
  -webkit-app-region: drag;
}

.project-name {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-weight: 600;
  opacity: 0.95;
  transition: opacity 0.2s ease;
}

.branch-icon {
  color: var(--accent-primary-hover); /* Match branch name color */
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

/* Use normal accent color in dark mode */
.dark .branch-icon {
  color: var(--accent-primary);
}

.branch-name {
  color: var(--accent-primary-hover); /* Darker gold for better contrast */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-weight: 600;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

/* Use normal accent color in dark mode */
.dark .branch-name {
  color: var(--accent-primary);
}

/* Hover effects for better interaction feedback */
.project-breadcrumb:hover .project-name {
  opacity: 1;
}

.project-breadcrumb:hover .branch-icon {
  opacity: 1;
}

.project-breadcrumb:hover .branch-name {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .project-breadcrumb {
    font-size: 11px;
    gap: 5px;
  }
}

@media (max-width: 480px) {
  .project-name {
    display: none;
  }

  .project-breadcrumb {
    gap: 4px;
  }
}
</style>
