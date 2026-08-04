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
    this.ffmpegPath = null
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

    // Find ffmpeg
    const ffmpegPaths = ['/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/bin/ffmpeg']
    for (const p of ffmpegPaths) {
      if (fs.existsSync(p)) {
        this.ffmpegPath = p
        log.info(`Found ffmpeg at: ${this.ffmpegPath}`)
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
    log.info('Transcriber initialized, whisperPath:', this.whisperPath, 'ffmpeg:', this.ffmpegPath)
  }

  async transcribe(audioBuffer) {
    await this.initialize()

    return new Promise((resolve, reject) => {
      const tempWav = path.join(os.tmpdir(), `audio_${Date.now()}.wav`)
      const tempRaw = path.join(os.tmpdir(), `audio_${Date.now()}.raw`)
      
      // Write audio buffer to temp file
      fs.writeFileSync(tempRaw, audioBuffer)
      
      log.info('Transcribing audio buffer, size:', audioBuffer.length)

      // If whisper.cpp exists, use it directly (it handles raw audio)
      if (this.whisperPath) {
        const args = [
          '-m', this.modelPath || 'ggml-base.bin',
          '-f', tempRaw,
          '--no-timestamps',
          '-otxt',
          '-'
        ]

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
          fs.unlinkSync(tempRaw)
          
          if (code !== 0 && code !== null) {
            log.warn('whisper.cpp exited with code:', code, 'stderr:', stderr.substring(0, 200))
          }
          
          const result = stdout.trim()
          log.info('whisper.cpp result:', result || '(empty)')
          resolve(result || '')
        })

        proc.on('error', (error) => {
          fs.unlinkSync(tempRaw)
          log.error('whisper.cpp error:', error)
          resolve('')
        })
      } else if (this.ffmpegPath) {
        // Convert raw to wav first, then use Python whisper
        const ffmpegProc = spawn(this.ffmpegPath, [
          '-f', 's16le', '-ar', '16000', '-ac', '1',
          '-i', tempRaw,
          tempWav
        ])

        ffmpegProc.on('close', (code) => {
          if (code !== 0) {
            log.error('ffmpeg conversion failed')
            fs.unlinkSync(tempRaw)
            resolve('')
            return
          }

          // Now transcribe with Python whisper
          this.transcribeWithWhisper(tempWav, [tempRaw, tempWav], resolve)
        })

        ffmpegProc.on('error', (error) => {
          log.error('ffmpeg error:', error)
          fs.unlinkSync(tempRaw)
          resolve('')
        })
      } else {
        // Use Python whisper directly (it will try to handle raw audio)
        this.transcribeWithWhisper(tempRaw, [tempRaw], resolve)
      }
    })
  }

  transcribeWithWhisper(audioPath, filesToClean, resolve) {
    const script = `
import whisper
model = whisper.load_model("base")
result = model.transcribe("${audioPath.replace(/"/g, '\\"')}", word_timestamps=False, audio_length=5)
print(result["text"].strip(), end="")
`
    const proc = spawn('python3', ['-c', script])
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
      // Log first few errors
      if (stderr.length < 500) {
        log.info('Whisper stderr:', data.toString().substring(0, 100))
      }
    })

    proc.on('close', (code) => {
      // Clean up temp files
      for (const f of filesToClean) {
        try { fs.unlinkSync(f) } catch(e) {}
      }
      
      if (code !== 0) {
        log.warn('Python whisper exited with code:', code, 'stderr:', stderr.substring(0, 200))
      }
      
      const result = stdout.trim()
      log.info('Python whisper result:', result || '(empty)')
      resolve(result || '')
    })

    proc.on('error', (error) => {
      for (const f of filesToClean) {
        try { fs.unlinkSync(f) } catch(e) {}
      }
      log.error('Python whisper error:', error)
      resolve('')
    })
  }
}

module.exports = { Transcriber }
