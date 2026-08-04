import React, { useState } from 'react'

function ControlPanel({ isRecording, onStart, onStop, onClear, onExport, hasTranscript }) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [deepgramKey, setDeepgramKey] = useState(localStorage.getItem('deepgramKey') || '')
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('deepgramKey'))

  const handleSaveDeepgramKey = () => {
    if (deepgramKey.trim()) {
      localStorage.setItem('deepgramKey', deepgramKey.trim())
      window.electronAPI?.setDeepgramKey(deepgramKey.trim())
      setShowKeyInput(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      {/* Deepgram API Key Input */}
      {showKeyInput && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <div className="flex-1">
              <p className="text-yellow-300 font-medium">Deepgram API Key Required</p>
              <p className="text-yellow-400/70 text-sm mt-1">
                Get a free key at <a href="https://console.deepgram.com/" target="_blank" rel="noopener noreferrer" className="underline">console.deepgram.com</a>
              </p>
              <div className="flex gap-2 mt-2">
                <input
                  type="password"
                  value={deepgramKey}
                  onChange={(e) => setDeepgramKey(e.target.value)}
                  placeholder="Enter your Deepgram API key"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                />
                <button
                  onClick={handleSaveDeepgramKey}
                  disabled={!deepgramKey.trim()}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main Controls */}
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={onStart}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Recording
            </button>
          ) : (
            <button
              onClick={onStop}
              className="btn-danger flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop Recording
            </button>
          )}

          <button
            onClick={onClear}
            disabled={!hasTranscript && !isRecording}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        </div>

        {/* Export Controls */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!hasTranscript}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => {
                  onExport('markdown')
                  setShowExportMenu(false)
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Markdown (.md)
              </button>
              <button
                onClick={() => {
                  onExport('text')
                  setShowExportMenu(false)
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Plain Text (.txt)
              </button>
            </div>
          )}
        </div>

        {/* Copy to Clipboard */}
        {hasTranscript && (
          <button
            onClick={async () => {
              const text = Array.from(document.querySelectorAll('.transcript-text'))
                .map(el => el.textContent)
                .join('\n\n')
              await navigator.clipboard.writeText(text)
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy All
          </button>
        )}
      </div>

      {/* Recording Tips */}
      {!isRecording && (
        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800/30 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-blue-300 font-medium">Ready to start</p>
              <p className="text-blue-400/70 mt-1">
                Select your audio device and click Start Recording to begin transcribing.
                Make sure your meeting audio is routed to BlackHole if capturing from apps.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-800/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-5 h-5 bg-red-500 rounded-full" />
              <div className="absolute inset-0 w-5 h-5 bg-red-500 rounded-full recording-ring" />
            </div>
            <div className="text-sm">
              <p className="text-red-300 font-medium">Recording in progress</p>
              <p className="text-red-400/70 mt-1">
                Audio is being captured and transcribed in real-time.
                Speakers will be automatically identified based on voice patterns.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ControlPanel
