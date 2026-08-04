# 🚀 Quick Start Guide

## For macOS - One-Time Setup

### 1. Run the Installation Script

```bash
cd meeting-transcriber
./install-mac.sh
```

This will install:
- BlackHole 2ch (virtual audio driver)
- Ollama (local AI)
- Sox (audio processing)
- All Node.js dependencies

### 2. Set Up Audio (Important!)

#### For Meeting Apps (Zoom, Teams, Meet, Google Meet):

1. **Open Audio MIDI Setup**
   ```
   Finder → Applications → Utilities → Audio MIDI Setup
   ```

2. **Create Aggregate Device**
   - Click the **+** button at the bottom
   - Select **Create Aggregate Device**
   - Name it: `Meeting Audio`

3. **Configure the Device**
   - Check: ✅ BlackHole 2ch
   - Check: ✅ Your speakers/headphones
   - Check: ✅ "Use This Device For Sound Output"

4. **In Your Meeting App**
   - Go to Audio Settings
   - Set Output to: **Meeting Audio**

### 3. Set Up Ollama (for AI Summaries)

Ollama should auto-start, but if you need to start it manually:

```bash
brew services start ollama
```

Or:
```bash
ollama serve
```

### 4. Start the App

#### Development Mode:
```bash
npm run dev
```

#### Production Build:
```bash
npm run build
```
Then open `release/MeetingTranscriber-1.0.0.dmg`

---

## Using the App

### First Launch:
1. Select **BlackHole 2ch** from the device list
2. Click **Start Recording**
3. Join your meeting (audio should flow through BlackHole)

### During the Meeting:
- Watch **Live Transcript** for real-time transcription
- View **AI Summaries** panel for generated summaries
- Each speaker is automatically detected and labeled

### After the Meeting:
1. Click **Stop Recording**
2. Click **Export** → Choose Markdown or TXT
3. Save or share your transcript

---

## Troubleshooting

### "No audio devices found"
```bash
# Reinstall BlackHole
brew reinstall blackhole-2ch

# Restart the app
```

### "Ollama not available"
```bash
# Start Ollama
ollama serve

# Check if running
curl http://localhost:11434/api/tags
```

### "Transcription not working"
```bash
# Install sox
brew install sox

# Restart the app
```

### "Can't hear meeting audio"
- Open **Audio MIDI Setup**
- Verify "Meeting Audio" is checked
- In your meeting app, verify output is set to "Meeting Audio"

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Start Recording | Click "Start Recording" button |
| Stop Recording | Click "Stop Recording" button |
| Export | Click "Export" dropdown |
| Copy | Click "Copy All" button |

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| macOS | 12.0+ | 14.0+ |
| RAM | 8GB | 16GB |
| Storage | 5GB | 10GB |
| CPU | Intel | M1/M2/M3/M4 |

---

## Cost

**$0 forever** - All processing happens locally on your Mac!

- whisper.cpp: Free, open-source transcription
- Ollama + Llama 3.2: Free, local AI
- BlackHole: Free, open-source

---

## Need Help?

Check the full README.md for detailed documentation.
