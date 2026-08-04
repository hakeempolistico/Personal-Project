import React, { useEffect, useRef } from 'react'

function LiveTranscript({ transcripts, isRecording }) {
  const containerRef = useRef(null)
  const lastTranscriptRef = useRef(null)

  // Auto-scroll to bottom when new transcript arrives
  useEffect(() => {
    if (transcripts.length > 0 && containerRef.current) {
      const lastEntry = containerRef.current.lastElementChild
      if (lastEntry) {
        lastEntry.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }
  }, [transcripts])

  const getSpeakerBadgeClass = (speaker) => {
    const num = parseInt(speaker.replace('Speaker ', '')) || 1
    return `speaker-badge-${((num - 1) % 8) + 1}`
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold">Live Transcript</h2>
            <p className="text-xs text-gray-400">{transcripts.length} segments recorded</p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Live</span>
          </div>
        )}
      </div>

      {/* Transcript Container */}
      <div 
        ref={containerRef}
        className="bg-gray-800/50 rounded-xl p-4 min-h-[400px] max-h-[500px] overflow-y-auto space-y-4"
      >
        {transcripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            {isRecording ? (
              <>
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="absolute -inset-2 rounded-full border-2 border-blue-400/50 animate-ping" />
                </div>
                <p className="text-blue-400 font-medium animate-pulse">
                  Listening...
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Speak into your microphone
                </p>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-center">
                  Start recording to see transcript
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Transcript will appear here automatically
                </p>
              </>
            )}
          </div>
        ) : (
          transcripts.map((entry, index) => (
            <div 
              key={entry.id} 
              className={`transcript-entry ${index === transcripts.length - 1 ? 'border-l-2 border-primary-500' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Speaker Badge */}
                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium text-white ${getSpeakerBadgeClass(entry.speaker)}`}>
                  {entry.speaker}
                </div>
                
                {/* Timestamp */}
                <span className="text-xs text-gray-500 mt-1.5">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              
              {/* Transcript Text */}
              <p className="transcript-text mt-2 text-gray-200 leading-relaxed">
                {entry.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {transcripts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              <strong className="text-gray-300">{transcripts.length}</strong> segments
            </span>
            <span>
              <strong className="text-gray-300">
                {new Set(transcripts.map(t => t.speaker)).size}
              </strong> speakers detected
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Auto-scroll enabled
          </span>
        </div>
      )}
    </div>
  )
}

export default LiveTranscript
