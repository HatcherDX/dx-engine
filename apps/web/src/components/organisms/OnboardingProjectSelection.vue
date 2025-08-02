<template>
  <div class="onboarding-project-selection">
    <div class="project-container">
      <div class="project-content">
        <!-- Grid Layout -->
        <div class="content-grid">
          <!-- Top Row: Logo + Start a Project | Recent Projects -->
          <div class="top-row">
            <!-- Left: Logo + Start a Project -->
            <div class="left-column">
              <!-- Logo Section -->
              <div class="logo-section">
                <BaseLogo size="lg" variant="inline" />
              </div>

              <!-- Start a Project Section -->
              <div class="actions-section">
                <h2 class="section-title">Start a Project</h2>
                <div class="action-buttons">
                  <!-- Open Project button -->
                  <BaseButton
                    variant="outline"
                    size="lg"
                    class="action-button"
                    @click="handleOpenProject"
                  >
                    📂 Open Project...
                  </BaseButton>

                  <!-- Disabled buttons with tooltips -->
                  <div class="disabled-button-wrapper" title="Coming soon">
                    <BaseButton
                      variant="outline"
                      size="lg"
                      class="action-button disabled-action"
                      disabled
                    >
                      + New Project
                    </BaseButton>
                  </div>

                  <div class="disabled-button-wrapper" title="Coming soon">
                    <BaseButton
                      variant="outline"
                      size="lg"
                      class="action-button disabled-action"
                      disabled
                    >
                      🌐 Clone from Git...
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Recent Projects -->
            <div class="right-column">
              <div class="recent-section">
                <h2 class="section-title">Recent Projects</h2>
                <div class="recent-projects">
                  <div class="project-item" @click="handleProjectSelect">
                    <div class="project-left">
                      <div class="project-icon">📁</div>
                      <div class="project-info">
                        <h3 class="project-name">E-commerce Dashboard</h3>
                        <p class="project-path">
                          {{
                            truncatePath(
                              '/Users/chris/Projects/ecommerce-dashboard',
                              250
                            )
                          }}
                        </p>
                      </div>
                    </div>
                    <BaseIcon
                      name="ArrowRight"
                      size="sm"
                      class="project-arrow"
                    />
                  </div>
                  <div class="project-item" @click="handleProjectSelect">
                    <div class="project-left">
                      <div class="project-icon">📁</div>
                      <div class="project-info">
                        <h3 class="project-name">React Component Library</h3>
                        <p class="project-path">
                          {{
                            truncatePath(
                              '/Users/chris/Sites/ui-components',
                              250
                            )
                          }}
                        </p>
                      </div>
                    </div>
                    <BaseIcon
                      name="ArrowRight"
                      size="sm"
                      class="project-arrow"
                    />
                  </div>
                  <div class="project-item" @click="handleProjectSelect">
                    <div class="project-left">
                      <div class="project-icon">📁</div>
                      <div class="project-info">
                        <h3 class="project-name">Mobile App Backend</h3>
                        <p class="project-path">
                          {{
                            truncatePath(
                              '/Users/chris/Development/mobile-api',
                              250
                            )
                          }}
                        </p>
                      </div>
                    </div>
                    <BaseIcon
                      name="ArrowRight"
                      size="sm"
                      class="project-arrow"
                    />
                  </div>
                  <div class="project-item" @click="handleProjectSelect">
                    <div class="project-left">
                      <div class="project-icon">📁</div>
                      <div class="project-info">
                        <h3 class="project-name">Portfolio Website</h3>
                        <p class="project-path">
                          {{
                            truncatePath('/Users/chris/Sites/portfolio-v2', 250)
                          }}
                        </p>
                      </div>
                    </div>
                    <BaseIcon
                      name="ArrowRight"
                      size="sm"
                      class="project-arrow"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Row: Learn & Discover (full width) -->
          <div class="bottom-row">
            <div class="learn-section">
              <h2 class="section-title">Learn & Discover</h2>
              <div class="learn-cards">
                <div class="learn-card disabled-card" title="Coming soon">
                  <div class="card-icon">📚</div>
                  <h3 class="card-title">Getting Started Guide</h3>
                  <p class="card-description">
                    Learn the basics of Controlled Amplification
                  </p>
                </div>
                <div class="learn-card disabled-card" title="Coming soon">
                  <div class="card-icon">🎥</div>
                  <h3 class="card-title">Video Tutorials</h3>
                  <p class="card-description">
                    Watch how to use Visual-to-Code bridge
                  </p>
                </div>
                <div class="learn-card disabled-card" title="Coming soon">
                  <div class="card-icon">🛠️</div>
                  <h3 class="card-title">Best Practices</h3>
                  <p class="card-description">Master advanced IDE features</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Section -->
        <div class="navigation-section">
          <BaseButton
            variant="ghost"
            size="md"
            class="back-button"
            @click="handleBack"
          >
            <BaseIcon name="ArrowRight" size="sm" class="back-icon" />
            Welcome
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOnboarding } from '../../composables/useOnboarding'
import { useSmartTruncation } from '../../composables/useSmartTruncation'
import BaseButton from '../atoms/BaseButton.vue'
import BaseIcon from '../atoms/BaseIcon.vue'
import BaseLogo from '../atoms/BaseLogo.vue'

