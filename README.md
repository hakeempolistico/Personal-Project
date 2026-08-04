# 🎙️ MeetingTranscriber

A **100% local** real-time meeting transcription and summarization app for macOS.

- **No internet required** for transcription/summarization
- **No API costs** - completely free forever
- **Speaker identification** with automatic diarization
- **Auto-generated summaries** for each speaker's report

---

## 📋 Prerequisites

Before installing, you need to set up two tools:

### Step 1: Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

For Apple Silicon Macs, add Homebrew to your PATH:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Step 2: Install BlackHole (Audio Virtual Device)

BlackHole captures audio from your meeting apps (Zoom, Teams, Meet, etc.)

```bash
brew install blackhole-2ch
```

After installation:
1. Open **Audio MIDI Setup** (Applications → Utilities)
2. Click the **+** button → **Create Aggregate Device**
3. Check both:
   - ✅ BlackHole 2ch
   - ✅ Your Mac's speakers or headphones
4. Name it "Meeting Audio" and check "Use This Device For Sound Output"
5. In your meeting app, set the audio output to "Meeting Audio"

### Step 3: Install Ollama (for Summarization)

Ollama runs AI models locally on your Mac.

```bash
brew install ollama
```

After installation, download the Llama 3.2 model:
```bash
ollama pull llama3.2
```

This downloads ~2GB and may take a few minutes.

---

## 🚀 Installation

### Option A: Build from Source

```bash
# Clone or download this project
cd meeting-transcriber

# Install dependencies
npm install

# Start the app in development mode
npm run dev
```

### Option B: Build the App (creates .app file)

```bash
# Install dependencies
npm install

# Build for macOS
npm run build
```

The built app will be in `release/` folder.

---

## 📱 How to Use

### 1. Configure Audio Device

On first launch:
1. The app will show available audio devices
2. Select **BlackHole 2ch** (or your configured aggregate device)
3. Click **Connect**

### 2. Set Up Your Meeting App

In Zoom/Teams/Meet:
1. Set audio output to your aggregate device ("Meeting Audio")
2. Make a test call to verify audio routing

### 3. Start Transcribing

1. Click **▶️ Start Recording**
2. Join your meeting
3. Watch the **Live Transcript** panel for real-time transcription
4. Each speaker's report will be automatically summarized

### 4. Export Results

After the meeting:
- Click **📄 Export** → Choose Markdown or TXT
- Copy transcript to clipboard
- Save for later reference

---

## ⚙️ System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|--------------|
| macOS | 12.0+ | 14.0+ |
| RAM | 8GB | 16GB |
| Storage | 5GB free | 10GB free |
| CPU | Intel/Apple Silicon | M1/M2/M3/M4 |

**Note:** The app uses CPU for whisper.cpp transcription and Ollama for summarization. Your Mac may get warm during long meetings.

---

## 🔧 Troubleshooting

### "BlackHole not appearing in device list"

1. Restart the app
2. Check System Settings → Privacy & Security → Microphone → Enable for your app
3. Verify BlackHole is installed: `brew list blackhole-2ch`

### "Ollama connection failed"

1. Make sure Ollama is running: `brew services start ollama`
2. Or manually start: `ollama serve`
3. Verify model is installed: `ollama list`

### "Transcription is slow"

This is normal for local processing. To improve:
- Close other apps
- Use Apple Silicon Mac (faster than Intel)
- Reduce audio chunk size (in Settings)

### "No audio detected"

1. Check macOS System Settings → Privacy & Security → Microphone
2. Ensure your meeting app outputs to BlackHole
3. Test with QuickTime Player → File → New Audio Recording

---

## 🗂️ Project Structure

```
meeting-transcriber/
├── src/
│   ├── main/
│   │   ├── index.js           # Electron main process
│   │   ├── audioManager.js     # Audio capture from BlackHole
│   │   ├── transcriber.js      # whisper.cpp integration
│   │   ├── summarizer.js       # Ollama integration
│   │   └── ipc-handlers.js     # IPC communication
│   ├── preload/
│   │   └── preload.js          # Secure bridge
│   └── renderer/
│       ├── App.jsx            # Main React component
│       └── components/        # UI components
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop App | Electron | Cross-platform desktop framework |
| Frontend | React + Vite | Modern reactive UI |
| Audio Capture | BlackHole + microphone-api | Capture meeting audio |
| Transcription | whisper.cpp | Local speech-to-text |
| Summarization | Ollama + Llama 3.2 | Local AI summaries |
| Styling | Tailwind CSS | Clean, modern UI |

---

## 📄 License

MIT License - Use freely for personal and commercial projects.

---

## 🙏 Acknowledgments

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - OpenAI Whisper ported to C/C++
- [Ollama](https://ollama.ai/) - Run LLMs locally
- [BlackHole](https://existential.audio/blackhole/) - Virtual audio driver for macOS
- [Electron](https://www.electronjs.org/) - Desktop app framework

---

**Made with ❤️ for productive meetings**
