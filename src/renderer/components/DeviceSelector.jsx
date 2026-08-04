import React from 'react'

function DeviceSelector({ devices, selectedDevice, onSelect, disabled }) {
  // Helper to check if a device is selected
  const isSelected = (device) => {
    if (!selectedDevice) return false
    // selectedDevice can be object or string
    if (typeof selectedDevice === 'object') {
      return selectedDevice.id === device.id
    }
    return selectedDevice === device.id
  }
  
  // Helper to get device id from selection
  const getDeviceId = (device) => {
    return typeof device === 'object' ? device.id : device
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold">Audio Input Device</h2>
          <p className="text-xs text-gray-400">Select your microphone or BlackHole</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {devices.length === 0 ? (
          <div className="col-span-2 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
            <div className="flex items-center gap-2 text-yellow-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>No audio devices detected</span>
            </div>
            <p className="text-xs text-yellow-300/70 mt-1">
              Make sure you've installed BlackHole and granted microphone permissions
            </p>
          </div>
        ) : (
          devices.map((device) => (
            <button
              key={device.id}
              onClick={() => onSelect(device)}
              disabled={disabled}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${isSelected(device)
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                  ${device.isBlackHole ? 'bg-purple-500/20' : 'bg-gray-700'}
                `}>
                  {device.isBlackHole ? (
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{device.name}</p>
                  <p className="text-xs text-gray-400">
                    {device.isBlackHole ? 'Virtual Audio (for meetings)' : 'Microphone'}
                    {device.ffmpegIndex ? ` [${device.ffmpegIndex}]` : ''}
                  </p>
                </div>
                {isSelected(device) && (
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Setup Instructions */}
      <details className="mt-4">
        <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
          How to set up BlackHole for meeting audio?
        </summary>
        <div className="mt-3 p-4 bg-gray-800/50 rounded-xl text-sm text-gray-300 space-y-2">
          <p><strong>For meeting apps (Zoom, Teams, Meet):</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Open <strong>Audio MIDI Setup</strong> (Applications → Utilities)</li>
            <li>Click <strong>+</strong> → <strong>Create Aggregate Device</strong></li>
            <li>Check both <strong>BlackHole 2ch</strong> and your <strong>speakers</strong></li>
            <li>Rename it to "Meeting Audio"</li>
            <li>In your meeting app, set output to "Meeting Audio"</li>
            <li>Select "BlackHole 2ch" in this app</li>
          </ol>
        </div>
      </details>
    </div>
  )
}

export default DeviceSelector
