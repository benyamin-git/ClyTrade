#!/usr/bin/env bash
set -euo pipefail

PORT="${LIVE_SERVER_PORT:-7401}"
HOST="0.0.0.0"
LOG="/tmp/clytrade-liveserver.log"
PIDFILE="/tmp/clytrade-liveserver.pid"

cd "$(dirname "$0")/.."

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $PORT is already in use. Stop that process or set LIVE_SERVER_PORT." >&2
  exit 1
fi

nohup ./node_modules/.bin/vite --host "$HOST" --port "$PORT" --strictPort >"$LOG" 2>&1 &
echo "$!" >"$PIDFILE"

echo "Live server on http://$HOST:$PORT"
echo "Log:  $LOG"
echo "Stop: kill \$(cat $PIDFILE)"
