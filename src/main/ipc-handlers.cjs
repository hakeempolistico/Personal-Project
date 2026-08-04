const log = require('electron-log')
const { AudioManager } = require('./audioManager.cjs')
const { Transcriber } = require('./transcriber.cjs')
const { Summarizer } = require('./summarizer.cjs')

const audioManager = new AudioManager()
const transcriber = new Transcriber()
const summarizer = new Summarizer()

let currentWindow = null
let speakerCounter = 0
let lastSpeakerTime = Date.now()
let currentSpeaker = 'Speaker 1'
let silenceThreshold = 10000 // 10 seconds of silence = new speaker

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

  // Start recording
  ipcMain.handle('start-recording', async (event, deviceId) => {
    try {
      log.info('Starting recording with device:', deviceId)
      speakerCounter = 0
      currentSpeaker = 'Speaker 1'
      lastSpeakerTime = Date.now()

      await audioManager.startRecording(deviceId, async (audioChunk) => {
        // Send audio level for visualization
        if (currentWindow && !currentWindow.isDestroyed()) {
          const level = Math.abs(audioChunk.reduce((sum, b) => sum + (b - 128), 0) / audioChunk.length)
          currentWindow.webContents.send('audio-level', Math.min(level / 50, 1))
        }

        // Check if we should switch speakers (silence detection)
        const now = Date.now()
        if (now - lastSpeakerTime > silenceThreshold) {
          speakerCounter++
          currentSpeaker = `Speaker ${speakerCounter + 1}`
          lastSpeakerTime = now
        }

        // Transcribe the audio chunk
        const text = await transcriber.transcribe(audioChunk)
        
        if (text && text.trim()) {
          lastSpeakerTime = Date.now()
          
          const transcriptEntry = {
            id: Date.now().toString(),
            speaker: currentSpeaker,
            text: text.trim(),
            timestamp: new Date().toISOString()
          }

          // Send transcript to renderer
          if (currentWindow && !currentWindow.isDestroyed()) {
            currentWindow.webContents.send('transcript-update', transcriptEntry)

            // Generate summary for this segment (debounced)
            setTimeout(async () => {
              const summary = await summarizer.summarize(text, currentSpeaker)
              if (summary && currentWindow && !currentWindow.isDestroyed()) {
                currentWindow.webContents.send('summary-update', {
                  speaker: currentSpeaker,
                  summary
                })
              }
            }, 2000)
          }
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
      
      // Generate full meeting summary
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

  log.info('IPC handlers setup complete')
}

module.exports = { setupIpcHandlers }
