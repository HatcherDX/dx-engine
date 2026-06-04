<!--
/**
 * @fileoverview Usage and plan limits panel modal for AI quota tracking.
 *
 * @description
 * Modal displaying API usage quotas, plan limits, rate limiting, and
 * subscription information. Helps users understand their current usage
 * against account limits.
 *
 * @example
 * <UsagePanelModal
 *   :visible="showUsage"
 *   @close="showUsage = false"
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
          <BaseIcon name="TrendingUp" size="md" class="header-icon" />
          <h2 class="modal-title">Usage & Plan Limits</h2>
        </div>
        <button class="close-button" aria-label="Close" @click="$emit('close')">
          <BaseIcon name="X" size="sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Plan Summary -->
        <div class="plan-card">
          <div class="plan-header">
            <div class="plan-info">
              <BaseIcon name="Award" size="md" />
              <div>
                <h3 class="plan-name">{{ currentPlan }}</h3>
                <p class="plan-period">{{ billingPeriod }}</p>
              </div>
            </div>
            <div class="plan-status" :class="statusClass">
              {{ statusText }}
            </div>
          </div>
        </div>

        <!-- Usage Meters -->
        <div class="usage-section">
          <h3 class="section-title">Current Usage</h3>

          <!-- API Calls Quota -->
          <div class="usage-meter">
            <div class="meter-header">
              <div class="meter-label">
                <BaseIcon name="Zap" size="sm" />
                <span>API Calls</span>
              </div>
              <div class="meter-value">
                {{ formatNumber(usageData.apiCalls) }} /
                {{ formatNumber(limits.apiCalls) }}
              </div>
            </div>
            <div class="meter-bar">
              <div
                class="meter-fill"
                :style="{ width: `${apiCallsPercentage}%` }"
                :class="getMeterClass(apiCallsPercentage)"
              ></div>
            </div>
            <div class="meter-footer">
              <span>{{ apiCallsPercentage.toFixed(1) }}% used</span>
              <span class="meter-remaining"
                >{{
                  formatNumber(limits.apiCalls - usageData.apiCalls)
                }}
                remaining</span
              >
            </div>
          </div>

          <!-- Token Quota -->
          <div class="usage-meter">
            <div class="meter-header">
              <div class="meter-label">
                <BaseIcon name="FileText" size="sm" />
                <span>Tokens</span>
              </div>
              <div class="meter-value">
                {{ formatNumber(usageData.totalTokens) }} /
                {{ formatNumber(limits.totalTokens) }}
              </div>
            </div>
            <div class="meter-bar">
              <div
                class="meter-fill"
                :style="{ width: `${tokensPercentage}%` }"
                :class="getMeterClass(tokensPercentage)"
              ></div>
            </div>
            <div class="meter-footer">
              <span>{{ tokensPercentage.toFixed(1) }}% used</span>
              <span class="meter-remaining"
                >{{
                  formatNumber(limits.totalTokens - usageData.totalTokens)
                }}
                remaining</span
              >
            </div>
          </div>

          <!-- Rate Limit -->
          <div class="usage-meter">
            <div class="meter-header">
              <div class="meter-label">
                <BaseIcon name="Clock" size="sm" />
                <span>Rate Limit (per minute)</span>
              </div>
              <div class="meter-value">
                {{ usageData.requestsThisMinute }} /
                {{ limits.requestsPerMinute }}
              </div>
            </div>
            <div class="meter-bar">
              <div
                class="meter-fill"
                :style="{ width: `${rateLimitPercentage}%` }"
                :class="getMeterClass(rateLimitPercentage)"
              ></div>
            </div>
            <div class="meter-footer">
              <span>{{ rateLimitPercentage.toFixed(1) }}% used</span>
              <span class="meter-info">Resets in {{ resetTime }}</span>
            </div>
          </div>
        </div>

        <!-- Plan Features -->
        <div class="features-section">
          <h3 class="section-title">Plan Features</h3>
          <div class="features-grid">
            <div
              v-for="feature in planFeatures"
              :key="feature.name"
              class="feature-item"
            >
              <BaseIcon
                :name="feature.enabled ? 'CheckCircle' : 'XCircle'"
                size="sm"
                :class="feature.enabled ? 'icon-enabled' : 'icon-disabled'"
              />
              <span>{{ feature.name }}</span>
            </div>
          </div>
        </div>

        <!-- Billing Info -->
        <div class="info-section">
          <div class="info-item">
            <BaseIcon name="Calendar" size="xs" />
            <span>Billing period: {{ billingStart }} - {{ billingEnd }}</span>
          </div>
          <div class="info-item">
            <BaseIcon name="RefreshCw" size="xs" />
            <span>Quota resets on {{ resetDate }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <BaseButton variant="ghost" size="sm" @click="handleUpgrade">
          <BaseIcon name="TrendingUp" size="xs" />
          Upgrade Plan
        </BaseButton>
        <BaseButton variant="primary" @click="$emit('close')">
          Close
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseButton from '../atoms/BaseButton.vue'
import { useAIMetrics } from '../../composables/useAIMetrics'
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
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const { metrics } = useAIMetrics()
const { info } = useNotifications()

// Simulated plan data (in real app, fetch from API)
const currentPlan = ref('Professional')
const billingPeriod = ref('Monthly')

/**
 * Usage limits based on plan.
 *
 * @private
 */
