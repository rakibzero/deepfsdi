#!/bin/bash
# ============================================================================
# FSDI PLUGIN MODE — expose FSDI commands + agents as harness skills.
# ============================================================================
# Symlinks FSDI agents and generates thin shims for FSDI commands into the
# isolated home's skill root (.dsh-isolated/skills/), which the harness scans
# automatically (user-dsh root, no composition change needed).
#
# Symlinks (not copies): the USB drive stays the source of truth; updates on
# the drive are picked up live by the skill watcher. Re-run after adding files.
#
# Usage:
#   bash fsdi-sync-skills.sh
#   FSDI_ROOT=/other/path bash fsdi-sync-skills.sh   # override source
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FSDI_ROOT="${FSDI_ROOT:-/run/media/rakib/884050c7-61f0-4705-b22b-dd68b37f67f8/FSDI}"
TARGET="$SCRIPT_DIR/.dsh-isolated/skills"

if [ ! -d "$FSDI_ROOT/commands/fsdi" ] || [ ! -d "$FSDI_ROOT/agents" ]; then
  echo "❌ FSDI root not found: $FSDI_ROOT" >&2
  echo "   Is the USB drive mounted? Or set FSDI_ROOT=/path/to/FSDI" >&2
  exit 1
fi

mkdir -p "$TARGET"
SYMLINKED=0
SHIMMED=0

# --- 1. Agents: names are already kebab-case, symlink directly ---------------
for src in "$FSDI_ROOT"/agents/*.md; do
  base="$(basename "$src")"
  ln -sfn "$src" "$TARGET/$base"
  SYMLINKED=$((SYMLINKED + 1))
done

# --- 2. Commands: 'fsdi:do' names are not valid skill names, generate shims --
to_skill_name() {
  # lowercase, ':' and anything non [a-z0-9-] becomes '-', trim edge dashes
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g; s/--*/-/g; s/^-//; s/-$//'
}

for src in "$FSDI_ROOT"/commands/fsdi/*.md; do
  base="$(basename "$src" .md)"
  raw_name="fsdi:$base"
  name="$(to_skill_name "$raw_name")"
  desc="$(sed -n 's/^description:[[:space:]]*//p' "$src" | head -1)"
  # Strip one layer of surrounding single/double quotes so the appended suffix
  # keeps the YAML scalar valid (a quoted "..." followed by text would not parse).
  desc="$(printf '%s' "$desc" | sed 's/^"\(.*\)"$/\1/; s/^'"'"'\(.*\)'"'"'$/\1/')"
  hint="$(sed -n 's/^argument-hint:[[:space:]]*//p' "$src" | head -1)"
  if [ -z "$desc" ]; then
    echo "⚠️  skipped $base: no description frontmatter" >&2
    continue
  fi
  {
    echo "---"
    echo "name: $name"
    echo "description: $desc (FSDI command)"
    echo "---"
    echo ""
    echo "# FSDI command: $raw_name (local shim)"
    echo ""
    echo "The full definition lives at:"
    echo "$src"
    echo ""
    echo "Read that file and follow it exactly as the \`/$raw_name\` command."
    if [ -n "$hint" ]; then
      echo "Argument hint: $hint"
    fi
  } > "$TARGET/$name.md"
  SHIMMED=$((SHIMMED + 1))
done

echo "✅ FSDI plugin mode synced from $FSDI_ROOT"
echo "   agents symlinked: $SYMLINKED | command shims: $SHIMMED"
echo "   skill root: $TARGET (scanned automatically, no restart needed)"
