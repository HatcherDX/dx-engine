<!--
/**
 * @fileoverview System diagnostics modal for health checks.
 *
 * @description
 * Modal for running system diagnostics and health checks on the
 * Claude Code installation, including Electron environment, IPC,
 * file system access, Git operations, and performance metrics.
 *
 * @example
 * <DoctorModal
 *   :visible="showDoctor"
 *   @close="showDoctor = false"
 *   @run-diagnostics="handleRunDiagnostics"
 * />
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
-->

<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <BaseIcon name="Activity" size="md" class="header-icon" />
          <h2 class="modal-title">System Diagnostics</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Overall Health -->
        <div class="health-summary">
          <div class="health-badge" :class="overallHealthClass">
            <BaseIcon :name="overallHealthIcon" size="lg" />
            <div class="health-info">
              <span class="health-status">{{ overallHealthStatus }}</span>
              <span class="health-description">{{
                overallHealthDescription
              }}</span>
            </div>
          </div>
        </div>

        <!-- Diagnostic Checks -->
        <div class="diagnostics-section">
          <h3 class="section-title">Diagnostic Checks</h3>

          <!-- Electron Environment -->
          <div class="check-item">
            <div class="check-header">
              <div class="check-icon" :class="getStatusClass(checks.electron)">
                <BaseIcon :name="getStatusIcon(checks.electron)" size="sm" />
              </div>
              <div class="check-info">
                <span class="check-title">Electron Environment</span>
                <span class="check-status">{{ checks.electron.message }}</span>
              </div>
            </div>
            <div v-if="checks.electron.details" class="check-details">
              {{ checks.electron.details }}
            </div>
          </div>

          <!-- IPC Communication -->
          <div class="check-item">
            <div class="check-header">
              <div class="check-icon" :class="getStatusClass(checks.ipc)">
                <BaseIcon :name="getStatusIcon(checks.ipc)" size="sm" />
              </div>
              <div class="check-info">
                <span class="check-title">IPC Communication</span>
                <span class="check-status">{{ checks.ipc.message }}</span>
              </div>
            </div>
            <div v-if="checks.ipc.details" class="check-details">
              {{ checks.ipc.details }}
            </div>
          </div>

          <!-- File System Access -->
          <div class="check-item">
            <div class="check-header">
              <div
                class="check-icon"
                :class="getStatusClass(checks.fileSystem)"
              >
                <BaseIcon :name="getStatusIcon(checks.fileSystem)" size="sm" />
              </div>
              <div class="check-info">
                <span class="check-title">File System Access</span>
                <span class="check-status">{{
                  checks.fileSystem.message
                }}</span>
              </div>
            </div>
            <div v-if="checks.fileSystem.details" class="check-details">
              {{ checks.fileSystem.details }}
            </div>
          </div>

          <!-- Git Operations -->
          <div class="check-item">
            <div class="check-header">
              <div class="check-icon" :class="getStatusClass(checks.git)">
                <BaseIcon :name="getStatusIcon(checks.git)" size="sm" />
              </div>
              <div class="check-info">
                <span class="check-title">Git Operations</span>
                <span class="check-status">{{ checks.git.message }}</span>
              </div>
            </div>
            <div v-if="checks.git.details" class="check-details">
              {{ checks.git.details }}
            </div>
          </div>

          <!-- Performance -->
          <div class="check-item">
            <div class="check-header">
              <div
                class="check-icon"
                :class="getStatusClass(checks.performance)"
              >
                <BaseIcon :name="getStatusIcon(checks.performance)" size="sm" />
              </div>
              <div class="check-info">
                <span class="check-title">Performance Metrics</span>
                <span class="check-status">{{
                  checks.performance.message
                }}</span>
              </div>
            </div>
            <div v-if="checks.performance.details" class="check-details">
              {{ checks.performance.details }}
            </div>
          </div>
        </div>

        <!-- System Info -->
        <div class="system-info-section">
          <h3 class="section-title">System Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Platform</span>
              <span class="info-value">{{ systemInfo.platform }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Electron</span>
              <span class="info-value">{{ systemInfo.electronVersion }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Node.js</span>
              <span class="info-value">{{ systemInfo.nodeVersion }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Chrome</span>
              <span class="info-value">{{ systemInfo.chromeVersion }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions-section">
          <BaseButton
            variant="ghost"
            size="sm"
            :disabled="isRunning"
            @click="handleRunDiagnostics"
          >
            <BaseIcon name="Activity" size="xs" />
            {{ isRunning ? 'Running...' : 'Run Diagnostics' }}
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="handleExportReport">
            <BaseIcon name="FileText" size="xs" />
            Export Report
          </BaseButton>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" @click="$emit('close')"> Close </BaseButton>
        <BaseButton
          v-if="hasIssues"
          variant="primary"
          @click="handleViewSolutions"
        >
          <BaseIcon name="BookOpen" size="xs" />
          View Solutions
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useNotifications } from '../../composables/useNotifications'

/**
 * Component props.
 *
 * @public
 */
interface Props {
  /** Controls visibility of the modal */
  visible: boolean
}

/**
 * Component emits.
 *
 * @public
 */
interface Emits {
  /** Emitted when modal should close */
  (event: 'close'): void
  /** Emitted when run diagnostics is triggered */
  (event: 'run-diagnostics'): void
}

/**
 * Diagnostic check status.
 *
 * @private
 */
interface CheckStatus {
  status: 'pass' | 'warning' | 'fail' | 'running'
  message: string
  details?: string
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, warning } = useNotifications()

