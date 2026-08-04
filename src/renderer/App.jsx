import React, { useState, useEffect, useRef, useCallback } from 'react'
import LiveTranscript from './components/LiveTranscript'
import ControlPanel from './components/ControlPanel'
import Summaries from './components/Summaries'
import DeviceSelector from './components/DeviceSelector'
import StatusBar from './components/StatusBar'

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

  // Load devices on mount
  useEffect(() => {
    loadDevices()
    checkOllama()
    
    // Set Deepgram API key from localStorage
    const deepgramKey = localStorage.getItem('deepgramKey')
    if (deepgramKey) {
      window.electronAPI?.setDeepgramKey(deepgramKey)
    }
    // User should set their Deepgram key via the ControlPanel UI
  }, [])

  // Setup electron event listeners
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onTranscriptUpdate((entry) => {
        setTranscripts(prev => [...prev, entry])
      })

      window.electronAPI.onTranscriptInterim((text) => {
        // Show interim transcript (not yet finalized)
        // You can display this in a different style if desired
      })

      window.electronAPI.onSummaryUpdate((data) => {
        setSummaries(prev => {
          const existing = prev.findIndex(s => s.speaker === data.speaker)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = { ...updated[existing], summary: data.summary }
            return updated
          }
          return [...prev, { speaker: data.speaker, summary: data.summary }]
        })
      })

      window.electronAPI.onAudioLevel((level) => {
        setAudioLevel(level)
      })

      window.electronAPI.onRecordingStopped(() => {
        setIsRecording(false)
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
        }
      })

      window.electronAPI.onTrayStartRecording(() => {
        if (!isRecording && selectedDevice) {
          startRecording()
        }
      })

      window.electronAPI.onTrayStopRecording(() => {
        if (isRecording) {
          stopRecording()
        }
      })
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('transcript-update')
        window.electronAPI.removeAllListeners('summary-update')
        window.electronAPI.removeAllListeners('audio-level')
        window.electronAPI.removeAllListeners('recording-stopped')
        window.electronAPI.removeAllListeners('tray-start-recording')
        window.electronAPI.removeAllListeners('tray-stop-recording')
      }
    }
  }, [isRecording, selectedDevice])

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
      const result = await window.electronAPI.getAudioDevices()
      if (result.success) {
        setDevices(result.devices)
        // Auto-select BlackHole if available
        const blackhole = result.devices.find(d => d.isBlackHole)
        if (blackhole) {
          setSelectedDevice(blackhole)
        } else if (result.devices.length > 0) {
          setSelectedDevice(result.devices[0])
        }
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load audio devices')
    }
  }

  const checkOllama = async () => {
    try {
      const result = await window.electronAPI.checkOllama()
      setOllamaAvailable(result.available)
    } catch (err) {
      setOllamaAvailable(false)
    }
  }

  const startRecording = async () => {
    if (!selectedDevice) {
      setError('Please select an audio device first')
      return
    }

    try {
      setError(null)
      const result = await window.electronAPI.startRecording(selectedDevice)
      if (result.success) {
        setIsRecording(true)
        startTimeRef.current = Date.now()
        setMeetingDuration(0)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to start recording')
    }
  }

  const stopRecording = async () => {
    try {
      await window.electronAPI.stopRecording()
      setIsRecording(false)
    } catch (err) {
      setError('Failed to stop recording')
    }
  }

  const clearTranscript = () => {
    setTranscripts([])
    setSummaries([])
    setMeetingDuration(0)
    startTimeRef.current = null
  }

  const exportTranscript = async (format) => {
    try {
      const result = await window.electronAPI.exportTranscript({
        format,
        transcripts,
        summaries
      })
      
      const blob = new Blob([result.content], { type: result.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-transcript-${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : 'txt'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to export transcript')
    }
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
