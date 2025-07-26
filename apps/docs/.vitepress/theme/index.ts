// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import HeroLogo from './components/HeroLogo.vue'
import './localization-fixes.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'home-hero-image': () => h(HeroLogo),
    })
  },
  enhanceApp({ app }) {
    app.component('HeroLogo', HeroLogo)
  },
} satisfies Theme
