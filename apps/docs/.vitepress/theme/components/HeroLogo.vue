<template>
  <div class="hero-logo-container">
    <!-- Logo principal (redondo) para pantallas pequeñas - centrado -->
    <img
      v-if="isDark && !isLargeScreen"
      src="/logo-hero-dark.svg"
      alt="Hatcher DX Engine"
      class="hero-logo-main"
    />
    <img
      v-else-if="!isDark && !isLargeScreen"
      src="/logo-hero-light.svg"
      alt="Hatcher DX Engine"
      class="hero-logo-main"
    />

    <!-- Logo inline para pantallas grandes - alineado a la izquierda -->
    <img
      v-else-if="isDark && isLargeScreen"
      src="/logo-inline-dark.svg"
      alt="Hatcher DX Engine"
      class="hero-logo-inline"
    />
    <img
      v-else
      src="/logo-inline-light.svg"
      alt="Hatcher DX Engine"
      class="hero-logo-inline"
    />
  </div>
</template>

<script setup lang="ts">
import { useData } from 'vitepress'
import { ref, onMounted, onUnmounted } from 'vue'

const { isDark } = useData()
const isLargeScreen = ref(false)

const checkScreenSize = () => {
  isLargeScreen.value = window.innerWidth >= 960
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style scoped>
.hero-logo-container {
  display: flex;
  align-items: center;
  width: 100%;
}

/* Logo principal (redondo) para pantallas pequeñas - centrado */
.hero-logo-main {
  width: 300px;
  max-width: 80vw;
  height: auto;
  margin: 0 auto;
}

/* Logo inline para pantallas grandes - ocupando todo el espacio disponible */
.hero-logo-inline {
  width: 100%;
  max-width: 500px;
  height: auto;
  margin: 0;
}

/* En pantallas grandes, logo inline a la izquierda */
@media (min-width: 960px) {
  .hero-logo-inline {
    max-width: 400px;
  }
}

@media (max-width: 480px) {
  .hero-logo-main {
    width: 200px;
  }
}
</style>
