const log = require('electron-log')
const { AudioManager } = require('./audioManager.cjs')
const { Summarizer } = require('./summarizer.cjs')
const { LivcapServer } = require('../server/livcap-server.cjs')

const audioManager = new AudioManager()
const summarizer = new Summarizer()
const livcapServer = new LivcapServer({ port: 8766 })

// Legacy Deepgram support (can be removed later)
const { WebSocket } = require('ws')
let deepgramSocket = null
let deepgramApiKey = null

let currentWindow = null
let speakerCounter = 0
let lastSpeakerTime = Date.now()
let currentSpeaker = 'Speaker 1'
let silenceThreshold = 10000 // 10 seconds of silence = new speaker
let lastTranscriptTime = Date.now()
let transcriptBuffer = ''

// Set to true to use Livcap (on-device), false to use Deepgram (cloud)
const USE_LIVCAP = true

function setupIpcHandlers(ipcMain, mainWindow) {
  currentWindow = mainWindow

  // Get available audio devices
  ipcMain.handle('get-audio-devices', async () => {
    try {
      const devices = await audioManager.listDevices()
      return { success: true, devices }
    } catch (error) {
      log.error('Error getting audio devices:', error)
      return { success: false, error: error.message }
    }
  })

  // Start recording with Livcap (on-device) or Deepgram (cloud)
  ipcMain.handle('start-recording', async (event, device) => {
    try {
      if (USE_LIVCAP) {
        // Use Livcap (on-device transcription)
        log.info('Starting recording with Livcap (on-device)...')
        speakerCounter = 0
        currentSpeaker = 'Speaker 1'
        lastSpeakerTime = Date.now()
        lastTranscriptTime = Date.now()
        transcriptBuffer = ''
        
        // Start the Livcap server if not already running
        await livcapServer.start()
        
        // Connect to Livcap server WebSocket
        await connectToLivcapServer()
        
        return { success: true }
      } else {
        // Legacy Deepgram streaming (cloud-based)
        const deviceId = typeof device === 'string' ? device : device.id
        const ffmpegIndex = typeof device === 'object' && device.ffmpegIndex ? device.ffmpegIndex : null
        
        log.info('Starting recording with Deepgram:', deviceId, 'ffmpegIndex:', ffmpegIndex)
        speakerCounter = 0
        currentSpeaker = 'Speaker 1'
        lastSpeakerTime = Date.now()
        lastTranscriptTime = Date.now()
        transcriptBuffer = ''

        // Connect to Deepgram
        if (!deepgramSocket || deepgramSocket.readyState !== WebSocket.OPEN) {
          await connectToDeepgram()
        }

        await audioManager.startRecording(device, async (audioChunk) => {
          // Send audio level for visualization
          if (currentWindow && !currentWindow.isDestroyed()) {
            const level = Math.abs(audioChunk.reduce((sum, b) => sum + (b - 128), 0) / audioChunk.length)
            currentWindow.webContents.send('audio-level', Math.min(level / 50, 1))
          }

          // Send audio to Deepgram
          if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
            deepgramSocket.send(audioChunk)
          }
        })

        return { success: true }
      }
    } catch (error) {
      log.error('Error starting recording:', error)
      return { success: false, error: error.message }
    }
  })

  // Stop recording
  ipcMain.handle('stop-recording', async () => {
    try {
      if (USE_LIVCAP) {
        // Stop Livcap server
        await livcapServer.stop()
        
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.webContents.send('recording-stopped')
        }
      } else {
        // Legacy Deepgram streaming
        audioManager.stopRecording()
        
        // Close Deepgram connection
        if (deepgramSocket) {
          deepgramSocket.close()
          deepgramSocket = null
        }

        setTimeout(async () => {
          if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.webContents.send('recording-stopped')
          }
        }, 1000)
      }

      return { success: true }
    } catch (error) {
      log.error('Error stopping recording:', error)
      return { success: false, error: error.message }
    }
  })

  // Check recording state
  ipcMain.handle('get-recording-state', () => {
    return audioManager.getRecordingState()
  })

  // Check Ollama availability
  ipcMain.handle('check-ollama', async () => {
    const available = await summarizer.checkOllamaAvailable()
    return { available, model: summarizer.model }
  })

  // Get meeting summary
  ipcMain.handle('get-meeting-summary', async (event, transcripts) => {
    const summary = await summarizer.generateMeetingSummary(transcripts)
    return { summary }
  })

  // Export transcript
  ipcMain.handle('export-transcript', async (event, data) => {
    const { format, transcripts, summaries } = data
    
    if (format === 'markdown') {
      let md = '# Meeting Transcript\n\n'
      md += `*Generated on ${new Date().toLocaleString()}*\n\n`
      
      md += '## Transcript\n\n'
      for (const t of transcripts) {
        md += `**${t.speaker}** (${new Date(t.timestamp).toLocaleTimeString()}):\n${t.text}\n\n`
      }
      
      if (summaries && summaries.length > 0) {
        md += '## Summaries\n\n'
        for (const s of summaries) {
          md += `### ${s.speaker}\n${s.summary}\n\n`
        }
      }
      
      return { content: md, mimeType: 'text/markdown' }
    } else {
      let txt = 'MEETING TRANSCRIPT\n'
      txt += '=' .repeat(50) + '\n\n'
      txt += `Generated: ${new Date().toLocaleString()}\n\n`
      
      for (const t of transcripts) {
        txt += `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.speaker}: ${t.text}\n\n`
      }
      
      if (summaries && summaries.length > 0) {
        txt += '\n' + '='.repeat(50) + '\n'
        txt += 'SUMMARIES\n'
        txt += '='.repeat(50) + '\n\n'
        for (const s of summaries) {
          txt += `${s.speaker}:\n${s.summary}\n\n`
        }
      }
      
      return { content: txt, mimeType: 'text/plain' }
    }
  })

  // Set Deepgram API key (for legacy Deepgram mode)
  ipcMain.handle('set-deepgram-key', async (event, apiKey) => {
    deepgramApiKey = apiKey
    log.info('Deepgram API key set')
    return { success: true }
  })
  
  // Get transcription status
  ipcMain.handle('get-transcription-status', async () => {
    if (USE_LIVCAP) {
      return {
        using: 'livcap',
        status: livcapServer.getStatus()
      }
    } else {
      return {
        using: 'deepgram',
        status: {
          listening: audioManager.getRecordingState(),
          transcriptCount: transcriptBuffer.length
        }
      }
    }
  })

  log.info('IPC handlers setup complete')
}

