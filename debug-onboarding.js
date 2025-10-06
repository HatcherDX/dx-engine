/* eslint-env browser */
/* eslint-disable no-undef */

// Debug script para verificar el estado del onboarding
// Ejecutar en la consola del navegador

console.log('🔍 DIAGNÓSTICO DEL ESTADO DEL ONBOARDING')

// 1. Verificar localStorage
console.log('\n1. Estado de localStorage:')
const onboardingData = localStorage.getItem('hatcher-onboarding')
if (onboardingData) {
  try {
    const parsed = JSON.parse(onboardingData)
    console.log('   - Datos encontrados:', parsed)
    console.log('   - Paso actual:', parsed.currentStep)
    console.log('   - Completado en:', parsed.completedAt)
    console.log('   - Es primera vez:', parsed.isFirstTime)
  } catch (e) {
    console.log('   - Error parseando datos:', e)
  }
} else {
  console.log('   - No hay datos de onboarding en localStorage')
}

// 2. Verificar storageAPI y workspace
console.log('\n2. Estado del workspace:')
if (window.storageAPI) {
  console.log('   - storageAPI disponible: ✅')
  window.storageAPI
    .getWorkspace()
    .then((workspace) => {
      console.log('   - Workspace encontrado:', !!workspace)
      if (workspace) {
        console.log('   - Proyecto:', workspace.project?.name)
        console.log('   - Ruta:', workspace.project?.path)
      }
    })
    .catch((err) => {
      console.log('   - Error obteniendo workspace:', err)
    })
} else {
  console.log('   - storageAPI NO disponible: ❌')
}

// 3. Verificar el DOM para elementos de onboarding
console.log('\n3. Elementos del DOM:')
const onboardingContainer = document.querySelector('.onboarding-container')
const globalTerminal = document.querySelector('.global-terminal-footer')
const unifiedFrame = document.querySelector('.unified-frame')

console.log('   - Onboarding container:', !!onboardingContainer)
console.log('   - Global terminal footer:', !!globalTerminal)
console.log('   - Unified frame:', !!unifiedFrame)

if (onboardingContainer) {
  console.log(
    '   - Onboarding visible:',
    getComputedStyle(onboardingContainer).display !== 'none'
  )
}

if (globalTerminal) {
  console.log(
    '   - Terminal visible:',
    getComputedStyle(globalTerminal).display !== 'none'
  )
  console.log(
    '   - Terminal opacity:',
    getComputedStyle(globalTerminal).opacity
  )
}

// 4. Verificar parámetros de URL
console.log('\n4. Parámetros de URL:')
const urlParams = new URLSearchParams(window.location.search)
console.log('   - forceOnboarding:', urlParams.get('forceOnboarding'))

// 5. Verificar estado reactivo de Vue (si está disponible)
console.log('\n5. Estado de Vue:')
if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('   - Vue DevTools disponible: ✅')
  console.log(
    '   - Puedes usar Vue DevTools para inspeccionar isOnboardingActive'
  )
} else {
  console.log('   - Vue DevTools NO disponible: ❌')
}

// 6. Sugerir acciones
console.log('\n💡 SUGERENCIAS:')

if (onboardingData) {
  const parsed = JSON.parse(onboardingData)
  if (parsed.completedAt) {
    console.log('✅ El onboarding ya está marcado como completado')
    if (!globalTerminal) {
      console.log(
        '❗ Pero el terminal no está en el DOM - revisar condición v-if'
      )
    }
  } else {
    console.log(
      '❗ El onboarding no está completado - el terminal no debería aparecer'
    )
    console.log(
      '   💡 Completa el onboarding o agrega ?forceOnboarding=true a la URL para reiniciarlo'
    )
  }
} else {
  console.log(
    '❗ No hay datos de onboarding - probablemente se activará automáticamente'
  )
}

// 7. Función para forzar completar onboarding
console.log('\n🛠️ FUNCIONES DE UTILIDAD:')
console.log('Para forzar completar el onboarding, ejecuta:')
console.log('forceCompleteOnboarding()')

window.forceCompleteOnboarding = function () {
  const completedState = {
    isFirstTime: false,
    currentStep: 'completed',
    selectedTask: null,
    selectedProject: null,
    selectedBranch: null,
    completedAt: new Date().toISOString(),
    isCreatingNewTask: false,
  }

  localStorage.setItem('hatcher-onboarding', JSON.stringify(completedState))
  console.log('✅ Onboarding marcado como completado')
  console.log('🔄 Recarga la página para ver los cambios')
}

// 8. Función para reiniciar onboarding
window.restartOnboarding = function () {
  localStorage.removeItem('hatcher-onboarding')
  console.log('✅ Datos de onboarding eliminados')
  console.log('🔄 Recarga la página para reiniciar el onboarding')
}

console.log('Para reiniciar el onboarding, ejecuta:')
console.log('restartOnboarding()')

console.log('\n✅ Diagnóstico completado')