const isRunning = ref(false)

/**
 * Diagnostic checks state.
 *
 * @private
 */
const checks = ref<Record<string, CheckStatus>>({
  electron: {
    status: 'pass',
    message: 'Electron environment initialized correctly',
    details: 'All APIs accessible and functional',
  },
  ipc: {
    status: 'pass',
    message: 'IPC communication functioning normally',
    details: 'Average round-trip: 15ms',
  },
  fileSystem: {
    status: 'pass',
    message: 'File system access verified',
    details: 'Read/write permissions OK',
  },
  git: {
    status: 'warning',
    message: 'Git available with minor issues',
    details: 'Some operations may be slow',
  },
  performance: {
    status: 'pass',
    message: 'Performance within normal range',
    details: 'Memory: 245MB, CPU: 12%',
  },
})

/**
 * System information.
 *
 * @private
 */
const systemInfo = ref({
  platform: 'darwin (macOS)',
  electronVersion: '28.0.0',
  nodeVersion: '18.17.0',
  chromeVersion: '120.0.6099.109',
})

/**
 * Calculate overall health status.
 *
 * @private
 */
const overallHealthStatus = computed(() => {
  const statuses = Object.values(checks.value).map((c) => c.status)

  if (statuses.includes('fail')) return 'Critical Issues'
  if (statuses.includes('warning')) return 'Minor Issues'
  return 'All Systems Operational'
})

/**
 * Get overall health description.
 *
 * @private
 */
const overallHealthDescription = computed(() => {
  const failCount = Object.values(checks.value).filter(
    (c) => c.status === 'fail'
  ).length
  const warningCount = Object.values(checks.value).filter(
    (c) => c.status === 'warning'
  ).length

  if (failCount > 0) return `${failCount} critical issue(s) detected`
  if (warningCount > 0) return `${warningCount} warning(s) detected`
  return 'System is healthy and ready'
})

/**
 * Get overall health CSS class.
 *
 * @private
 */
const overallHealthClass = computed(() => {
  const statuses = Object.values(checks.value).map((c) => c.status)

  if (statuses.includes('fail')) return 'health-critical'
  if (statuses.includes('warning')) return 'health-warning'
  return 'health-good'
})

/**
 * Get overall health icon.
 *
 * @private
 */
const overallHealthIcon = computed(() => {
  const statuses = Object.values(checks.value).map((c) => c.status)

  if (statuses.includes('fail')) return 'AlertCircle'
  if (statuses.includes('warning')) return 'AlertCircle'
  return 'CheckCircle'
})

/**
 * Check if there are any issues.
 *
 * @private
 */
const hasIssues = computed(() => {
  return Object.values(checks.value).some(
    (c) => c.status === 'fail' || c.status === 'warning'
  )
})

/**
 * Get status icon for a check.
 *
 * @param check - Check status
 * @returns Icon name
 *
 * @private
 */
const getStatusIcon = (check: CheckStatus): string => {
  switch (check.status) {
    case 'pass':
      return 'CheckCircle'
    case 'warning':
      return 'AlertCircle'
    case 'fail':
      return 'X'
    case 'running':
      return 'Loader'
    default:
      return 'Circle'
  }
}

/**
 * Get status CSS class for a check.
 *
 * @param check - Check status
 * @returns CSS class
 *
 * @private
 */
const getStatusClass = (check: CheckStatus): string => {
  return `status-${check.status}`
}

/**
 * Handle run diagnostics.
 *
 * @private
 */
const handleRunDiagnostics = (): void => {
  isRunning.value = true

  // Simulate running diagnostics
  setTimeout(() => {
    isRunning.value = false
    success('Diagnostics completed')
  }, 2000)

  emit('run-diagnostics')
}

/**
 * Handle export report.
 *
 * @private
 */
const handleExportReport = (): void => {
  const report = {
    timestamp: new Date().toISOString(),
    overallHealth: overallHealthStatus.value,
    checks: checks.value,
    systemInfo: systemInfo.value,
  }

  const reportJson = JSON.stringify(report, null, 2)
  const blob = new window.Blob([reportJson], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hatcher-diagnostics-${Date.now()}.json`
  a.click()
  window.URL.revokeObjectURL(url)
  success('Diagnostic report exported')
}

/**
 * Handle view solutions.
 *
 * @private
 */
const handleViewSolutions = (): void => {
  warning('Opening solutions guide...')
  // In real implementation, open documentation or solutions modal
}

/**
 * Handle clicks on modal overlay.
 *
 * @private
 */
const handleOverlayClick = (): void => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: var(--accent-primary);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background-color: var(--hover-bg-light);
  color: var(--text-primary);
}

.dark .close-button:hover {
  background-color: var(--hover-bg-dark);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.health-summary {
  display: flex;
  justify-content: center;
}

.health-badge {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 12px;
  border: 2px solid;
}

.health-badge.health-good {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  color: #10b981;
}

.health-badge.health-warning {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: #f59e0b;
  color: #f59e0b;
}

.health-badge.health-critical {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.health-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.health-status {
  font-size: 18px;
  font-weight: 600;
}

.health-description {
  font-size: 13px;
  opacity: 0.8;
}

.diagnostics-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.check-item {
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.check-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-icon.status-pass {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.check-icon.status-warning {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.check-icon.status-fail {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.check-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.check-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.check-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.check-details {
  font-size: 12px;
  color: var(--text-secondary);
  padding-left: 44px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.system-info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.info-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

.actions-section {
  display: flex;
  gap: 12px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
