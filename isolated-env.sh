# ============================================================================
# Shared isolated-harness environment. Sourced (not executed) by
# dsh-isolated.sh and webui-production.sh. Single source of truth.
# Expects SCRIPT_DIR to be set by the caller (repo root of this harness).
# ============================================================================

export DSH_HOME="$SCRIPT_DIR/.dsh-isolated"

# Load repo .env if the user created one (optional overrides), else fall back
# to the isolated defaults below. Never touches ~/.dsh or global env files.
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
elif [ -f "$DSH_HOME/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$DSH_HOME/.env"
  set +a
fi

# Always production: the Web UI serves only built dist assets (no dev server
# ships), client bundles bake NODE_ENV at build, and this pins every host-side
# runtime check (e.g. store deep-freeze skip) to production too. Forced, not
# conditional — even a user .env cannot drop the UI into development mode.
export NODE_ENV=production
export DSH_PRODUCTION="${DSH_PRODUCTION:-true}"

# Isolated unrestricted defaults (2-hour timeouts, no retry, no telemetry).
# Explicit exports win over any file above, so slow local models always get time.
# NOTE: DSH_* must be exported — no .env file may set them (boot refuses).
export DSH_PERMISSION_MODE="${DSH_PERMISSION_MODE:-danger-full-access}"
export DSH_TELEMETRY_MODE="${DSH_TELEMETRY_MODE:-DISABLED}"
export DSH_TELEMETRY_DISABLED="${DSH_TELEMETRY_DISABLED:-1}"
export DSH_TOOLS_MODE="${DSH_TOOLS_MODE:-native}"
export TOOL_TIMEOUT_MS="${TOOL_TIMEOUT_MS:-7200000}"
export EXTENDED_TIMEOUT_MS="${EXTENDED_TIMEOUT_MS:-14400000}"
export ENABLE_SMART_RETRY="${ENABLE_SMART_RETRY:-false}"
export MAX_RETRIES="${MAX_RETRIES:-0}"
export KILL_STUCK_OPERATIONS="${KILL_STUCK_OPERATIONS:-false}"
export DISABLE_CONTENT_FILTER="${DISABLE_CONTENT_FILTER:-true}"
export DISABLE_SAFETY_CHECKS="${DISABLE_SAFETY_CHECKS:-true}"
export SKIP_MODEL_CAPABILITY_CHECK="${SKIP_MODEL_CAPABILITY_CHECK:-true}"

mkdir -p "$DSH_HOME/profiles" "$DSH_HOME/logs"

# Symlink global ~/.dsh credentials & settings so all API keys & provider settings are shared live
if [ -f "$HOME/.dsh/.credentials.yaml" ]; then
  ln -sfn "$HOME/.dsh/.credentials.yaml" "$DSH_HOME/.credentials.yaml"
fi
if [ -f "$HOME/.dsh/settings.yaml" ]; then
  ln -sfn "$HOME/.dsh/settings.yaml" "$DSH_HOME/settings.yaml"
fi


