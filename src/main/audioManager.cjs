const log = require('electron-log')
const { spawn } = require('child_process')

class AudioManager {
  constructor() {
    this.isRecording = false
    this.audioProcess = null
    this.chunkCallback = null
    this.buffer = []
    this.sampleRate = 16000
    this.chunkDuration = 5000 // 5 seconds
  }

  async listDevices() {
    return new Promise((resolve, reject) => {
      // Use system_profiler to get audio devices
      const proc = spawn('system_profiler', ['SPAudioDataType', '-json'])
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          log.error('Failed to list audio devices:', stderr)
          reject(new Error('Failed to list audio devices'))
          return
        }

        try {
          const data = JSON.parse(stdout)
          const devices = []
          
          // Parse CoreAudio devices
          if (data.SPAudioData && data.SPAudioData._items) {
            for (const item of data.SPAudioData._items) {
              if (item['coreaudio-device_capabilities'] && item['coreaudio-device_uid']) {
                const caps = item['coreaudio-device_capabilities']
                if (Array.isArray(caps) && caps.includes('coreaudio-device-capability-input')) {
                  const name = item._name || 'Unknown Device'
                  devices.push({
                    id: item['coreaudio-device_uid'],
                    name: name,
                    isInput: true,
                    isBlackHole: name.toLowerCase().includes('blackhole')
                  })
                }
              }
            }
          }
          
          log.info('Found audio devices:', devices)
          resolve(devices)
        } catch (e) {
          log.error('Error parsing audio devices:', e)
          // Fallback to common BlackHole names
          resolve([
            { id: 'BlackHole2ch', name: 'BlackHole 2ch', isInput: true, isBlackHole: true },
            { id: 'BuiltInMicrophone', name: 'Built-in Microphone', isInput: true, isBlackHole: false }
          ])
        }
      })
    })
  }

  async startRecording(deviceId, onAudioChunk) {
    if (this.isRecording) {
      log.warn('Already recording')
      return
    }

    this.chunkCallback = onAudioChunk
    this.isRecording = true
    this.buffer = []
    
    log.info(`Starting recording from device: ${deviceId}`)

    // Use sox to record audio if available, otherwise use rec from sox
    // Fallback to ffmpeg or sox for audio capture
    try {
      // First try sox
      this.audioProcess = spawn('sox', [
        '-d',                    // Use default audio device
        '-t', 'raw',             // Output raw audio
        '-r', '16000',           // Sample rate 16kHz
        '-e', 'signed-integer',  // 16-bit PCM
        '-b', '16',
        '-c', '1',               // Mono
        '-'                      // Output to stdout
      ])
    } catch (e) {
      // Fallback: try rec from sox
      try {
        this.audioProcess = spawn('rec', [
          '-c', '1',
          '-r', '16000',
          '-t', 'wav',
          '-'
        ])
      } catch (e2) {
        log.error('No audio recording tool available. Please install sox: brew install sox')
        this.isRecording = false
        throw new Error('Audio recording tool not found. Please run: brew install sox')
      }
    }

    let audioBuffer = Buffer.alloc(0)

    this.audioProcess.stdout.on('data', (chunk) => {
      audioBuffer = Buffer.concat([audioBuffer, chunk])
      
      // Calculate chunk size (5 seconds at 16kHz mono 16-bit = 16000 * 5 * 2 = 160000 bytes)
      const chunkSize = this.sampleRate * (this.chunkDuration / 1000) * 2
      
      while (audioBuffer.length >= chunkSize) {
        const audioChunk = audioBuffer.slice(0, chunkSize)
        audioBuffer = audioBuffer.slice(chunkSize)
        
        if (this.chunkCallback) {
          this.chunkCallback(audioChunk)
        }
      }
    })

    this.audioProcess.stderr.on('data', (data) => {
      log.debug('Audio process stderr:', data.toString())
    })

    this.audioProcess.on('error', (error) => {
      log.error('Audio process error:', error)
      this.isRecording = false
    })

    this.audioProcess.on('close', (code) => {
      log.info('Audio process closed with code:', code)
      this.isRecording = false
    })

    log.info('Recording started successfully')
  }

  stopRecording() {
    if (!this.isRecording) {
      return
    }

    log.info('Stopping recording...')
    
    if (this.audioProcess) {
      this.audioProcess.kill('SIGTERM')
      this.audioProcess = null
    }
    
    this.isRecording = false
    this.chunkCallback = null
    log.info('Recording stopped')
  }

  getRecordingState() {
    return this.isRecording
  }
}

module.exports = { AudioManager }
