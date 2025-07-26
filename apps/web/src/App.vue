<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(async () => {
  console.log('Hatcher DX Engine initialized')
})
</script>

<template>
  <div class="app-container">
    <div class="logo-container">
      <img src="/logo-dark.svg" class="logo" alt="DX Engine" />
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
}

.app-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: #1e1e1e;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.logo-container {
  text-align: center;
  animation: fadeIn 0.8s ease-out;
}

.logo {
  width: 200px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  transition:
    transform 0.2s ease,
    filter 0.2s ease;
}

.logo:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4));
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
