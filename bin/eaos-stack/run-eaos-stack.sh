#!/usr/bin/env bash
# Start the EAOS stack: gateway + Vite (and optionally de-app if not running).
# Distinct from digital-employee-platform/scripts/dev-stack/run-stack.sh —
# EAOS owns its own ports, env names, log dir, and PID tracking.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/eaos-env.sh"
mkdir -p "$EAOS_LOG_DIR"

log() { printf "[%s] %s\n" "$(date '+%H:%M:%S')" "$*"; }

# Stop existing EAOS processes
for name in eaos-gateway eaos-vite eaos-deapp eaos-eosapp; do
  if [ -f "$EAOS_LOG_DIR/$name.pid" ]; then
    pid=$(cat "$EAOS_LOG_DIR/$name.pid")
    if kill -0 "$pid" 2>/dev/null; then
      log "stop existing $name (pid=$pid)"
      kill "$pid" 2>/dev/null || true
      sleep 1
    fi
    rm -f "$EAOS_LOG_DIR/$name.pid"
  fi
done

# Start de-app (currently the only backend available; eos-app needs PG + Vault)
if [ -x "$EAOS_DEAPP_BIN" ]; then
  log "starting de-app on :$EAOS_BACKEND_PORT (host=$EAOS_BACKEND_HOST) — log: $EAOS_LOG_DIR/eaos-deapp.log"
  nohup "$EAOS_DEAPP_BIN" >"$EAOS_LOG_DIR/eaos-deapp.log" 2>&1 &
  echo $! >"$EAOS_LOG_DIR/eaos-deapp.pid"
  sleep 3
fi

# Start EAOS gateway
log "starting eaos-gateway on :$EAOS_LISTEN_PORT → :$EAOS_BACKEND_PORT — log: $EAOS_LOG_DIR/eaos-gateway.log"
nohup bash "$HERE/eaos-gateway.sh" >"$EAOS_LOG_DIR/eaos-gateway.log" 2>&1 &
echo $! >"$EAOS_LOG_DIR/eaos-gateway.pid"
sleep 2

# Start Vite
log "starting eaos-vite on :$EAOS_FRONTEND_PORT (proxy → $EAOS_VITE_PROXY_TARGET) — log: $EAOS_LOG_DIR/eaos-vite.log"
cd "$(cd "$HERE/../.." && pwd)/frontend/web"
nohup pnpm exec vite --port "$EAOS_FRONTEND_PORT" --host "$EAOS_FRONTEND_HOST" --strictPort \
  >"$EAOS_LOG_DIR/eaos-vite.log" 2>&1 &
echo $! >"$EAOS_LOG_DIR/eaos-vite.pid"
sleep 4

log "EAOS stack ready."
echo ""
"$HERE/status-eaos-stack.sh"