const limits = ref({
  apiCalls: 10000,
  totalTokens: 5000000,
  requestsPerMinute: 60,
})

/**
 * Current usage data.
 *
 * @private
 */
const usageData = computed(() => ({
  apiCalls: metrics.value.totalCalls,
  totalTokens: metrics.value.inputTokens + metrics.value.outputTokens,
  requestsThisMinute: 12, // Simulated
}))

/**
 * API calls usage percentage.
 *
 * @private
 */
const apiCallsPercentage = computed(() => {
  return Math.min((usageData.value.apiCalls / limits.value.apiCalls) * 100, 100)
})

/**
 * Tokens usage percentage.
 *
 * @private
 */
const tokensPercentage = computed(() => {
  return Math.min(
    (usageData.value.totalTokens / limits.value.totalTokens) * 100,
    100
  )
})

/**
 * Rate limit usage percentage.
 *
 * @private
 */
const rateLimitPercentage = computed(() => {
  return Math.min(
    (usageData.value.requestsThisMinute / limits.value.requestsPerMinute) * 100,
    100
  )
})

/**
 * Account status class.
 *
 * @private
 */
const statusClass = computed(() => {
  const maxPercentage = Math.max(
    apiCallsPercentage.value,
    tokensPercentage.value
  )

  if (maxPercentage >= 90) return 'status-critical'
  if (maxPercentage >= 70) return 'status-warning'
  return 'status-good'
})

/**
 * Status text.
 *
 * @private
 */
const statusText = computed(() => {
  const maxPercentage = Math.max(
    apiCallsPercentage.value,
    tokensPercentage.value
  )

  if (maxPercentage >= 90) return 'Near Limit'
  if (maxPercentage >= 70) return 'Moderate Usage'
  return 'Active'
})

/**
 * Plan features.
 *
 * @private
 */
const planFeatures = ref([
  { name: 'Claude Sonnet 4 Access', enabled: true },
  { name: 'Claude Opus 4 Access', enabled: true },
  { name: 'Extended Context (200k)', enabled: true },
  { name: 'Priority Support', enabled: true },
  { name: 'Advanced Analytics', enabled: false },
  { name: 'Custom Models', enabled: false },
])

/**
 * Billing period dates.
 *
 * @private
 */
const billingStart = computed(() => {
  const date = new Date(metrics.value.lastReset)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const billingEnd = computed(() => {
  const date = new Date(metrics.value.lastReset)
  date.setMonth(date.getMonth() + 1)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const resetDate = computed(() => {
  const date = new Date(metrics.value.lastReset)
  date.setMonth(date.getMonth() + 1)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})

/**
 * Time until rate limit reset.
 *
 * @private
 */
const resetTime = ref('45s')

/**
 * Get meter color class based on percentage.
 *
 * @param percentage - Usage percentage
 * @returns CSS class name
 *
 * @private
 */
const getMeterClass = (percentage: number): string => {
  if (percentage >= 90) return 'critical'
  if (percentage >= 70) return 'warning'
  return 'normal'
}

/**
 * Format number with commas.
 *
 * @param num - Number to format
 * @returns Formatted string
 *
 * @private
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

/**
 * Handle upgrade button click.
 *
 * @private
 */
const handleUpgrade = (): void => {
  info('Plan upgrades coming soon!')
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
  width: 650px;
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

/* Plan Card */
.plan-card {
  padding: 20px;
  background: linear-gradient(
    135deg,
    rgba(168, 85, 247, 0.1) 0%,
    rgba(168, 85, 247, 0.05) 100%
  );
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 12px;
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plan-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--accent-primary);
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.plan-period {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.plan-status {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-good {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-warning {
  background-color: rgba(251, 146, 60, 0.1);
  color: #fb923c;
}

.status-critical {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Usage Section */
.usage-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.usage-meter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.meter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.meter-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.meter-bar {
  width: 100%;
  height: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.meter-fill.normal {
  background: linear-gradient(90deg, #22c55e 0%, #10b981 100%);
}

.meter-fill.warning {
  background: linear-gradient(90deg, #fb923c 0%, #f59e0b 100%);
}

.meter-fill.critical {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
}

.meter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.meter-remaining,
.meter-info {
  font-weight: 500;
}

/* Features Section */
.features-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.icon-enabled {
  color: #22c55e;
}

.icon-disabled {
  color: var(--text-secondary);
  opacity: 0.5;
}

/* Info Section */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: rgba(14, 165, 233, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}
</style>
