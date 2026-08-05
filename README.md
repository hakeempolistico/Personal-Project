# 🎙️ MeetingTranscriber

A **100% local** real-time meeting transcription and summarization app for macOS.

- **No internet required** for transcription/summarization
- **No API costs** - completely free forever
- **On-device transcription** using Apple's Speech framework
- **Smart summarization** - only on finalized speech segments
- **Speaker identification** with automatic diarization

---

## 📋 Prerequisites

Before installing, you need to set up tools:

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

### Step 3: Build Livcap (for On-Device Transcription)

Livcap uses Apple's built-in Speech framework for local transcription:

```bash
cd livcap
./build.sh
```

This requires Xcode or Swift installed on your Mac.

### Step 4: Install Ollama (for Summarization)

Ollama runs AI models locally on your Mac.

```bash
brew install ollama
```

After installation, download the Llama 3.2 model:
```bash
ollama pull llama3.2
```

---

## 🚀 Installation

### Build from Source

```bash
# Clone or download this project
cd meeting-transcriber

# Install dependencies
npm install

# Build Livcap (requires Swift)
cd livcap
./build.sh
cd ..

# Start the app in development mode
npm run dev
```

### Build the App (creates .app file)

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
3. Click **Start Recording**

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

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Electron UI                            │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │   React     │  │  Control     │  │   LiveTranscript   │   │
│  │   App       │  │  Panel       │  │   & Summaries     │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC
┌──────────────────────────▼──────────────────────────────────┐
│                    Electron Main Process                      │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │  IPC Handlers    │  │   Livcap Server (WebSocket)      │  │
│  │                  │  │   - Manages transcript buffer   │  │
│  │                  │  │   - Connects to Ollama          │  │
│  └──────────────────┘  └────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ stdout (JSON)
┌──────────────────────────▼──────────────────────────────────┐
│                    Livcap (Swift)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Apple Speech Framework                               │  │
│  │  - SFSpeechRecognizer (on-device)                     │  │
│  │  - AVAudioEngine (microphone capture)                 │  │
│  │  - Outputs JSON to stdout                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Ollama (LLM)                              │
│  - Summarizes finalized transcript segments                  │
│  - Extracts action items and decisions                      │
└─────────────────────────────────────────────────────────────┘
```

### How Transcription Works

1. **Livcap** uses Apple's on-device Speech framework for transcription
2. Transcripts are output as JSON to stdout
3. **Node.js server** parses the output and maintains a transcript buffer
4. When a speaker pauses (2+ seconds of silence), that segment is marked as "final"
5. Only finalized segments are sent to **Ollama** for summarization
6. This prevents unstable summaries from incomplete speech fragments

---

## ⚙️ System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|--------------|
| macOS | 13.0+ | 14.0+ |
| RAM | 8GB | 16GB |
| Storage | 5GB free | 10GB free |
| CPU | Apple Silicon | M1/M2/M3/M4 |

**Note:** The app uses Apple's Speech framework for transcription (very efficient) and Ollama for summarization.

---

## 🔧 Troubleshooting

### "Livcap binary not found"

1. Make sure Swift is installed: `swift --version`
2. Rebuild Livcap: `cd livcap && ./build.sh`

### "Ollama connection failed"

1. Make sure Ollama is running: `brew services start ollama`
2. Or manually start: `ollama serve`
3. Verify model is installed: `ollama list`

### "No audio detected"

1. Check macOS System Settings → Privacy & Security → Microphone
2. Check System Settings → Privacy & Security → Speech Recognition
3. Ensure your meeting app outputs to BlackHole

---

## 🗂️ Project Structure

```
meeting-transcriber/
├── src/
│   ├── main/
│   │   ├── index.cjs           # Electron main process
│   │   ├── audioManager.cjs     # Audio capture from BlackHole
│   │   ├── transcriber.cjs      # whisper.cpp integration (legacy)
│   │   ├── summarizer.cjs       # Ollama integration
│   │   └── ipc-handlers.cjs     # IPC communication
│   ├── server/
│   │   └── livcap-server.js    # Livcap process manager
│   ├── preload/
│   │   └── preload.cjs         # Secure bridge
│   └── renderer/
│       ├── App.jsx             # Main React component
│       └── components/         # UI components
├── livcap/
│   ├── Package.swift          # Swift Package definition
│   ├── Sources/main.swift       # Livcap transcription engine
│   └── build.sh                # Build script
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop App | Electron | Cross-platform desktop framework |
| Frontend | React + Vite | Modern reactive UI |
| Audio Capture | BlackHole + AVAudioEngine | Capture meeting audio |
| Transcription | Livcap + Apple Speech | On-device local speech-to-text |
| Summarization | Ollama + Llama 3.2 | Local AI summaries |
| Styling | Tailwind CSS | Clean, modern UI |

---

## 📄 License

MIT License - Use freely for personal and commercial projects.

---

## 🙏 Acknowledgments

- [Apple Speech Framework](https://developer.apple.com/documentation/speech) - On-device speech recognition
- [Ollama](https://ollama.ai/) - Run LLMs locally
- [BlackHole](https://existential.audio/blackhole/) - Virtual audio driver for macOS
- [Electron](https://www.electronjs.org/) - Desktop app framework

---

**Made with ❤️ for productive meetings**
