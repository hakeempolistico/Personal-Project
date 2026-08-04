#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# MeetingTranscriber - Installation Script for macOS
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  MeetingTranscriber - Setup for macOS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
step() {
    echo -e "${BLUE}►${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    warn "This script is designed for macOS."
    echo "However, we'll continue with the setup..."
fi

echo ""
echo "This script will install:"
echo "  1. BlackHole 2ch (virtual audio driver)"
echo "  2. Ollama (local AI engine)"
echo "  3. Llama 3.2 model (for summaries)"
echo "  4. Sox (for audio capture)"
echo ""

# Check for Homebrew
step "Checking for Homebrew..."
if command -v brew &> /dev/null; then
    success "Homebrew is installed"
    brew --version
else
    error "Homebrew is not installed"
    echo ""
    echo "Please install Homebrew first:"
    echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    exit 1
fi

echo ""
step "Updating Homebrew..."
brew update

# Install BlackHole
echo ""
step "Installing BlackHole 2ch (virtual audio driver)..."
if brew list blackhole-2ch &> /dev/null; then
    success "BlackHole 2ch is already installed"
else
    brew install blackhole-2ch
    success "BlackHole 2ch installed"
fi

# Install Sox
echo ""
step "Installing Sox (audio processing)..."
if brew list sox &> /dev/null; then
    success "Sox is already installed"
else
    brew install sox
    success "Sox installed"
fi

# Install Ollama
echo ""
step "Installing Ollama (local AI engine)..."
if brew list ollama &> /dev/null; then
    success "Ollama is already installed"
else
    brew install ollama
    success "Ollama installed"
fi

# Install Whisper model for Ollama
echo ""
step "Installing Llama 3.2 model (this may take a few minutes)..."
if ollama list | grep -q "llama3.2"; then
    success "Llama 3.2 is already installed"
else
    ollama pull llama3.2
    success "Llama 3.2 installed"
fi

# Verify Ollama is working
echo ""
step "Verifying Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    success "Ollama is running"
else
    warn "Ollama is not running. Starting it now..."
    brew services start ollama
    sleep 2
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        success "Ollama is now running"
    else
        warn "Could not start Ollama. You may need to run 'ollama serve' manually."
    fi
fi

# Install npm dependencies
echo ""
step "Installing Node.js dependencies..."
if command -v node &> /dev/null; then
    npm install
    success "Dependencies installed"
else
    error "Node.js is not installed"
    echo ""
    echo "Please install Node.js first:"
    echo "  brew install node"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Set up Audio MIDI (for meeting audio capture):"
echo "   - Open Applications → Utilities → Audio MIDI Setup"
echo "   - Click + → Create Aggregate Device"
echo "   - Check 'BlackHole 2ch' and your speakers"
echo "   - Name it 'Meeting Audio'"
echo ""
echo "2. In your meeting app (Zoom, Teams, etc.):"
echo "   - Set audio output to 'Meeting Audio'"
echo ""
echo "3. Start the app:"
echo "   npm run dev"
echo ""
echo "4. Build for production (creates .app file):"
echo "   npm run build"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
