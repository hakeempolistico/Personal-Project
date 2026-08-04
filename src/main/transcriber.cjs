const log = require('electron-log')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

class Transcriber {
  constructor() {
    this.isProcessing = false
    this.queue = []
    this.whisperPath = null
    this.modelPath = null
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return

    log.info('Initializing transcriber...')

    // Find whisper.cpp binary
    const possiblePaths = [
      path.join(__dirname, '../../whisper.cpp/main'),
      path.join(__dirname, '../../../whisper.cpp/main'),
      '/usr/local/bin/main',
      '/opt/homebrew/bin/main',
      path.join(os.homedir(), 'whisper.cpp/build/bin/main')
    ]

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        this.whisperPath = p
        log.info(`Found whisper.cpp at: ${this.whisperPath}`)
        break
      }
    }

    // Find model file
    const modelDir = path.join(__dirname, '../../whisper.cpp/models')
    const possibleModels = [
      path.join(modelDir, 'ggml-base.bin'),
      path.join(modelDir, 'ggml-tiny.bin'),
      path.join(os.homedir(), '.cache/whisper/ggml-base.bin'),
      path.join(os.homedir(), '.cache/whisper/ggml-tiny.bin')
    ]

    for (const m of possibleModels) {
      if (fs.existsSync(m)) {
        this.modelPath = m
        log.info(`Found whisper model at: ${this.modelPath}`)
        break
      }
    }

    this.initialized = true
    log.info('Transcriber initialized')
  }

  async transcribe(audioBuffer) {
    await this.initialize()

    return new Promise((resolve, reject) => {
      const tempFile = path.join(os.tmpdir(), `audio_${Date.now()}.raw`)
      
      // Write audio buffer to temp file
      fs.writeFileSync(tempFile, audioBuffer)

      const args = [
        '-m', this.modelPath || 'ggml-base.bin',
        '-f', tempFile,
        '--no-timestamps',
        '-otxt',
        '-'
      ]

      // If whisper binary exists, use it
      if (this.whisperPath) {
        const proc = spawn(this.whisperPath, args)
        let stdout = ''
        let stderr = ''

        proc.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        proc.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        proc.on('close', (code) => {
          fs.unlinkSync(tempFile)
          
          if (code !== 0 && code !== null) {
            log.warn('whisper.cpp exited with code:', code, 'stderr:', stderr)
          }
          
          resolve(stdout.trim() || '')
        })

        proc.on('error', (error) => {
          fs.unlinkSync(tempFile)
          log.error('whisper.cpp error:', error)
          resolve('')
        })
      } else {
        // Fallback: try Python whisper
        const proc = spawn('python3', [
          '-c',
          `import whisper
import sys
model = whisper.load_model("base")
result = model.transcribe("${tempFile.replace(/"/g, '\\"')}", word_timestamps=False)
print(result["text"], end="")`
        ])

        let stdout = ''
        let stderr = ''

        proc.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        proc.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        proc.on('close', (code) => {
          fs.unlinkSync(tempFile)
          
          if (code !== 0) {
            log.warn('Python whisper exited with code:', code, 'stderr:', stderr)
          }
          
          resolve(stdout.trim() || '')
        })

        proc.on('error', (error) => {
          fs.unlinkSync(tempFile)
          log.error('Python whisper error:', error)
          resolve('')
        })
      }
    })
  }

  // Alternative: Use WebAssembly version via browser
  async transcribeBrowser(audioBlob) {
    // This would be handled in the renderer process with a WASM-based whisper
    // For now, we return empty and handle transcription in main process
    return ''
  }
}

module.exports = { Transcriber }
