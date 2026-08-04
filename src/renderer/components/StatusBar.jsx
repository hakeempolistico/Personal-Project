import React from 'react'

function StatusBar({ isRecording, audioLevel, duration, ollamaAvailable }) {
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-6">
      {/* Ollama Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${ollamaAvailable ? 'bg-green-500' : 'bg-gray-500'}`} />
        <span className="text-gray-400">
          {ollamaAvailable ? 'AI Ready' : 'AI Offline'}
        </span>
      </div>

      {/* Audio Level */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-0.5 h-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  audioLevel > (i + 1) * 0.2
                    ? i < 3 ? 'bg-green-500' : 'bg-yellow-500'
                    : 'bg-gray-600'
                }`}
                style={{ height: `${4 + i * 4}px` }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-400">Audio</span>
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full recording-ring" />
          </div>
          <span className="text-red-400 font-medium animate-pulse">Recording</span>
        </div>
      )}

      {/* Duration */}
      {isRecording && (
        <div className="font-mono text-lg text-gray-300">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  )
}

export default StatusBar
