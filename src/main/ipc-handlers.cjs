const log = require('electron-log')
const { AudioManager } = require('./audioManager.cjs')
const { Summarizer } = require('./summarizer.cjs')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const { WebSocketServer, WebSocket } = require('ws')

// Inline LivcapServer class to avoid bundling issues
class LivcapServer {
    constructor(options = {}) {
        this.port = options.port || 8766
        this.livcapPath = options.livcapPath || this.findLivcapBinary()
        this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434'
        this.summaryModel = options.summaryModel || 'llama3.2:latest'
        
        this.livcapProcess = null
        this.wss = null
        this.clients = new Set()
        this.isListening = false
        this.transcriptBuffer = []
        this.partialTranscript = ''
        this.lastSummaryTime = 0
        this.summaryCooldown = 3000
        this.speakerCounter = 0
        this.lastSpeakerTime = Date.now()
        this.currentSpeaker = 'Speaker 1'
        this.silenceThreshold = 15000
    }
    
    findLivcapBinary() {
        const baseDir = path.join(process.env.HOME || '', 'Projects/transcriber/Personal-Project/livcap/.build')
        const possiblePaths = [
            // Apple Silicon Mac
            path.join(baseDir, 'arm64-apple-macosx/release/livcap'),
            path.join(baseDir, 'release/livcap'),
            // Relative paths from dist-electron
            path.join(__dirname, '../../../livcap/.build/arm64-apple-macosx/release/livcap'),
            path.join(__dirname, '../../../livcap/.build/release/livcap'),
            path.join(__dirname, '../../livcap/.build/arm64-apple-macosx/release/livcap'),
            path.join(__dirname, '../../livcap/.build/release/livcap'),
            // Home directory
            path.join(process.env.HOME || '', 'Projects/transcriber/Personal-Project/livcap/.build/arm64-apple-macosx/release/livcap'),
            path.join(process.env.HOME || '', 'livcap/.build/release/livcap'),
            // Common install locations
            '/usr/local/bin/livcap',
            '/opt/homebrew/bin/livcap'
        ]
        
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                log.info(`[LivcapServer] Found Livcap at: ${p}`)
                return p
            }
        }
        
        log.warn('[LivcapServer] Livcap binary not found')
        log.warn('[LivcapServer] Searched paths:', possiblePaths)
        return possiblePaths[0]
    }
    
    start() {
        return new Promise((resolve, reject) => {
            this.wss = new WebSocketServer({ port: this.port })
            
            this.wss.on('connection', (ws) => {
                log.info('[LivcapServer] Client connected')
                this.clients.add(ws)
                
                if (this.transcriptBuffer.length > 0) {
                    ws.send(JSON.stringify({ type: 'sync', transcripts: this.transcriptBuffer }))
                }
                
                ws.on('message', (message) => this.handleClientMessage(message))
                ws.on('close', () => { this.clients.delete(ws) })
                ws.on('error', (error) => { log.error('[LivcapServer] Client error:', error); this.clients.delete(ws) })
            })
            
            this.wss.on('listening', () => {
                log.info(`[LivcapServer] WebSocket server started on port ${this.port}`)
                this.startLivcapProcess()
                resolve()
            })
            
            this.wss.on('error', (error) => {
                log.error('[LivcapServer] WebSocket server error:', error)
                reject(error)
            })
        })
    }
    
    stop() {
        return new Promise((resolve) => {
            log.info('[LivcapServer] Stopping...')
            
            if (this.livcapProcess) {
                try { this.livcapProcess.stdin.write('EXIT\n') } catch(e) {}
                setTimeout(() => {
                    if (this.livcapProcess) {
                        this.livcapProcess.kill('SIGTERM')
                        this.livcapProcess = null
                    }
                }, 1000)
            }
            
            for (const client of this.clients) {
                try { client.close() } catch(e) {}
            }
            this.clients.clear()
            
            if (this.wss) {
                this.wss.close(() => { resolve() })
            } else {
                resolve()
            }
        })
    }
    
    startLivcapProcess() {
        if (this.livcapProcess) return
        
        if (!fs.existsSync(this.livcapPath)) {
            log.error(`[LivcapServer] Livcap binary not found at: ${this.livcapPath}`)
            this.broadcast({ type: 'error', message: 'Livcap binary not found. Please build it from livcap/Sources/main.swift' })
            return
        }
        
        log.info(`[LivcapServer] Starting Livcap process: ${this.livcapPath}`)
        
        this.livcapProcess = spawn(this.livcapPath, [], { stdio: ['pipe', 'pipe', 'pipe'] })
        let buffer = ''
        
        this.livcapProcess.stdout.on('data', (data) => {
            buffer += data.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            
            for (const line of lines) {
                if (line.startsWith('LIVCAP:')) {
                    try {
                        const message = JSON.parse(line.substring(7))
                        this.handleLivcapMessage(message)
                    } catch (e) {
                        log.error('[LivcapServer] Failed to parse:', e)
                    }
                } else if (line.trim()) {
                    log.info(`[Livcap] ${line}`)
                }
            }
        })
        
        this.livcapProcess.stderr.on('data', (data) => log.warn(`[Livcap stderr]: ${data}`))
        this.livcapProcess.on('close', (code) => { this.livcapProcess = null; this.isListening = false })
        this.livcapProcess.on('error', (error) => {
            log.error('[LivcapServer] Process error:', error)
            this.broadcast({ type: 'error', message: `Livcap error: ${error.message}` })
        })
    }
    
    handleLivcapMessage(message) {
        log.info(`[LivcapServer] ${message.type}: "${message.transcript}"`)
        
        switch (message.type) {
            case 'start':
                this.isListening = true
                this.broadcast({ type: 'status', status: 'listening', message: 'Listening for speech...' })
                break
            case 'stop':
                this.isListening = false
                this.broadcast({ type: 'status', status: 'stopped', message: 'Stopped listening' })
                break
            case 'partial':
                this.partialTranscript = message.transcript
                this.broadcast({ type: 'partial', transcript: message.transcript })
                break
            case 'final':
                this.handleFinalTranscript(message)
                break
            case 'error':
                this.broadcast({ type: 'error', message: message.transcript })
                break
        }
    }
    
    handleFinalTranscript(message) {
        const transcript = message.transcript.trim()
        if (!transcript) return
        
        const now = Date.now()
        if (now - this.lastSpeakerTime > this.silenceThreshold) {
            this.speakerCounter++
            this.currentSpeaker = `Speaker ${this.speakerCounter + 1}`
        }
        this.lastSpeakerTime = now
        
        const entry = {
            id: Date.now().toString(),
            speaker: this.currentSpeaker,
            text: transcript,
            timestamp: new Date().toISOString()
        }
        this.transcriptBuffer.push(entry)
        this.partialTranscript = ''
        this.broadcast({ type: 'transcript', ...entry })
        
        if (now - this.lastSummaryTime >= this.summaryCooldown) {
            this.generateSummary()
            this.lastSummaryTime = now
        }
    }
    
    async generateSummary() {
        if (this.transcriptBuffer.length === 0) return
        
        const recentTranscripts = this.transcriptBuffer.slice(-5).map(t => `${t.speaker}: ${t.text}`).join('\n')
        const prompt = `Based on this meeting transcript, provide a brief summary and any action items:\n\n${recentTranscripts}\n\nRespond in this format:\nSUMMARY: <brief summary>\nACTION_ITEMS: <any action items, or "None">`
        
        try {
            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: this.summaryModel, prompt, stream: false })
            })
            
            if (!response.ok) throw new Error(`Ollama returned ${response.status}`)
            
            const data = await response.json()
            const responseText = data.response || ''
            const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?:\n|$)/i)
            const actionsMatch = responseText.match(/ACTION_ITEMS:\s*(.+?)(?:\n|$)/i)
            
            this.broadcast({
                type: 'summary',
                summary: summaryMatch ? summaryMatch[1].trim() : responseText.trim(),
                actionItems: actionsMatch ? actionsMatch[1].trim() : null,
                speaker: this.currentSpeaker,
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            log.error('[LivcapServer] Summary error:', error)
        }
    }
    
    handleClientMessage(message) {
        try {
            const data = JSON.parse(message)
            if (data.type === 'get-transcripts') {
                this.broadcast({ type: 'sync', transcripts: this.transcriptBuffer })
            }
        } catch (e) {}
    }
    
    broadcast(message) {
        const json = JSON.stringify(message)
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) client.send(json)
        }
    }
    
    getStatus() {
        return { listening: this.isListening, transcriptCount: this.transcriptBuffer.length, currentSpeaker: this.currentSpeaker }
    }
}

const audioManager = new AudioManager()
const summarizer = new Summarizer()
const livcapServer = new LivcapServer({ port: 8766 })

// Legacy Deepgram support (can be removed later)
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
