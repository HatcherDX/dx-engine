/* eslint-env browser */
/* eslint-disable no-undef */

// Terminal Debug Script
// Ejecutar en la consola del navegador para diagnosticar problemas del terminal

console.log('🔍 INICIANDO DIAGNÓSTICO DEL TERMINAL...')

// 1. Verificar presencia del GlobalTerminalFooter
const footer = document.querySelector('.global-terminal-footer')
console.log('1. GlobalTerminalFooter encontrado:', !!footer)
if (footer) {
  console.log('   - Estado expandido:', footer.classList.contains('expanded'))
  console.log('   - Estado colapsado:', footer.classList.contains('collapsed'))
  console.log('   - Altura actual:', footer.style.height)
}

// 2. Verificar TerminalPanel
const terminalPanel = document.querySelector('.terminal-panel')
console.log('2. TerminalPanel encontrado:', !!terminalPanel)
if (terminalPanel) {
  console.log('   - Display:', getComputedStyle(terminalPanel).display)
  console.log('   - Visibility:', getComputedStyle(terminalPanel).visibility)
}

// 3. Verificar TerminalView
const terminalView = document.querySelector('.terminal-view')
console.log('3. TerminalView encontrado:', !!terminalView)
if (terminalView) {
  console.log('   - Display:', getComputedStyle(terminalView).display)
  console.log('   - Visibility:', getComputedStyle(terminalView).visibility)
  console.log('   - Opacity:', getComputedStyle(terminalView).opacity)
}

// 4. Verificar XTerm container
const xtermTerminal = document.querySelector('.xterm')
console.log('4. XTerm terminal encontrado:', !!xtermTerminal)
if (xtermTerminal) {
  console.log('   - Display:', getComputedStyle(xtermTerminal).display)
  console.log('   - Visibility:', getComputedStyle(xtermTerminal).visibility)
  console.log('   - Opacity:', getComputedStyle(xtermTerminal).opacity)
  console.log('   - Width:', getComputedStyle(xtermTerminal).width)
  console.log('   - Height:', getComputedStyle(xtermTerminal).height)
}

// 5. Verificar layers de XTerm
const xtermScreen = document.querySelector('.xterm-screen')
const xtermTextLayer = document.querySelector('.xterm-text-layer')
const xtermViewport = document.querySelector('.xterm-viewport')

console.log('5. XTerm layers:')
console.log('   - Screen:', !!xtermScreen)
if (xtermScreen) {
  console.log('     - Display:', getComputedStyle(xtermScreen).display)
  console.log('     - Position:', getComputedStyle(xtermScreen).position)
  console.log('     - Z-index:', getComputedStyle(xtermScreen).zIndex)
}

console.log('   - Text Layer:', !!xtermTextLayer)
if (xtermTextLayer) {
  console.log('     - Display:', getComputedStyle(xtermTextLayer).display)
  console.log('     - Visibility:', getComputedStyle(xtermTextLayer).visibility)
  console.log('     - Opacity:', getComputedStyle(xtermTextLayer).opacity)
  console.log('     - Z-index:', getComputedStyle(xtermTextLayer).zIndex)
  console.log('     - Color:', getComputedStyle(xtermTextLayer).color)

  // Verificar si hay texto en el text layer
  const textSpans = xtermTextLayer.querySelectorAll('span')
  console.log('     - Cantidad de spans con texto:', textSpans.length)
  if (textSpans.length > 0) {
    const firstSpan = textSpans[0]
    console.log('     - Primer span color:', getComputedStyle(firstSpan).color)
    console.log('     - Primer span contenido:', firstSpan.textContent)
    console.log(
      '     - Primer span visible:',
      getComputedStyle(firstSpan).visibility
    )
    console.log(
      '     - Primer span opacity:',
      getComputedStyle(firstSpan).opacity
    )
  }
}

console.log('   - Viewport:', !!xtermViewport)
if (xtermViewport) {
  console.log('     - Display:', getComputedStyle(xtermViewport).display)
  console.log('     - Overflow:', getComputedStyle(xtermViewport).overflow)
  console.log(
    '     - Background:',
    getComputedStyle(xtermViewport).backgroundColor
  )
}

// 6. Verificar overlay de focus
const focusOverlay = document.querySelector('.terminal-focus-overlay')
console.log('6. Focus overlay encontrado:', !!focusOverlay)
if (focusOverlay) {
  console.log('   - Display:', getComputedStyle(focusOverlay).display)
  console.log('   - Z-index:', getComputedStyle(focusOverlay).zIndex)
  console.log(
    '   - Background:',
    getComputedStyle(focusOverlay).backgroundColor
  )
}

// 7. Verificar loading state
const loadingIndicator = document.querySelector('.terminal-loading')
console.log(
  '7. Loading indicator visible:',
  !!loadingIndicator && getComputedStyle(loadingIndicator).display !== 'none'
)

// 8. Verificar estado de Vue y electronAPI
console.log('8. Estado global:')
console.log('   - window.electronAPI:', !!window.electronAPI)
if (window.electronAPI) {
  console.log('   - electronAPI.on:', typeof window.electronAPI.on)
  console.log('   - electronAPI.send:', typeof window.electronAPI.send)
  console.log(
    '   - electronAPI.sendTerminalInput:',
    typeof window.electronAPI.sendTerminalInput
  )
}

// 9. Verificar si hay instancia de terminal global
console.log('9. Verificando referencias globales...')
if (window.Vue) {
  console.log('   - Vue está disponible')
}

// 10. Sugerencias de acciones
console.log('\n💡 SUGERENCIAS DE DIAGNÓSTICO:')

if (!footer || !footer.classList.contains('expanded')) {
  console.log(
    '❗ El terminal footer no está expandido. Intentar expandir con Ctrl/Cmd + `'
  )
}

if (xtermTextLayer && xtermTextLayer.querySelectorAll('span').length === 0) {
  console.log(
    '❗ No hay contenido de texto en el terminal. Verificar recepción de datos.'
  )
}

if (focusOverlay && getComputedStyle(focusOverlay).display !== 'none') {
  console.log(
    '❗ El overlay de focus está activo. El terminal puede necesitar ser activado.'
  )
}

if (loadingIndicator && getComputedStyle(loadingIndicator).display !== 'none') {
  console.log('❗ El terminal aún está en estado de carga.')
}

console.log('\n✅ Diagnóstico completado. Revisa los resultados arriba.')