// Connect to Livcap server (on-device transcription)
let livcapClientSocket = null

function connectToLivcapServer() {
  return new Promise((resolve, reject) => {
    const wsUrl = `ws://localhost:${livcapServer.port || 8766}`
    log.info(`[LivcapClient] Connecting to ${wsUrl}`)
    
    livcapClientSocket = new WebSocket(wsUrl)
    
    livcapClientSocket.on('open', () => {
      log.info('[LivcapClient] Connected to Livcap server')
      resolve()
    })
    
    livcapClientSocket.on('message', (message) => {
      try {
        const data = JSON.parse(message)
        
        switch (data.type) {
          case 'status':
            log.info(`[LivcapClient] Status: ${data.status} - ${data.message}`)
            if (currentWindow && !currentWindow.isDestroyed()) {
              currentWindow.webContents.send('transcription-status', data)
            }
            break
            
          case 'partial':
            // Real-time partial transcript (while speaking)
            if (currentWindow && !currentWindow.isDestroyed()) {
              currentWindow.webContents.send('transcript-interim', data.transcript)
            }
            break
            
          case 'transcript':
            // Finalized transcript segment
            if (currentWindow && !currentWindow.isDestroyed()) {
              currentWindow.webContents.send('transcript-update', {
                id: data.id,
                speaker: data.speaker,
                text: data.text,
                timestamp: data.timestamp
              })
            }
            break
            
          case 'summary':
            // AI-generated summary
            if (currentWindow && !currentWindow.isDestroyed()) {
              currentWindow.webContents.send('summary-update', {
                speaker: data.speaker,
                summary: data.summary,
                actionItems: data.actionItems
              })
            }
            break
            
          case 'sync':
            // Full transcript sync (on reconnect)
            if (data.transcripts && currentWindow && !currentWindow.isDestroyed()) {
              for (const t of data.transcripts) {
                currentWindow.webContents.send('transcript-update', t)
              }
            }
            break
            
          case 'error':
            log.error(`[LivcapClient] Error: ${data.message}`)
            if (currentWindow && !currentWindow.isDestroyed()) {
              currentWindow.webContents.send('transcription-error', data.message)
            }
            break
        }
      } catch (e) {
        log.error('[LivcapClient] Failed to parse message:', e)
      }
    })
    
    livcapClientSocket.on('close', () => {
      log.info('[LivcapClient] Disconnected from Livcap server')
      livcapClientSocket = null
    })
    
    livcapClientSocket.on('error', (error) => {
      log.error('[LivcapClient] WebSocket error:', error)
      reject(error)
    })
  })
}

