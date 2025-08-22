# Icon Testing Guide - Preventing Regressions

## Overview

This guide provides comprehensive instructions for maintaining icon component tests and preventing future regressions in the DX Engine project.

## Critical Rules

### 🚨 NEVER Delete Working Icon Components

**DO NOT delete icon components without first verifying they are truly unused.**

- ❌ **WRONG**: Deleting `Minus.vue` because it "looks unused"
- ✅ **CORRECT**: Search entire codebase for usage before considering deletion

### 🔍 How to Verify Icon Usage

Before deleting any icon component, run these verification steps:

```bash
# Search for icon usage in Vue templates
grep -r "Minus" apps/web/src/components/ --include="*.vue"

# Search for dynamic icon references
grep -r "'Minus'" apps/web/src/ --include="*.ts" --include="*.vue"

# Search for icon imports
grep -r "import.*Minus" apps/web/src/ --include="*.ts" --include="*.vue"

# Check TimelineSidebar specifically (common usage location)
grep -A 5 -B 5 "deleted.*:" apps/web/src/components/organisms/TimelineSidebar.vue
```

### 📁 Icon File Structure Requirements

All icon components MUST have this structure:

```vue
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- SVG content -->
  </svg>
</template>

<script setup lang="ts">
/**
 * [IconName] icon component for [purpose description].
 *
 * @remarks
 * Used for [specific use cases] throughout the application interface.
 *
 * @public
 * @since 1.0.0
 */
defineOptions({
  name: '[IconName]Icon',
})
</script>
```

## Test File Management

### ✅ Correct Test Structure

Use **ONE** comprehensive test file: `all-icons.spec.ts`

```typescript
// ✅ CORRECT: Single comprehensive test file
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

// Import ALL icons
import Circle from './Circle.vue'
import Eye from './Eye.vue'
// ... etc

const iconComponents = [
  { name: 'Circle', component: Circle },
  { name: 'Eye', component: Eye },
  // ... etc
]

describe('Icon Components', () => {
  iconComponents.forEach(({ name, component }) => {
    it(`should render ${name} icon correctly`, () => {
      const wrapper = mount(component)
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.vm.$options.name).toMatch(/Icon$/)
    })
  })
})
```

### ❌ Avoid Multiple Test Files

**DO NOT create multiple test files for the same icons:**

```bash
# ❌ WRONG: Multiple redundant test files cause conflicts
icons.simple.spec.ts
remaining-icons.spec.ts
missing-icons.spec.ts
all-icons.spec.ts
```

This causes Istanbul coverage conflicts where only one test execution gets recorded.

## Timeout Prevention

### Vitest Configuration

Ensure `vitest.config.ts` has proper timeout settings:

```typescript
export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 10000,

    // Use forks for process isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        isolate: true,
        singleFork: false,
      },
    },
  },
})
```

### Test Performance Guidelines

- ❌ **AVOID**: Strict timing assertions in tests
- ❌ **AVOID**: `performance.now()` comparisons with hard limits
- ✅ **USE**: Functional assertions that verify behavior, not timing

```typescript
// ❌ WRONG: Timing-based test that can timeout
it('should render icons efficiently', () => {
  const startTime = performance.now()
  // ... render icons
  const endTime = performance.now()
  expect(endTime - startTime).toBeLessThan(100) // Can timeout!
})

// ✅ CORRECT: Functional test
it('should render icons efficiently', () => {
  iconComponents.forEach(({ component }) => {
    const wrapper = mount(component)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('svg').exists()).toBe(true)
    wrapper.unmount()
  })
})
```

## Coverage Requirements

### Expected Coverage Status

Some icons may persistently show 0% coverage due to Istanbul/Vue SFC processing limitations. This is acceptable as long as:

1. ✅ All tests pass
2. ✅ All icons render correctly in tests
3. ✅ All icons have proper `defineOptions` calls
4. ✅ No timeout errors occur

### Coverage Verification Commands

```bash
# Run all icon tests
pnpm -w test apps/web/src/components/atoms/icons/ --reporter=verbose

# Check specific icon test
pnpm -w test apps/web/src/components/atoms/icons/all-icons.spec.ts

# Generate coverage report
pnpm -w test apps/web/src/components/atoms/icons/
open coverage/index.html
```

## Common Issues & Solutions

### Issue: Icon Shows 0% Coverage

**Solution**: Verify the icon has a proper `<script setup>` section with `defineOptions`:

```vue
<script setup lang="ts">
defineOptions({
  name: 'IconNameIcon',
})
</script>
```

### Issue: Tests Timeout

**Solution**:

1. Remove timing-based performance tests
2. Ensure only one comprehensive test file exists
3. Check for infinite loops in component mounting

### Issue: "Unknown variable dynamic import"

**Solution**: Ensure the icon file exists and is properly imported:

```typescript
// ✅ CORRECT: Static import
import Minus from './Minus.vue'

// ❌ WRONG: Dynamic import in test context
const iconComponent = await import('./Minus.vue')
```

## Maintenance Checklist

Before making icon changes:

- [ ] Search codebase for icon usage
- [ ] Verify TimelineSidebar.vue icon mappings
- [ ] Run icon tests: `pnpm -w test apps/web/src/components/atoms/icons/`
- [ ] Check coverage report for regressions
- [ ] Ensure all tests pass without timeouts
- [ ] Verify no linting errors: `pnpm lint`

## Emergency Recovery

If icon tests are broken:

1. **Restore missing icons**: Check git history for deleted files
2. **Reset test files**: Keep only `all-icons.spec.ts` and `coverage-trigger.spec.ts`
3. **Verify imports**: Ensure all icons are imported in test files
4. **Run validation**: `pnpm -w test apps/web/src/components/atoms/icons/`

## Contact

For icon testing issues, refer to:

- Context7 Vitest documentation for timeout patterns
- Vue Test Utils documentation for component testing
- Istanbul coverage documentation for SFC limitations

---

**Remember**: Icon components are critical UI elements. Always verify usage before deletion and maintain comprehensive test coverage to prevent visual regressions.
