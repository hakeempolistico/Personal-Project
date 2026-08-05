# Livcap Module

On-device speech-to-text transcription using Apple's Speech framework.

## Building

```bash
cd livcap
swift build -c release
```

The compiled binary will be at `.build/release/livcap`.

## Usage

The Livcap binary:
- Outputs transcript messages to stdout in JSON format with `LIVCAP:` prefix
- Reads commands from stdin: `START`, `STOP`, `EXIT`
- Requires microphone and speech recognition permissions (requested on first run)

### Permissions Required
- **Microphone Access**: Required for audio input
- **Speech Recognition**: Required for on-device transcription

Grant permissions in:
- System Preferences > Privacy & Security > Microphone
- System Preferences > Privacy & Security > Speech Recognition

## Output Format

Each transcript message is output as:
```
LIVCAP:{"type":"partial"|"final"|"start"|"stop"|"error","transcript":"...","isFinal":true|false,"timestamp":"...","confidence":0.95}
```

## Integration with Node.js

The Node.js backend (`../src/server/`) spawns this process and parses the output to:
1. Maintain a running transcript buffer
2. Send finalized segments to Ollama for summarization
3. Stream results to the Electron UI via WebSocket
