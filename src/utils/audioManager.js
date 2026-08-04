// Web-based audio manager using Deepgram WebSocket streaming

class AudioManager {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.onAudioChunk = null;
    this.recordingInterval = null;
    
    // Deepgram WebSocket
    this.ws = null;
    this.onTranscript = null;
    this.audioContext = null;
    this.processor = null;
  }

  async listDevices() {
    try {
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

  connectWebSocket(onTranscript) {
    this.onTranscript = onTranscript;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/transcribe`;
    
    console.log('Connecting to transcription server...');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to transcription server');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Deepgram connected and ready');
        } else if (data.type === 'transcript') {
          if (data.isFinal && data.text.trim()) {
            console.log('Final transcript:', data.text);
            if (this.onTranscript) {
              this.onTranscript(data.text.trim());
            }
          }
        } else if (data.type === 'error') {
          console.error('Transcription error:', data.error);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  async startRecording(deviceId, onAudioChunk, onTranscript) {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    try {
      this.connectWebSocket(onTranscript);
      await new Promise(resolve => setTimeout(resolve, 500));

      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.onAudioChunk = onAudioChunk;
      this.audioChunks = [];
      this.isRecording = true;

      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (!this.isRecording) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          this.ws.send(pcmData.buffer);
        }

        if (this.onAudioChunk) {
          const level = Math.abs(inputData.reduce((sum, b) => sum + Math.abs(b), 0) / inputData.length);
          this.onAudioChunk(new Uint8Array(new Int16Array([Math.floor(level * 32768)]).buffer));
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: this.getSupportedMimeType()
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000);
      console.log('Recording started with Deepgram streaming');
    } catch (error) {
      this.isRecording = false;
      throw error;
    }
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
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
