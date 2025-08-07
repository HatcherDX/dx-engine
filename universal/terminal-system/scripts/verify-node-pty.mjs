#!/usr/bin/env node

/**
 * Script para simular la creación de un terminal y verificar que node-pty funciona en Electron
 */

import { execSync } from 'node:child_process'

/**
 * Main function to verify node-pty installation and functionality
 * Exported for testing purposes
 */
export async function verifyNodePty() {
  console.log('🚀 Verificando que node-pty v1.1.0-beta34 esté instalado...')

  try {
    // Verificar que tenemos la versión correcta de node-pty
    const result = execSync(
      'cd /Users/chrissmejia/Sites/dx-engine && pnpm list node-pty',
      { encoding: 'utf-8' }
    )
    console.log('📦 Versión de node-pty instalada:')
    console.log(result)

    if (result.includes('1.1.0-beta34')) {
      console.log('✅ node-pty v1.1.0-beta34 instalado correctamente')
    } else {
      console.log('❌ Versión incorrecta de node-pty')
      if (typeof process !== 'undefined' && process.exit) {
        process.exit(1)
      }
      throw new Error('Incorrect node-pty version')
    }

    // Verificar que el archivo binario existe
    const fs = await import('node:fs')
    const path = await import('node:path')

    const ptyPaths = [
      '/Users/chrissmejia/Sites/dx-engine/node_modules/.pnpm/node-pty@1.1.0-beta34/node_modules/node-pty/build/Release/pty.node',
      '/Users/chrissmejia/Sites/dx-engine/node_modules/node-pty/build/Release/pty.node',
    ]

    let binaryExists = false
    for (const ptyPath of ptyPaths) {
      if (fs.existsSync(ptyPath)) {
        console.log(`✅ Binario node-pty encontrado en: ${ptyPath}`)
        binaryExists = true
        break
      }
    }

    if (!binaryExists) {
      console.log('❌ Binario node-pty no encontrado')
      console.log('🔨 Intentando recompilar...')

      try {
        const rebuildResult = execSync(
          'cd /Users/chrissmejia/Sites/dx-engine && pnpm rebuild node-pty',
          { encoding: 'utf-8' }
        )
        console.log('✅ Recompilación exitosa')
        console.log(rebuildResult)
      } catch (rebuildError) {
        console.log('❌ Error en recompilación:', rebuildError.message)
      }
    }

    // Test básico de import
    console.log('🧪 Probando import de node-pty...')
    const nodePty = await import('node-pty')
    console.log('✅ node-pty importado exitosamente')

    // Test de spawn básico
    console.log('🚀 Probando spawn de terminal...')
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh'
    const ptyProcess = nodePty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
    })

    console.log(`✅ Terminal spawneado exitosamente con PID: ${ptyProcess.pid}`)

    // Cleanup
    ptyProcess.kill()

    console.log('\n🎉 ¡node-pty está funcionando correctamente!')
    console.log('💡 Tu terminal en Electron debería funcionar ahora.')
    console.log('🔧 Si aún tienes problemas, intenta:')
    console.log('   1. Reiniciar la aplicación Electron')
    console.log('   2. Crear un nuevo terminal en la aplicación')
    console.log('   3. Verificar que aparezcan los logs de backend detection')
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1)
    }
    throw error
  }
}

// Run directly if called as script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  verifyNodePty().catch(console.error)
}
