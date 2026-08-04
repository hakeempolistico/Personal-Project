const log = require('electron-log')
const { spawn } = require('child_process')

class AudioManager {
  constructor() {
    this.isRecording = false
    this.audioProcess = null
    this.chunkCallback = null
    this.buffer = []
    this.sampleRate = 16000
    this.chunkDuration = 500 // 0.5 seconds - send chunks frequently
  }

  async listDevices() {
    return new Promise((resolve, reject) => {
      // Try system_profiler first
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
        log.info('system_profiler output length:', stdout.length)
        
        try {
          const data = JSON.parse(stdout)
          log.info('Parsed system_profiler data:', JSON.stringify(data).substring(0, 500))
          
          const devices = []
          
          // Try different possible structures
          const audioData = data.SPAudioData || data['SPAudioData-Type'] || data
          
          // Check for _items array
          if (audioData._items) {
            for (const item of audioData._items) {
              const name = item._name || item.name || 'Unknown'
              const uid = item['coreaudio-device_uid'] || item.id || name
              const caps = item['coreaudio-device_capabilities'] || item.capabilities || []
              
              // Check if it's an input device
              if (caps.includes('coreaudio-device-capability-input') || 
                  caps.includes('input') || 
                  item.coreaudio-device_inouts?.includes('input')) {
                devices.push({
                  id: uid,
                  name: name,
                  isInput: true,
                  isBlackHole: name.toLowerCase().includes('blackhole')
                })
              }
            }
          }
          
          // Also try to find devices in any _items anywhere in the structure
          if (devices.length === 0) {
            const findItems = (obj) => {
              if (!obj || typeof obj !== 'object') return
              if (Array.isArray(obj._items)) {
                for (const item of obj._items) {
                  const name = item._name || item.name || ''
                  if (name) {
                    devices.push({
                      id: item['coreaudio-device_uid'] || name,
                      name: name,
                      isInput: true,
                      isBlackHole: name.toLowerCase().includes('blackhole')
                    })
                  }
                }
              }
              for (const key of Object.keys(obj)) {
                if (key !== '_items') {
                  findItems(obj[key])
                }
              }
            }
            findItems(data)
          }
          
          // If still no devices, use common Mac device names
          if (devices.length === 0) {
            log.warn('No devices found in system_profiler, using defaults')
            devices.push(
              { id: 'BlackHole2ch', name: 'BlackHole 2ch', isInput: true, isBlackHole: true },
              { id: 'BuiltInMicrophone', name: 'MacBook Pro Microphone', isInput: true, isBlackHole: false }
            )
          }
          
          log.info('Found audio devices:', devices)
          resolve(devices)
        } catch (e) {
          log.error('Error parsing audio devices:', e, 'Raw output:', stdout.substring(0, 200))
          // Fallback to common BlackHole names
          resolve([
            { id: 'BlackHole2ch', name: 'BlackHole 2ch', isInput: true, isBlackHole: true },
            { id: 'BuiltInMicrophone', name: 'MacBook Pro Microphone', isInput: true, isBlackHole: false }
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

    // Use ffmpeg to record audio from the specified device
    // First, try using sox with the device
    try {
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
      log.error('sox failed, trying ffmpeg...')
      
      // Try ffmpeg
      try {
        this.audioProcess = spawn('ffmpeg', [
          '-f', 'avfoundation',   // macOS AVFoundation input
          '-i', deviceId === 'BlackHole2ch' ? 'BlackHole 2ch' : deviceId,  // Input device
          '-ar', '16000',         // Sample rate
          '-ac', '1',             // Mono
          '-acodec', 'pcm_s16le', // 16-bit signed little-endian PCM
          '-f', 's16le',          // Raw PCM format
          '-'                      // Output to stdout
        ])
      } catch (e2) {
        log.error('ffmpeg failed:', e2)
        this.isRecording = false
        throw new Error('No audio recording tool available. Please install sox or ffmpeg')
      }
    }

    let audioBuffer = Buffer.alloc(0)
    let chunkCount = 0

    this.audioProcess.stdout.on('data', (chunk) => {
      log.info(`[Audio] Received ${chunk.length} bytes from sox`)
      audioBuffer = Buffer.concat([audioBuffer, chunk])
      
      // Calculate chunk size (0.5 seconds at 16kHz mono 16-bit = 16000 * 0.5 * 2 = 16000 bytes)
      const chunkSize = this.sampleRate * (this.chunkDuration / 1000) * 2
      
      log.info(`[Audio] Buffer size: ${audioBuffer.length}, chunk size needed: ${chunkSize}`)
      
      while (audioBuffer.length >= chunkSize) {
        const audioChunk = audioBuffer.slice(0, chunkSize)
        audioBuffer = audioBuffer.slice(chunkSize)
        
        chunkCount++
        log.info(`[Audio] Sending chunk #${chunkCount}, size: ${audioChunk.length} bytes`)
        
        if (this.chunkCallback) {
          this.chunkCallback(audioChunk)
        }
      }
    })

    this.audioProcess.stderr.on('data', (data) => {
      const msg = data.toString()
      log.info('[sox stderr]:', msg)
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
