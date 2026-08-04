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
      // Get devices from ffmpeg first to get proper device indices
      const ffmpegProc = spawn('ffmpeg', ['-list_devices', 'true', '-f', 'avfoundation', '-i', 'dummy'])
      let stdout = ''
      let stderr = ''

      ffmpegProc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      ffmpegProc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpegProc.on('close', (code) => {
        // Parse ffmpeg device list to get indices
        const deviceMap = new Map()
        const lines = stderr.split('\n')
        
        for (const line of lines) {
          // Match lines like "[AVFoundation input device @ 0x...] \"MacBook Pro Microphone\""
          const match = line.match(/\[AVFoundation input device @ [^\]]+\] \"([^\"]+)\"/)
          if (match) {
            const deviceName = match[1]
            // Find the index from the next line or pattern
            const indexMatch = line.match(/\[(\d+)\]/)
            if (indexMatch) {
              deviceMap.set(deviceName, indexMatch[1])
            }
          }
        }
        
        // Also parse lines like "[0] MacBook Pro Microphone"
        for (const line of lines) {
          const indexedMatch = line.match(/\[(\d+)\]\s+(.+?)(?:\s*\[|$)/)
          if (indexedMatch) {
            const index = indexedMatch[1]
            const name = indexedMatch[2].trim()
            if (!deviceMap.has(name)) {
              deviceMap.set(name, index)
            }
          }
        }
        
        log.info('FFmpeg device map:', Object.fromEntries(deviceMap))
        
        // Now use system_profiler for more details
        const proc = spawn('system_profiler', ['SPAudioDataType', '-json'])
        let spStdout = ''
        let spStderr = ''

        proc.stdout.on('data', (data) => {
          spStdout += data.toString()
        })

        proc.stderr.on('data', (data) => {
          spStderr += data.toString()
        })

        proc.on('close', (spCode) => {
          try {
            const data = JSON.parse(spStdout)
            const devices = []
            
            // Find audio items in system_profiler data
            const findAudioItems = (obj) => {
              if (!obj || typeof obj !== 'object') return
              if (Array.isArray(obj._items)) {
                for (const item of obj._items) {
                  const name = item._name || item.name || ''
                  if (name && name !== 'Core Audio') {
                    const uid = item['coreaudio-device_uid'] || name
                    const hasInput = item['coreaudio-device_input'] !== undefined || 
                                   item.coreaudio_device_input !== undefined
                    
                    // Try to find ffmpeg index
                    let ffmpegIndex = deviceMap.get(name)
                    if (!ffmpegIndex) {
                      // Try partial match
                      for (const [key, value] of deviceMap) {
                        if (key.includes(name) || name.includes(key)) {
                          ffmpegIndex = value
                          break
                        }
                      }
                    }
                    
                    if (hasInput || !ffmpegIndex) {
                      devices.push({
                        id: uid,
                        name: name,
                        ffmpegIndex: ffmpegIndex || null,
                        isInput: true,
                        isBlackHole: name.toLowerCase().includes('blackhole')
                      })
                    }
                  }
                }
              }
              for (const key of Object.keys(obj)) {
                if (key !== '_items') {
                  findAudioItems(obj[key])
                }
              }
            }
            
            findAudioItems(data)
            
            // If we found ffmpeg indices, add them to devices from system_profiler
            // If no devices found, create from ffmpeg map
            if (devices.length === 0 && deviceMap.size > 0) {
              for (const [name, index] of deviceMap) {
                devices.push({
                  id: name,
                  name: name,
                  ffmpegIndex: index,
                  isInput: true,
                  isBlackHole: name.toLowerCase().includes('blackhole')
                })
              }
            }
            
            // Fallback if nothing found
            if (devices.length === 0) {
              log.warn('No devices found, using defaults')
              devices.push(
                { id: 'BlackHole 2ch', name: 'BlackHole 2ch', ffmpegIndex: '0', isInput: true, isBlackHole: true },
                { id: 'MacBook Pro Microphone', name: 'MacBook Pro Microphone', ffmpegIndex: '1', isInput: true, isBlackHole: false }
              )
            }
            
            log.info('Found audio devices:', devices)
            resolve(devices)
          } catch (e) {
            log.error('Error parsing audio devices:', e)
            // Fallback
            resolve([
              { id: 'BlackHole 2ch', name: 'BlackHole 2ch', ffmpegIndex: '0', isInput: true, isBlackHole: true },
              { id: 'MacBook Pro Microphone', name: 'MacBook Pro Microphone', ffmpegIndex: '1', isInput: true, isBlackHole: false }
            ])
          }
        })
      })
    })
  }

  async startRecording(device, onAudioChunk) {
    if (this.isRecording) {
      log.warn('Already recording')
      return
    }

    this.chunkCallback = onAudioChunk
    this.isRecording = true
    this.buffer = []
    
    // device can be either a string (deviceId) or an object with ffmpegIndex
    const deviceId = typeof device === 'string' ? device : device.id
    const ffmpegIndex = typeof device === 'object' && device.ffmpegIndex ? device.ffmpegIndex : null
    
    log.info(`Starting recording from device: ${deviceId} (ffmpeg index: ${ffmpegIndex})`)

    // Use ffmpeg to record audio with proper format conversion
    try {
      let deviceSpecifier
      
      if (ffmpegIndex) {
        // Use the detected ffmpeg index
        deviceSpecifier = ':' + ffmpegIndex
      } else {
        // Fallback: guess based on device name
        if (deviceId.toLowerCase().includes('microphone') || deviceId.toLowerCase().includes('mic')) {
          deviceSpecifier = ':1'
        } else if (deviceId.toLowerCase().includes('blackhole')) {
          deviceSpecifier = ':2'
        } else {
          deviceSpecifier = ':0'
        }
        log.warn('Using fallback device index:', deviceSpecifier)
      }
      
      log.info(`Using ffmpeg with device: ${deviceSpecifier}`)
      
      this.audioProcess = spawn('ffmpeg', [
        '-f', 'avfoundation',   // macOS AVFoundation input
        '-i', deviceSpecifier,   // Input device
        '-ar', '16000',          // Sample rate 16kHz (Deepgram expects this)
        '-ac', '1',              // Mono channel
        '-acodec', 'pcm_s16le',  // 16-bit signed little-endian PCM
        '-f', 's16le',           // Raw PCM format for streaming
        '-'                      // Output to stdout
      ])
      
      log.info('ffmpeg process started with 16kHz mono output')
    } catch (e) {
      log.error('Failed to start ffmpeg:', e)
      this.isRecording = false
      throw new Error('Failed to start audio recording. Please install ffmpeg: brew install ffmpeg')
    }

    let audioBuffer = Buffer.alloc(0)
    let chunkCount = 0

    this.audioProcess.stdout.on('data', (chunk) => {
      // Only log every 50 chunks to reduce spam
      if (chunkCount % 50 === 0) {
        log.info(`[Audio] Received ${chunk.length} bytes, total chunks: ${chunkCount}`)
      }
      
      audioBuffer = Buffer.concat([audioBuffer, chunk])
      
      // Calculate chunk size (0.5 seconds at 16kHz mono 16-bit = 16000 * 0.5 * 2 = 16000 bytes)
      const chunkSize = this.sampleRate * (this.chunkDuration / 1000) * 2
      
      while (audioBuffer.length >= chunkSize) {
        const audioChunk = audioBuffer.slice(0, chunkSize)
        audioBuffer = audioBuffer.slice(chunkSize)
        
        chunkCount++
        
        if (this.chunkCallback) {
          this.chunkCallback(audioChunk)
        }
      }
    })

    this.audioProcess.stderr.on('data', (data) => {
      const msg = data.toString()
      // Log ffmpeg initialization (once)
      if (msg.includes('Stream') || msg.includes('Duration')) {
        log.info('[ffmpeg init]:', msg.substring(0, 150))
      }
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
