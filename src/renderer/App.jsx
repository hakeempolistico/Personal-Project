import React, { useState, useEffect, useRef } from 'react'
import LiveTranscript from './components/LiveTranscript'
import ControlPanel from './components/ControlPanel'
import Summaries from './components/Summaries'
import DeviceSelector from './components/DeviceSelector'
import StatusBar from './components/StatusBar'
import { AudioManager } from '../utils/audioManager'
import { checkOllama, summarize as apiSummarize, getMeetingSummary as apiGetMeetingSummary } from '../utils/api'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [devices, setDevices] = useState([])
  const [transcripts, setTranscripts] = useState([])
  const [summaries, setSummaries] = useState([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [ollamaAvailable, setOllamaAvailable] = useState(null)
  const [meetingDuration, setMeetingDuration] = useState(0)
  const [error, setError] = useState(null)
  
  const durationIntervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const audioManagerRef = useRef(null)
  const speakerCounterRef = useRef(0)
  const lastSpeakerTimeRef = useRef(Date.now())
  const currentSpeakerRef = useRef('Speaker 1')
  const silenceThreshold = 10000 // 10 seconds

  // Initialize
  useEffect(() => {
    loadDevices()
    checkOllamaStatus()
    
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.stopRecording()
      }
    }
  }, [])

  // Update duration every second
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setMeetingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [isRecording])

  const loadDevices = async () => {
    try {
      const audioManager = new AudioManager()
      audioManagerRef.current = audioManager
      const deviceList = await audioManager.listDevices()
      setDevices(deviceList)
      
      // Auto-select BlackHole if available
      const blackhole = deviceList.find(d => d.isBlackHole)
      if (blackhole) {
        setSelectedDevice(blackhole.id)
      } else if (deviceList.length > 0) {
        setSelectedDevice(deviceList[0].id)
      }
    } catch (err) {
      setError('Failed to load audio devices: ' + err.message)
    }
  }

  const checkOllamaStatus = async () => {
    try {
      const result = await checkOllama()
      setOllamaAvailable(result.available)
    } catch (err) {
      setOllamaAvailable(false)
    }
  }

  const processAudioChunk = async (audioChunk) => {
    // Calculate audio level
    const level = Math.abs(audioChunk.reduce((sum, b) => sum + (b - 128), 0) / audioChunk.length)
    setAudioLevel(Math.min(level / 50, 1))
  }

  const processTranscript = async (text) => {
    if (!text || text.trim().length < 3) return

    // Speaker detection
    const now = Date.now()
    if (now - lastSpeakerTimeRef.current > silenceThreshold) {
      speakerCounterRef.current++
      currentSpeakerRef.current = `Speaker ${speakerCounterRef.current + 1}`
    }
    lastSpeakerTimeRef.current = now

    // Create transcript entry
    const transcriptEntry = {
      id: Date.now().toString(),
      speaker: currentSpeakerRef.current,
      text: text.trim(),
      timestamp: new Date().toISOString()
    }

    // Add to transcripts
    setTranscripts(prev => [...prev, transcriptEntry])

    // Generate summary with Ollama
    if (ollamaAvailable) {
      try {
        const result = await apiSummarize(text, currentSpeakerRef.current)
        if (result.summary) {
          setSummaries(prev => {
            const existing = prev.findIndex(s => s.speaker === currentSpeakerRef.current)
            if (existing >= 0) {
              const updated = [...prev]
              updated[existing] = { ...updated[existing], summary: result.summary }
              return updated
            }
            return [...prev, { speaker: currentSpeakerRef.current, summary: result.summary }]
          })
        }
      } catch (err) {
        console.error('Summary error:', err)
      }
    }
  }

  const startRecording = async () => {
    if (!selectedDevice) {
      setError('Please select an audio device first')
      return
    }

    try {
      setError(null)
      speakerCounterRef.current = 0
      currentSpeakerRef.current = 'Speaker 1'
      lastSpeakerTimeRef.current = Date.now()

      await audioManagerRef.current.startRecording(selectedDevice, processAudioChunk, processTranscript)
      setIsRecording(true)
      startTimeRef.current = Date.now()
      setMeetingDuration(0)
    } catch (err) {
      setError('Failed to start recording: ' + err.message)
    }
  }

  const stopRecording = async () => {
    try {
      audioManagerRef.current.stopRecording()
      setIsRecording(false)
    } catch (err) {
      setError('Failed to stop recording: ' + err.message)
    }
  }

  const clearTranscript = () => {
    setTranscripts([])
    setSummaries([])
    setMeetingDuration(0)
    startTimeRef.current = null
  }

  const exportTranscript = (format) => {
    let content, filename, mimeType
    
    if (format === 'markdown') {
      content = '# Meeting Transcript\n\n'
      content += `*Generated on ${new Date().toLocaleString()}*\n\n`
      content += '## Transcript\n\n'
      for (const t of transcripts) {
        content += `**${t.speaker}** (${new Date(t.timestamp).toLocaleTimeString()}):\n${t.text}\n\n`
      }
      if (summaries.length > 0) {
        content += '## Summaries\n\n'
        for (const s of summaries) {
          content += `### ${s.speaker}\n${s.summary}\n\n`
        }
      }
      filename = `meeting-transcript-${new Date().toISOString().split('T')[0]}.md`
      mimeType = 'text/markdown'
    } else {
      content = 'MEETING TRANSCRIPT\n'
      content += '='.repeat(50) + '\n\n'
      content += `Generated: ${new Date().toLocaleString()}\n\n`
      for (const t of transcripts) {
        content += `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.speaker}: ${t.text}\n\n`
      }
      if (summaries.length > 0) {
        content += '\n' + '='.repeat(50) + '\n'
        content += 'SUMMARIES\n'
        content += '='.repeat(50) + '\n\n'
        for (const s of summaries) {
          content += `${s.speaker}:\n${s.summary}\n\n`
        }
      }
      filename = `meeting-transcript-${new Date().toISOString().split('T')[0]}.txt`
      mimeType = 'text/plain'
    }
    
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">MeetingTranscriber</h1>
              <p className="text-xs text-gray-400">Local • Private • Free</p>
            </div>
          </div>
          
          <StatusBar 
            isRecording={isRecording}
            audioLevel={audioLevel}
            duration={meetingDuration}
            ollamaAvailable={ollamaAvailable}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls + Transcript */}
          <div className="lg:col-span-2 space-y-6">
            <DeviceSelector 
              devices={devices}
              selectedDevice={selectedDevice}
              onSelect={setSelectedDevice}
              disabled={isRecording}
            />

            <ControlPanel
              isRecording={isRecording}
              onStart={startRecording}
              onStop={stopRecording}
              onClear={clearTranscript}
              onExport={exportTranscript}
              hasTranscript={transcripts.length > 0}
            />

            <LiveTranscript 
              transcripts={transcripts}
              isRecording={isRecording}
            />
          </div>

          {/* Right Column: Summaries */}
          <div className="lg:col-span-1">
            <Summaries 
              summaries={summaries}
              ollamaAvailable={ollamaAvailable}
              isRecording={isRecording}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass border-t border-gray-700/50 px-6 py-3 mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>100% Local Processing • No Internet Required</span>
          <span>
            {devices.length} audio device(s) detected • 
            {ollamaAvailable ? ' Ollama connected' : ' Ollama not available'}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
