#!/bin/bash
# Livcap Build Script
# Builds the Livcap Swift module for on-device transcription

set -e

echo "Building Livcap..."

cd "$(dirname "$0")"

# Check if Swift is available
if ! command -v swift &> /dev/null; then
    echo "Error: Swift is not installed or not in PATH"
    echo "Please install Xcode or Swift from https://swift.org/download/"
    exit 1
fi

# Build the package
echo "Running swift build..."
swift build -c release

# Find the built binary
BINARY_PATH=".build/release/livcap"

if [ -f "$BINARY_PATH" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "   Binary location: $(pwd)/$BINARY_PATH"
    echo ""
    echo "To run Livcap:"
    echo "  1. Grant microphone and speech recognition permissions when prompted"
    echo "  2. Run: ./$BINARY_PATH"
    echo ""
    echo "The binary outputs JSON transcripts to stdout prefixed with 'LIVCAP:'"
else
    echo "Error: Build failed - binary not found"
    exit 1
fi
