// Web-based audio manager using browser MediaRecorder API
// Includes Web Speech API for real-time transcription

class AudioManager {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.onAudioChunk = null;
    this.recordingInterval = null;
    
    // Speech recognition
    this.recognition = null;
    this.onTranscript = null;
    this.lastTranscriptTime = Date.now();
    this.transcriptBuffer = '';
  }

  async listDevices() {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          isBlackHole: device.label?.toLowerCase().includes('blackhole') ||
                       device.label?.toLowerCase().includes('virtual')
        }));

      return audioInputs;
    } catch (error) {
      console.error('Error listing devices:', error);
      throw error;
    }
  }

  // Initialize Web Speech API
  initSpeechRecognition(onTranscript) {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.onTranscript = onTranscript;

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Only send final transcripts to avoid duplicates
      if (finalTranscript.trim()) {
        console.log('Final transcript:', finalTranscript);
        if (this.onTranscript) {
          this.onTranscript(finalTranscript.trim());
        }
        this.lastTranscriptTime = Date.now();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart recognition on no-speech error
        this.restartRecognition();
      }
    };

    this.recognition.onend = () => {
      // Restart if still recording
      if (this.isRecording && this.recognition) {
        this.restartRecognition();
      }
    };

    return true;
  }

  restartRecognition() {
    if (this.isRecording && this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn('Could not restart recognition:', e);
      }
    }
  }

  async startRecording(deviceId, onAudioChunk, onTranscript) {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    try {
      // Get audio stream
      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.onAudioChunk = onAudioChunk;
      this.audioChunks = [];
      this.isRecording = true;

      // Create audio context for processing
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(this.mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (!this.isRecording) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send to callback
        if (this.onAudioChunk) {
          this.onAudioChunk(new Uint8Array(pcmData.buffer));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Also record using MediaRecorder for potential playback
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: this.getSupportedMimeType()
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000);

      // Start speech recognition
      if (!this.initSpeechRecognition(onTranscript)) {
        console.log('Speech recognition not available - using manual mode');
      } else {
        try {
          this.recognition.start();
          console.log('Speech recognition started');
        } catch (e) {
          console.warn('Could not start speech recognition:', e);
        }
      }

      console.log('Recording started');
    } catch (error) {
      this.isRecording = false;
      throw error;
    }
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    console.log('Recording stopped');
  }

  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  getRecordingState() {
    return {
      isRecording: this.isRecording
    };
  }
}

export { AudioManager };
