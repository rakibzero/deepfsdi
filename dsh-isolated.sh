#!/bin/bash
# ============================================================================
# ISOLATED DeepSeek Harness launcher — unrestricted, no conflicts.
# ============================================================================
# Uses ONLY the repo-local home dir (.dsh-isolated/), never ~/.dsh, so other
# installed versions are untouched. No git involvement.
#
# Usage:
#   bash dsh-isolated.sh web                        # Web GUI
#   bash dsh-isolated.sh headless "your task"        # CLI one-shot
#   bash dsh-isolated.sh --profile sdk               # SDK server
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/isolated-env.sh"

echo "🏠 Isolated home: $DSH_HOME  (your ~/.dsh and other versions untouched)"
exec pnpm --dir "$SCRIPT_DIR" dsh "$@"
