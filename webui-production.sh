#!/bin/bash
# ============================================================================
# PRODUCTION WebUI — one command to serve the isolated harness UI.
# ============================================================================
# 1. Rebuilds the frontend dist when stale (vite build = production: minified,
#    MODE=production baked into every client bundle).
# 2. Serves it through the isolated harness (own home dir, 2hr timeouts,
#    danger-full-access, no telemetry, FSDI skills) — never ~/.dsh.
#
# Usage:
#   bash webui-production.sh                  # serve on 3080, no browser
#   bash webui-production.sh --open            # also open the browser
#   WEBUI_PORT=8080 bash webui-production.sh  # custom port
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/isolated-env.sh"

# --- 1. Production frontend dist: rebuild only when stale --------------------
DIST="$SCRIPT_DIR/apps/web/dist/index.html"
if [ ! -f "$DIST" ]; then
  echo "🔨 No frontend dist — building production bundle..."
  NEED_BUILD=1
elif [ -n "$(find "$SCRIPT_DIR/apps/web/src" -newer "$DIST" -print -quit 2>/dev/null)" ]; then
  echo "🔨 Frontend sources newer than dist — rebuilding production bundle..."
  NEED_BUILD=1
else
  echo "✅ Frontend dist is fresh (production build)."
  NEED_BUILD=0
fi

if [ "$NEED_BUILD" = "1" ]; then
  NODE_ENV=production pnpm --dir "$SCRIPT_DIR" run build:web
  echo "✅ Production bundle built."
fi

# --- 2. Serve through the isolated harness ------------------------------------
PORT="${WEBUI_PORT:-3080}"
ARGS=(web --no-open --port "$PORT")
if [ "${1:-}" = "--open" ]; then
  ARGS=(web --port "$PORT")
fi

echo "🏠 Isolated home: $DSH_HOME  (your ~/.dsh and other versions untouched)"
echo "🚀 Serving PRODUCTION WebUI on http://127.0.0.1:$PORT (token printed below)"
exec pnpm --dir "$SCRIPT_DIR" dsh "${ARGS[@]}"
