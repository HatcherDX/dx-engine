# Hatcher Icon System

## Design Philosophy

The Hatcher icon system follows a **luxury minimalist** design approach:

- **Single Color**: All icons use a single color (no multi-color icons)
- **Flat Design**: No 3D effects or gradients
- **Minimalist**: Simple, clean lines with reduced detail
- **Consistent Stroke**: 1.5px stroke width for all icons
- **Professional**: Elegant and sophisticated appearance

## Usage

### Basic Usage

```vue
<template>
  <GitBranch />
  <Terminal :size="32" />
  <Settings :color="var(--accent-primary)" />
</template>

<script setup>
import { GitBranch, Terminal, Settings } from '@/components/atoms/icons'
</script>
```

### With Icon Classes

```vue
<template>
  <!-- Size classes -->
  <GitBranch class="icon-sm" />
  <GitBranch class="icon-md" />
  <GitBranch class="icon-lg" />

  <!-- Color classes -->
  <Terminal class="icon-primary" />
  <Terminal class="icon-accent" />
  <Terminal class="icon-success" />

  <!-- Hover effects -->
  <Settings class="icon-hover-accent" />
  <Settings class="icon-hover-lift" />
  <Settings class="icon-hover-rotate" />

  <!-- Animations -->
  <Loader class="icon-spin" />
  <Heart class="icon-pulse" />
  <Bell class="icon-bounce" />
</template>
```

### Icon Button

```vue
<template>
  <button class="icon-button">
    <Menu class="icon-md" />
  </button>

  <button class="icon-button icon-luxury">
    <Settings class="icon-md" />
  </button>
</template>
```

### Icon with Text

```vue
<template>
  <div class="icon-text">
    <Terminal class="icon-sm" />
    <span>Open Terminal</span>
  </div>
</template>
```

## Color System

The icon colors automatically adapt to the theme:

### Light Theme

- **Primary**: `#0f172a` (dark slate)
- **Secondary**: `#475569` (medium gray)
- **Tertiary**: `#64748b` (light gray)
- **Accent**: `#dfa927` (golden)

### Dark Theme

- **Primary**: `#f8fafc` (light)
- **Secondary**: `#cbd5e1` (medium light)
- **Tertiary**: `#94a3b8` (gray)
- **Accent**: `#dfa927` (golden)

## Icon Sizes

- `icon-xs`: 16px
- `icon-sm`: 20px
- `icon-md`: 24px (default)
- `icon-lg`: 32px
- `icon-xl`: 40px
- `icon-2xl`: 48px

## Creating New Icons

When creating new icons, follow these guidelines:

1. **Use IconBase**: All icons should use the `IconBase` component
2. **Stroke Width**: Use 1.5px stroke width
3. **ViewBox**: Use 24x24 viewBox
4. **Simplicity**: Keep designs minimal and clean
5. **Single Path**: Try to use single continuous paths when possible

### Example Icon Template

```vue
<template>
  <IconBase v-bind="$attrs" :stroke-width="1.5">
    <!-- Your SVG paths here -->
    <path d="M..." />
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from './IconBase.vue'

defineOptions({
  name: 'YourIconName',
  inheritAttrs: false,
})
</script>
```

## Luxury Effects

### Glass Morphism Icon

```vue
<template>
  <div class="icon-glass">
    <Terminal class="icon-md icon-accent" />
  </div>
</template>
```

### Luxury Container

```vue
<template>
  <div class="icon-luxury">
    <Settings class="icon-lg" />
  </div>
</template>
```

## Best Practices

1. **Consistency**: Always use the same icon style throughout the app
2. **Accessibility**: Icons should have proper ARIA labels when used alone
3. **Performance**: Icons are lightweight SVGs, no external fonts needed
4. **Theming**: Icons automatically adapt to light/dark themes
5. **Hover States**: Use subtle hover effects for interactive elements

## Available Icons

- **Navigation**: Menu, X, ArrowLeft, ArrowRight, ArrowDown, Home
- **Actions**: Plus, Minus, Check, Play, RotateCcw
- **Interface**: Settings, Search, Eye, Moon, Sun
- **Development**: Terminal, Code, GitBranch, Bug, TestTube
- **Files**: Folder, FolderOpen, FileText, BookOpen
- **Status**: Activity, Loader, Clock, Shield
- **Special**: Egg, Rocket, Target, Hammer
