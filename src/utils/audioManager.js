// Web-based audio manager using browser MediaRecorder API

class AudioManager {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.onAudioChunk = null;
    this.recordingInterval = null;
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
          isBlackHole: device.label?.toLowerCase().includes('blackhole')
        }));

      return audioInputs;
    } catch (error) {
      console.error('Error listing devices:', error);
      throw error;
    }
  }

  async startRecording(deviceId, onAudioChunk) {
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

      this.mediaRecorder.start(1000); // Collect data every second

      console.log('Recording started');
    } catch (error) {
      this.isRecording = false;
      throw error;
    }
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;

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
