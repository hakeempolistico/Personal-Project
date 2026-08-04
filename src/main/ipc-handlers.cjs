const log = require('electron-log')
const { AudioManager } = require('./audioManager.cjs')
const { Summarizer } = require('./summarizer.cjs')

const audioManager = new AudioManager()
const summarizer = new Summarizer()

// Deepgram streaming
const { WebSocket } = require('ws')
let deepgramSocket = null
let deepgramApiKey = null // Set this to your Deepgram API key

let currentWindow = null
let speakerCounter = 0
let lastSpeakerTime = Date.now()
let currentSpeaker = 'Speaker 1'
let silenceThreshold = 10000 // 10 seconds of silence = new speaker
let lastTranscriptTime = Date.now()
let transcriptBuffer = ''

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

  // Start recording with Deepgram streaming
  ipcMain.handle('start-recording', async (event, deviceId) => {
    try {
      log.info('Starting recording with device:', deviceId)
      speakerCounter = 0
      currentSpeaker = 'Speaker 1'
      lastSpeakerTime = Date.now()
      lastTranscriptTime = Date.now()
      transcriptBuffer = ''

      // Connect to Deepgram
      if (!deepgramSocket || deepgramSocket.readyState !== WebSocket.OPEN) {
        await connectToDeepgram()
      }

      await audioManager.startRecording(deviceId, async (audioChunk) => {
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
    } catch (error) {
      log.error('Error starting recording:', error)
      return { success: false, error: error.message }
    }
  })

  // Stop recording
  ipcMain.handle('stop-recording', async () => {
    try {
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

  // Set Deepgram API key
  ipcMain.handle('set-deepgram-key', async (event, apiKey) => {
    deepgramApiKey = apiKey
    log.info('Deepgram API key set')
    return { success: true }
  })

  log.info('IPC handlers setup complete')
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

    deepgramSocket.on('message', (event) => {
      try {
        log.info('[Deepgram] Received message, type:', typeof event.data, 'isBuffer:', Buffer.isBuffer(event.data))
        
        // Handle both string and binary messages
        let data
        if (typeof event.data === 'string') {
          log.info('[Deepgram] String message:', event.data.substring(0, 100))
          data = JSON.parse(event.data)
        } else if (Buffer.isBuffer(event.data)) {
          const text = event.data.toString('utf8')
          log.info('[Deepgram] Buffer message, length:', event.data.length, 'preview:', text.substring(0, 100))
          data = JSON.parse(text)
        } else if (event.data instanceof ArrayBuffer) {
          const text = Buffer.from(event.data).toString('utf8')
          log.info('[Deepgram] ArrayBuffer message:', text.substring(0, 100))
          data = JSON.parse(text)
        } else {
          log.warn('[Deepgram] Unknown message type:', typeof event.data, 'constructor:', event.data?.constructor?.name)
          log.warn('[Deepgram] Raw event:', JSON.stringify(event).substring(0, 200))
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
