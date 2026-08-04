import React from 'react'

function Summaries({ summaries, ollamaAvailable, isRecording }) {
  const getSpeakerColor = (speaker) => {
    const num = parseInt(speaker.replace('Speaker ', '')) || 1
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-yellow-500 to-yellow-600',
      'from-red-500 to-red-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-cyan-500 to-cyan-600',
      'from-lime-500 to-lime-600',
    ]
    return colors[(num - 1) % colors.length]
  }

  return (
    <div className="glass rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold">AI Summaries</h2>
            <p className="text-xs text-gray-400">
              {ollamaAvailable ? 'Generated locally' : 'Ollama not available'}
            </p>
          </div>
        </div>

        {/* Ollama Status */}
        {!ollamaAvailable && (
          <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
            Setup Required
          </div>
        )}
      </div>

      {/* Setup Instructions if Ollama not available */}
      {!ollamaAvailable && (
        <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm">
              <p className="text-yellow-300 font-medium">Ollama not installed</p>
              <p className="text-yellow-400/70 mt-1 text-xs">
                Install Ollama to enable AI summarization:
              </p>
              <code className="block mt-2 p-2 bg-yellow-900/50 rounded text-xs text-yellow-200">
                brew install ollama<br/>
                ollama pull llama3.2
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Summaries List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {summaries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm">
              {isRecording 
                ? 'Summaries will appear as speakers finish reporting...'
                : 'Start recording to generate AI summaries'
              }
            </p>
          </div>
        ) : (
          summaries.map((item, index) => (
            <div 
              key={item.speaker} 
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getSpeakerColor(item.speaker)} flex items-center justify-center text-white font-bold text-sm`}>
                  {item.speaker.split(' ')[1] || 'S'}
                </div>
                <span className="font-medium text-gray-200">{item.speaker}</span>
                {isRecording && (
                  <div className="ml-auto">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                      Live
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-300 leading-relaxed">
                {item.summary.split('\n').map((line, i) => (
                  <p key={i} className={line.startsWith('•') || line.startsWith('-') ? 'ml-2' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      {summaries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 text-xs text-gray-500">
          <p>
            Summaries are generated locally using Llama 3.2 via Ollama.
            No data is sent to external servers.
          </p>
        </div>
      )}
    </div>
  )
}

export default Summaries
