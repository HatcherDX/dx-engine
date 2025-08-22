/* eslint-env node */

import vue from '@vitejs/plugin-vue'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { spawn } from 'node:child_process'
import { chrome } from '../electron/.electron-vendors.cache.json'

const PACKAGE_ROOT = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

/**
 * Vite plugin to handle Git commands in development mode.
 *
 * @returns Vite plugin configuration
 */
function gitApiPlugin() {
  return {
    name: 'git-api',
    configureServer(server: any) {
      server.middlewares.use('/api/git', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }

        let body = ''
        req.on('data', (chunk: any) => {
          body += chunk.toString()
        })

        req.on('end', async () => {
          try {
            const { args, cwd } = JSON.parse(body)

            console.log(`[Git API] Executing git ${args.join(' ')} in ${cwd}`)

            const result = await new Promise((resolve, reject) => {
              const gitProcess = spawn('git', args, {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
              })

              let stdout = ''
              let stderr = ''

              gitProcess.stdout?.on('data', (data) => {
                stdout += data.toString()
              })

              gitProcess.stderr?.on('data', (data) => {
                stderr += data.toString()
              })

              gitProcess.on('close', (code) => {
                if (code === 0) {
                  resolve({ output: stdout })
                } else {
                  reject(new Error(`Git command failed (${code}): ${stderr}`))
                }
              })

              gitProcess.on('error', (error) => {
                reject(error)
              })
            })

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (error: any) {
            console.error('[Git API] Command failed:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  resolve: {
    alias: {
      '/@/': `${join(PACKAGE_ROOT, 'src')}/`,
    },
  },
  base: '',
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: join(PACKAGE_ROOT, 'index.html'),
      external: ['node-pty', 'electron'],
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    exclude: ['node-pty', 'electron', '@hatcherdx/terminal-system'],
  },
  plugins: [vue(), gitApiPlugin()],
})