function connectToDeepgram() {
  return new Promise((resolve, reject) => {
    if (!deepgramApiKey) {
      log.warn('No Deepgram API key set. Set it with window.electronAPI.setDeepgramKey("your-key")')
      reject(new Error('No Deepgram API key'))
      return
    }

    const url = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&punctuate=true`
    
    deepgramSocket = new WebSocket(url, {
      headers: {
        'Authorization': `Token ${deepgramApiKey}`
      }
    })

    deepgramSocket.on('open', () => {
      log.info('Deepgram WebSocket connected')
      resolve()
    })

    deepgramSocket.on('message', (message) => {
      try {
        let data
        let rawMessage = message
        
        // Deepgram sends JSON text messages
        if (typeof message === 'string') {
          data = JSON.parse(message)
          log.info('[Deepgram] String message parsed')
        }
        // Handle Buffer object (from ws library)
        else if (Buffer.isBuffer(message)) {
          data = JSON.parse(message.toString('utf8'))
          log.info('[Deepgram] Buffer message parsed')
        }
        // Handle Electron's serialized Buffer format
        else if (message && message.type === 'Buffer' && message.data) {
          data = JSON.parse(Buffer.from(message.data).toString('utf8'))
          log.info('[Deepgram] Electron Buffer parsed')
        }
        // Handle object with data property (some ws configurations)
        else if (message && typeof message === 'object' && message.data) {
          if (typeof message.data === 'string') {
            data = JSON.parse(message.data)
            log.info('[Deepgram] Object with string data parsed')
          } else if (Buffer.isBuffer(message.data)) {
            data = JSON.parse(message.data.toString('utf8'))
            log.info('[Deepgram] Object with Buffer data parsed')
          }
        }
        else {
          log.warn('[Deepgram] Unknown message format:', typeof message, JSON.stringify(message).substring(0, 100))
          return
        }
        
        // Log all Deepgram responses for debugging
        log.info('[Deepgram] Raw response:', JSON.stringify(data).substring(0, 200))
        
        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript
          const isFinal = data.is_final
          const confidence = data.channel.alternatives[0].confidence
          
          log.info(`[Deepgram] ${isFinal ? 'FINAL' : 'INTERIM'}: "${transcript}" (confidence: ${confidence})`)
          
          if (transcript && transcript.trim()) {
            transcriptBuffer += transcript + ' '
            
            // Send interim transcript to UI
            if (!isFinal && currentWindow && !currentWindow.isDestroyed()) {
              currentWindow.webContents.send('transcript-interim', transcript.trim())
            }
            
            // On final transcript, send to UI
            if (isFinal && transcript.trim()) {
              lastSpeakerTime = Date.now()
              
              const transcriptEntry = {
                id: Date.now().toString(),
                speaker: currentSpeaker,
                text: transcript.trim(),
                timestamp: new Date().toISOString()
              }
              
              if (currentWindow && !currentWindow.isDestroyed()) {
                currentWindow.webContents.send('transcript-update', transcriptEntry)
                
                // Generate summary
                setTimeout(async () => {
                  const summary = await summarizer.summarize(transcript.trim(), currentSpeaker)
                  if (summary && currentWindow && !currentWindow.isDestroyed()) {
                    currentWindow.webContents.send('summary-update', {
                      speaker: currentSpeaker,
                      summary
                    })
                  }
                }, 2000)
              }
            }
          }
          
          // Check for speaker change (silence)
          const now = Date.now()
          if (now - lastSpeakerTime > silenceThreshold && transcriptBuffer.trim()) {
            speakerCounter++
            currentSpeaker = `Speaker ${speakerCounter + 1}`
            transcriptBuffer = ''
            lastSpeakerTime = now
          }
        }
      } catch (e) {
        log.error('[Deepgram] Error parsing message:', e)
      }
    })

    deepgramSocket.on('error', (error) => {
      log.error('[Deepgram] Error:', error)
    })

    deepgramSocket.on('close', () => {
      log.info('Deepgram WebSocket closed')
    })
  })
}

module.exports = { setupIpcHandlers }
