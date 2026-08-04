const express = require('express');
const cors = require('cors');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    deepgramConfigured: !!DEEPGRAM_API_KEY
  });
});

// Check Ollama availability
app.get('/api/check-ollama', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/version`);
    if (!response.ok) {
      return res.json({ available: false, error: 'Ollama not responding' });
    }

    const versionData = await response.json();

    const modelsResponse = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!modelsResponse.ok) {
      return res.json({ available: false, error: 'Cannot get models' });
    }

    const modelsData = await modelsResponse.json();
    const hasModel = modelsData.models?.some(m => m.name.startsWith(DEFAULT_MODEL));

    res.json({
      available: hasModel,
      version: versionData.version,
      model: DEFAULT_MODEL,
      hasModel,
      availableModels: modelsData.models || [],
      deepgramAvailable: !!DEEPGRAM_API_KEY
    });
  } catch (error) {
    res.json({ available: false, error: error.message, deepgramAvailable: !!DEEPGRAM_API_KEY });
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to get models' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Summarize transcript
app.post('/api/summarize', async (req, res) => {
  try {
    const { transcript, speakerName, model } = req.body;

    if (!transcript || transcript.trim().length < 10) {
      return res.json({ summary: null, error: 'Transcript too short' });
    }

    const prompt = `You are a meeting assistant. Summarize the following speech transcript into key bullet points.

Speaker: ${speakerName || 'Speaker'}
Transcript: "${transcript}"

Provide a concise summary with:
- Main topics discussed
- Key decisions or conclusions
- Any action items mentioned

Keep it to 3-5 bullet points. Be concise and capture the essence.`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 256
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    res.json({ summary: data.response?.trim() });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate meeting summary
app.post('/api/meeting-summary', async (req, res) => {
  try {
    const { transcripts, model } = req.body;

    if (!transcripts || transcripts.length === 0) {
      return res.json({ summary: null, error: 'No transcripts provided' });
    }

    const formattedTranscript = transcripts.map(t => 
      `[${t.speaker}]: ${t.text}`
    ).join('\n');

    const prompt = `You are a meeting assistant. Create a comprehensive summary of this meeting transcript.

Transcript:
${formattedTranscript}

Provide:
1. Meeting Overview (2-3 sentences)
2. Key Discussion Points
3. Decisions Made
4. Action Items (if any)
5. Next Steps

Be thorough but concise.`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 512
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    res.json({ summary: data.response?.trim() });
  } catch (error) {
    console.error('Meeting summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Create HTTP server for WebSocket
const server = http.createServer(app);

// WebSocket server for Deepgram streaming
const wss = new WebSocketServer({ server, path: '/ws/transcribe' });

wss.on('connection', (ws) => {
  console.log('New transcription WebSocket connection');
  
  let deepgramSocket = null;

  // Connect to Deepgram
  const connectToDeepgram = () => {
    if (!DEEPGRAM_API_KEY) {
      console.error('Deepgram API key not configured');
      ws.send(JSON.stringify({ error: 'Deepgram not configured' }));
      return;
    }

    const deepgramUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&interim_results=true';
    
    // Use native WebSocket for Deepgram connection
    deepgramSocket = new globalThis.WebSocket(deepgramUrl, {
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`
      }
    });

    deepgramSocket.onopen = () => {
      console.log('Connected to Deepgram');
      ws.send(JSON.stringify({ type: 'connected' }));
    };

    deepgramSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;
          const isFinal = data.is_final;
          const confidence = data.channel.alternatives[0].confidence;
          
          ws.send(JSON.stringify({
            type: 'transcript',
            text: transcript,
            isFinal,
            confidence
          }));
        }
      } catch (e) {
        console.error('Error parsing Deepgram message:', e);
      }
    };

    deepgramSocket.onclose = () => {
      console.log('Deepgram connection closed');
      ws.send(JSON.stringify({ type: 'disconnected' }));
    };

    deepgramSocket.onerror = (error) => {
      console.error('Deepgram error:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    };
  };

  connectToDeepgram();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'audio') {
        if (deepgramSocket && deepgramSocket.readyState === 1) {
          deepgramSocket.send(message);
        }
      } else if (data.type === 'start') {
        console.log('Transcription started');
        ws.send(JSON.stringify({ type: 'status', status: 'transcribing' }));
      } else if (data.type === 'stop') {
        console.log('Transcription stopped');
        if (deepgramSocket) {
          deepgramSocket.close();
        }
      }
    } catch (e) {
      if (deepgramSocket && deepgramSocket.readyState === 1) {
        deepgramSocket.send(message);
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (deepgramSocket) {
      deepgramSocket.close();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 MeetingTranscriber server running at http://localhost:${PORT}`);
  console.log(`📡 Ollama endpoint: ${OLLAMA_URL}`);
  console.log(`🤖 Default model: ${DEFAULT_MODEL}`);
  console.log(`🎤 Deepgram: ${DEEPGRAM_API_KEY ? 'Configured' : 'Not configured'}`);
});
