#!/bin/bash
# ============================================================================
# RUN — the one script. Isolated unrestricted harness, production WebUI.
# ============================================================================
#   bash run.sh                  Serve PRODUCTION WebUI on :3080 (default)
#   bash run.sh --open           Serve + open browser
#   bash run.sh headless "task"  Run a one-shot task instead of the WebUI
#   bash run.sh --profile sdk    Any other dsh invocation, same isolated home
#
# Every run: isolated home (.dsh-isolated, never ~/.dsh) → FSDI skills sync →
# fresh production frontend → launch. No git, no conflicts.
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/isolated-env.sh"

echo "🏠 Isolated home: $DSH_HOME  (your ~/.dsh and other versions untouched)"

# --- 1. FSDI plugin mode (warn-and-continue if the USB drive is unmounted) ---
if [ -d "${FSDI_ROOT:-/run/media/rakib/884050c7-61f0-4705-b22b-dd68b37f67f8/FSDI}/commands/fsdi" ]; then
  bash "$SCRIPT_DIR/fsdi-sync-skills.sh"
else
  echo "⚠️  FSDI drive not mounted — continuing without FSDI skills."
  echo "   Mount it, or set FSDI_ROOT=/path/to/FSDI and re-run."
fi

# --- 2. Arguments given: run them as a dsh invocation with auto-retry -------
if [ "$#" -gt 0 ] && [ "$1" != "--open" ]; then
  echo "🚀 Launching CLI task with Auto-Retry on connection loss..."
  until pnpm --dir "$SCRIPT_DIR" dsh "$@"; do
    echo "⚠️  CLI connection lost or stopped mid-work. Auto-retrying last request in 3s..." >&2
    sleep 3
  done
  exit 0
fi

# --- 3. No arguments (or --open): serve the PRODUCTION WebUI -----------------
DIST="$SCRIPT_DIR/apps/web/dist/index.html"
if [ ! -f "$DIST" ] || [ -n "$(find "$SCRIPT_DIR/apps/web/src" -newer "$DIST" -print -quit 2>/dev/null)" ]; then
  echo "🔨 (Re)building production frontend bundle..."
  NODE_ENV=production pnpm --dir "$SCRIPT_DIR" run build:web
  echo "✅ Production bundle built."
else
  echo "✅ Frontend dist is fresh (production build)."
fi

PORT="${WEBUI_PORT:-3080}"
# Free port if held by a previous zombie process to prevent EADDRINUSE loops
fuser -k -9 "$PORT/tcp" 2>/dev/null || true

if [ "${1:-}" = "--open" ]; then
  echo "🚀 Serving PRODUCTION WebUI on http://127.0.0.1:$PORT (browser opening)"
  until pnpm --dir "$SCRIPT_DIR" dsh web --port "$PORT"; do
    echo "⚠️  WebUI connection lost or process exited. Auto-restarting server in 3s..." >&2
    fuser -k -9 "$PORT/tcp" 2>/dev/null || true
    sleep 2
  done
else
  echo "🚀 Serving PRODUCTION WebUI on http://127.0.0.1:$PORT (token printed below)"
  until pnpm --dir "$SCRIPT_DIR" dsh web --no-open --port "$PORT"; do
    echo "⚠️  WebUI connection lost or process exited. Auto-restarting server in 3s..." >&2
    fuser -k -9 "$PORT/tcp" 2>/dev/null || true
    sleep 2
  done
fi
