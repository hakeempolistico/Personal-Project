const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Audio devices
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  
  // Recording controls
  startRecording: (deviceId) => ipcRenderer.invoke('start-recording', deviceId),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getRecordingState: () => ipcRenderer.invoke('get-recording-state'),
  
  // Ollama
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  getMeetingSummary: (transcripts) => ipcRenderer.invoke('get-meeting-summary', transcripts),
  
  // Deepgram
  setDeepgramKey: (apiKey) => ipcRenderer.invoke('set-deepgram-key', apiKey),
  
  // Export
  exportTranscript: (data) => ipcRenderer.invoke('export-transcript', data),
  
  // Event listeners
  onTranscriptUpdate: (callback) => {
    ipcRenderer.on('transcript-update', (event, data) => callback(data))
  },
  
  onTranscriptInterim: (callback) => {
    ipcRenderer.on('transcript-interim', (event, data) => callback(data))
  },
  
  onSummaryUpdate: (callback) => {
    ipcRenderer.on('summary-update', (event, data) => callback(data))
  },
  
  onAudioLevel: (callback) => {
    ipcRenderer.on('audio-level', (event, data) => callback(data))
  },
  
  onRecordingStopped: (callback) => {
    ipcRenderer.on('recording-stopped', () => callback())
  },
  
  onTrayStartRecording: (callback) => {
    ipcRenderer.on('tray-start-recording', () => callback())
  },
  
  onTrayStopRecording: (callback) => {
    ipcRenderer.on('tray-stop-recording', () => callback())
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
