#!/bin/bash
# Start Caddy if not already running

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CADDYFILE="$SCRIPT_DIR/../Caddyfile"

if pgrep -x caddy > /dev/null 2>&1; then
  echo "Caddy already running."
  exit 0
fi

echo "Starting Caddy..."
sudo caddy run --config "$CADDYFILE" > /tmp/caddy.log 2>&1 &
CADDY_PID=$!

# Wait briefly to confirm it started
sleep 2
if kill -0 "$CADDY_PID" 2>/dev/null; then
  echo "Caddy started (pid $CADDY_PID)."
else
  echo "Caddy failed to start. Check /tmp/caddy.log for details." >&2
  exit 1
fi
