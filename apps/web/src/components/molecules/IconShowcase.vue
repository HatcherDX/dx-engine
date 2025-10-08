<template>
  <div class="icon-showcase">
    <h2 class="showcase-title">Hatcher Luxury Icon System</h2>

    <!-- Icon Sizes -->
    <section class="showcase-section">
      <h3>Icon Sizes</h3>
      <div class="icon-row">
        <div class="icon-item">
          <Terminal class="icon-xs" />
          <span>xs</span>
        </div>
        <div class="icon-item">
          <Terminal class="icon-sm" />
          <span>sm</span>
        </div>
        <div class="icon-item">
          <Terminal class="icon-md" />
          <span>md</span>
        </div>
        <div class="icon-item">
          <Terminal class="icon-lg" />
          <span>lg</span>
        </div>
        <div class="icon-item">
          <Terminal class="icon-xl" />
          <span>xl</span>
        </div>
      </div>
    </section>

    <!-- Icon Colors -->
    <section class="showcase-section">
      <h3>Icon Colors</h3>
      <div class="icon-row">
        <div class="icon-item">
          <GitBranch class="icon-md icon-primary" />
          <span>Primary</span>
        </div>
        <div class="icon-item">
          <Settings class="icon-md icon-secondary" />
          <span>Secondary</span>
        </div>
        <div class="icon-item">
          <Code class="icon-md icon-accent" />
          <span>Accent</span>
        </div>
        <div class="icon-item">
          <Check class="icon-md icon-success" />
          <span>Success</span>
        </div>
        <div class="icon-item">
          <Shield class="icon-md icon-warning" />
          <span>Warning</span>
        </div>
        <div class="icon-item">
          <X class="icon-md icon-danger" />
          <span>Danger</span>
        </div>
      </div>
    </section>

    <!-- Luxury Styles -->
    <section class="showcase-section">
      <h3>Luxury Styles</h3>
      <div class="icon-row">
        <button class="icon-button">
          <Menu class="icon-md" />
        </button>

        <button class="icon-button icon-luxury">
          <Settings class="icon-md" />
        </button>

        <div class="icon-glass">
          <Terminal class="icon-md icon-accent" />
        </div>

        <div class="icon-badge">
          <Bell class="icon-md" />
        </div>
      </div>
    </section>

    <!-- Hover Effects -->
    <section class="showcase-section">
      <h3>Hover Effects</h3>
      <div class="icon-row">
        <div class="icon-item">
          <Home class="icon-md icon-hover-accent" />
          <span>Accent</span>
        </div>
        <div class="icon-item">
          <Rocket class="icon-md icon-hover-lift" />
          <span>Lift</span>
        </div>
        <div class="icon-item">
          <Settings class="icon-md icon-hover-rotate" />
          <span>Rotate</span>
        </div>
        <div class="icon-item">
          <Target class="icon-md icon-hover-scale" />
          <span>Scale</span>
        </div>
      </div>
    </section>

    <!-- Animations -->
    <section class="showcase-section">
      <h3>Animations</h3>
      <div class="icon-row">
        <div class="icon-item">
          <Loader class="icon-md icon-spin" />
          <span>Spin</span>
        </div>
        <div class="icon-item">
          <Activity class="icon-md icon-pulse" />
          <span>Pulse</span>
        </div>
        <div class="icon-item">
          <Clock class="icon-md icon-bounce" />
          <span>Bounce</span>
        </div>
      </div>
    </section>

    <!-- Icon with Text -->
    <section class="showcase-section">
      <h3>Icon with Text</h3>
      <div class="icon-examples">
        <div class="icon-text">
          <Terminal class="icon-sm icon-accent" />
          <span>Open Terminal</span>
        </div>

        <button class="luxury-button">
          <GitBranch class="icon-sm" />
          <span>Switch Branch</span>
        </button>

        <div class="icon-text icon-text-lg">
          <Rocket class="icon-lg icon-accent" />
          <span>Launch Project</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Terminal,
  GitBranch,
  Settings,
  Code,
  Check,
  Shield,
  X,
  Menu,
  Home,
  Rocket,
  Target,
  Loader,
  Activity,
  Clock,
  Bell,
} from '../atoms/icons'
</script>

<style scoped>
.icon-showcase {
  padding: 2rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.showcase-title {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 2rem;
  color: var(--accent-primary);
}

.showcase-section {
  margin-bottom: 3rem;
}

.showcase-section h3 {
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.icon-row {
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.icon-item span {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.icon-examples {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: flex-start;
}

.luxury-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(
    135deg,
    var(--accent-primary) 0%,
    transparent 100%
  );
  border: 1px solid var(--accent-primary);
  border-radius: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.luxury-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(223, 169, 39, 0.3);
  background: var(--accent-primary);
  color: #000000;
}

.luxury-button svg {
  transition: transform 0.3s ease;
}

.luxury-button:hover svg {
  transform: rotate(15deg);
}

/* Import Bell icon if not already imported */
.icon-badge::after {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