const { nextStep, previousStep } = useOnboarding()
const { truncatePath } = useSmartTruncation()

const handleOpenProject = (): void => {
  // TODO: Implement project opening logic
  // For now, just proceed to next step
  nextStep()
}

const handleProjectSelect = (): void => {
  // Navigate to task selection when clicking on recent projects
  nextStep()
}

const handleBack = (): void => {
  previousStep()
}
</script>

<style scoped>
.onboarding-project-selection {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 100%
  );
  padding: 24px;
}

.project-container {
  max-width: 900px;
  width: 100%;
  animation: fade-in-up 0.8s ease-out;
}

.project-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.dark .project-content {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.project-header {
  text-align: center;
  margin-bottom: 40px;
}

.project-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.project-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.5;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

/* Grid Layout */
.content-grid {
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin-bottom: 40px;
}

.top-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 40px;
}

.bottom-row {
  width: 100%;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* Logo Section */
.logo-section {
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo-section img {
  width: 180px;
  height: auto;
}

.right-column {
  display: flex;
  flex-direction: column;
}

/* Recent Projects */
.recent-section {
}

.recent-projects {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.project-item:hover {
  background-color: var(--hover-bg-light);
  border-color: var(--accent-primary);
}

.project-item:hover .project-arrow {
  opacity: 1;
  color: var(--accent-primary);
}

.dark .project-item:hover {
  background-color: var(--hover-bg-dark);
}

.project-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.project-icon {
  font-size: 24px;
  margin-right: 16px;
}

.project-info {
  flex: 1;
}

.project-arrow {
  color: var(--text-tertiary);
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.project-path {
  font-size: 14px;
  color: var(--text-tertiary);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

/* Action Buttons */
.actions-section {
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  width: 100%;
  justify-content: flex-start;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.action-button:hover:not(.disabled-action) {
  background-color: var(--hover-bg-light);
  border-color: var(--accent-primary);
}

.dark .action-button:hover:not(.disabled-action) {
  background-color: var(--hover-bg-dark);
}

.disabled-button-wrapper {
  position: relative;
  cursor: not-allowed;
}

.disabled-action {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled-action:hover {
  transform: none;
  box-shadow: none;
}

/* Learn & Discover */
.learn-section {
  opacity: 0.7;
}

.learn-section .section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.learn-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.learn-card {
  padding: 16px;
  background-color: transparent;
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  transition: all var(--transition-fast);
  text-align: center;
}

.disabled-card {
  opacity: 0.6;
  cursor: not-allowed;
}

.disabled-card:hover {
  transform: none;
  box-shadow: none;
  background-color: transparent;
  opacity: 0.6;
  cursor: not-allowed;
}

.card-icon {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.7;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.card-description {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

/* Navigation */
.navigation-section {
  display: flex;
  justify-content: flex-start;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.back-icon {
  transform: rotate(180deg);
}

/* Animations */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .onboarding-project-selection {
    padding: 16px;
  }

  .project-content {
    padding: 32px 24px;
  }

  .project-title {
    font-size: 24px;
  }

  .project-subtitle {
    font-size: 15px;
  }

  .top-row {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .left-column {
    gap: 32px;
  }

  .learn-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .project-content {
    padding: 24px 20px;
  }

  .project-title {
    font-size: 22px;
  }

  .project-item {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}
</style>
