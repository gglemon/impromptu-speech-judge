#!/bin/bash
# Only start Ollama/deepseek if LLM_PROVIDER is "ollama" (or not set)

# Load .env.local if it exists
if [ -f "$(dirname "$0")/../.env.local" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env.local" | grep 'LLM_PROVIDER' | xargs)
fi

LLM_PROVIDER="${LLM_PROVIDER:-ollama}"

if [ "$LLM_PROVIDER" != "ollama" ]; then
  echo "LLM_PROVIDER=$LLM_PROVIDER — skipping Ollama startup."
  exit 0
fi

MODEL="deepseek-r1:latest"
OLLAMA_URL="http://localhost:11434"

# Start Ollama if not already running
if ! curl -s "$OLLAMA_URL" > /dev/null 2>&1; then
  echo "Starting Ollama..."
  ollama serve > /tmp/ollama.log 2>&1 &
  # Wait for it to be ready
  for i in $(seq 1 20); do
    sleep 1
    if curl -s "$OLLAMA_URL" > /dev/null 2>&1; then
      echo "Ollama started."
      break
    fi
  done
else
  echo "Ollama already running."
fi

# Warm up the model (send a tiny request so it loads into GPU)
echo "Loading $MODEL into memory..."
curl -s -X POST "$OLLAMA_URL/api/chat" \
  -H "content-type: application/json" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"stream\":false,\"think\":false}" \
  > /dev/null 2>&1
echo "$MODEL ready."
