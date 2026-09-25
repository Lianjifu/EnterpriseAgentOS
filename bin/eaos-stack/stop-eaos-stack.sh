#!/usr/bin/env bash
# Stop all EAOS stack processes.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/eaos-env.sh"

stopped=0
for name in eaos-gateway eaos-vite eaos-deapp eaos-eosapp; do
  pidfile="$EAOS_LOG_DIR/$name.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo "stopping $name (pid=$pid)"
      kill "$pid" 2>/dev/null || true
      stopped=$((stopped+1))
    fi
    rm -f "$pidfile"
  fi
done

# also kill anything listening on EAOS ports (in case pidfile is stale)
for p in "$EAOS_FRONTEND_PORT" "$EAOS_LISTEN_PORT" "$EAOS_EOSAPP_PORT"; do
  pids=$(lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      cmdline=$(ps -p "$pid" -o command= 2>/dev/null | head -c 60)
      if [[ "$cmdline" =~ eaos- ]] || [[ "$cmdline" =~ vite\.js.*--port\ $EAOS_FRONTEND_PORT ]]; then
        echo "stopping port :$p occupant (pid=$pid)"
        kill "$pid" 2>/dev/null || true
        stopped=$((stopped+1))
      fi
    fi
  done
done

echo "stopped $stopped process(es)"
sleep 1