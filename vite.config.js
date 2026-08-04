import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.cjs',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'electron-log']
            }
          }
        }
      },
      {
        entry: 'src/preload/preload.cjs',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload'
          }
        }
      }
    ]),
    renderer()
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer')
    }
  }
})
