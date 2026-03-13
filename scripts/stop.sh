#!/bin/bash
# Stop all speech-and-debate services

echo "Stopping speech-and-debate services..."

# Next.js dev servers (ports 3000 and 4000)
if pkill -f "next dev" 2>/dev/null; then
  echo "  Stopped Next.js dev server(s)."
else
  echo "  Next.js dev server not running."
fi

# Next.js production server
if pkill -f "next start" 2>/dev/null; then
  echo "  Stopped Next.js production server."
fi

# Ollama
if pgrep -x ollama > /dev/null 2>&1; then
  pkill -x ollama 2>/dev/null
  echo "  Stopped Ollama."
else
  echo "  Ollama not running."
fi

# Caddy (started with sudo, so stop with sudo)
if pgrep -x caddy > /dev/null 2>&1; then
  sudo pkill -x caddy 2>/dev/null
  echo "  Stopped Caddy."
else
  echo "  Caddy not running."
fi

# Whisper (whisper-cli or whisper processes)
if pkill -f "whisper" 2>/dev/null; then
  echo "  Stopped Whisper."
fi

echo "Done."
