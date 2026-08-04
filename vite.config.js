const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const electronPlugin = require('vite-plugin-electron').default
const rendererPlugin = require('vite-plugin-electron-renderer').default
const path = require('path')

module.exports = defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    electronPlugin([
      {
        entry: 'src/main/index.cjs',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'electron-log', 'ws', 'bufferutil', 'utf-8-validate']
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
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
              output: {
                entryFileNames: 'preload.cjs'
              }
            }
          }
        }
      }
    ]),
    rendererPlugin()
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
}))
