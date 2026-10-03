#!/bin/bash
# ============================================================================
# PERMANENT GLOBAL & LOCAL FSDI AGENTS/SKILLS SYNC
# ============================================================================
# Syncs FSDI agents and commands from USB/local root into:
#   1. Global Agent Skills:       ~/.agents/skills/
#   2. Claude Code Skills:        ~/.claude/skills/
#   3. Claude Code Commands:      ~/.claude/commands/
#   4. Gemini/Antigravity Config: ~/.gemini/config/skills/
#   5. DSH Workspace Skills:      <workspace>/.agents/skills/
#   6. DSH Isolated Skills:       <workspace>/.dsh-isolated/skills/
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FSDI_ROOT="${FSDI_ROOT:-/run/media/rakib/884050c7-61f0-4705-b22b-dd68b37f67f8/FSDI}"

if [ ! -d "$FSDI_ROOT/commands/fsdi" ] || [ ! -d "$FSDI_ROOT/agents" ]; then
  echo "❌ FSDI root not found: $FSDI_ROOT" >&2
  echo "   Please check if the drive is mounted or pass FSDI_ROOT=/path/to/FSDI" >&2
  exit 1
fi

TARGET_SKILL_DIRS=(
  "$HOME/.agents/skills"
  "$HOME/.claude/skills"
  "$HOME/.gemini/config/skills"
  "$SCRIPT_DIR/.agents/skills"
  "$SCRIPT_DIR/.dsh-isolated/skills"
)

TARGET_CMD_DIRS=(
  "$HOME/.claude/commands"
)

for d in "${TARGET_SKILL_DIRS[@]}"; do
  mkdir -p "$d"
done

for d in "${TARGET_CMD_DIRS[@]}"; do
  mkdir -p "$d"
done

to_skill_name() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g; s/--*/-/g; s/^-//; s/-$//'
}

AGENTS_COUNT=0
COMMANDS_COUNT=0

# --- 1. Sync Agents ---
for src in "$FSDI_ROOT"/agents/*.md; do
  [ -e "$src" ] || continue
  filename="$(basename "$src")"
  agent_name="${filename%.md}"
  
  for dir in "${TARGET_SKILL_DIRS[@]}"; do
    skill_dir="$dir/$agent_name"
    mkdir -p "$skill_dir"
    ln -sfn "$src" "$skill_dir/SKILL.md"
  done
  AGENTS_COUNT=$((AGENTS_COUNT + 1))
done

# --- 2. Sync Commands ---
for src in "$FSDI_ROOT"/commands/fsdi/*.md; do
  [ -e "$src" ] || continue
  base="$(basename "$src" .md)"
  raw_name="fsdi:$base"
  name="$(to_skill_name "$raw_name")"
  desc="$(sed -n 's/^description:[[:space:]]*//p' "$src" | head -1)"
  desc="$(printf '%s' "$desc" | sed 's/^"\(.*\)"$/\1/; s/^'"'"'\(.*\)'"'"'$/\1/')"
  hint="$(sed -n 's/^argument-hint:[[:space:]]*//p' "$src" | head -1)"
  
  if [ -z "$desc" ]; then
    continue
  fi

  for dir in "${TARGET_SKILL_DIRS[@]}"; do
    skill_dir="$dir/$name"
    mkdir -p "$skill_dir"
    {
      echo "---"
      echo "name: $name"
      echo "description: $desc (FSDI command)"
      echo "---"
      echo ""
      echo "# FSDI command: $raw_name"
      echo ""
      echo "Source definition: $src"
      echo ""
      echo "Read that file and follow it exactly as the \`/$raw_name\` or \`/$name\` command."
      if [ -n "$hint" ]; then
        echo "Argument hint: $hint"
      fi
    } > "$skill_dir/SKILL.md"
  done

  # Also sync to Claude commands folder
  for dir in "${TARGET_CMD_DIRS[@]}"; do
    ln -sfn "$src" "$dir/$base.md"
    ln -sfn "$src" "$dir/fsdi-$base.md"
  done

  COMMANDS_COUNT=$((COMMANDS_COUNT + 1))
done

echo "============================================================================"
echo "✅ FSDI AGENTS & COMMANDS PERMANENTLY SYNCED!"
echo "============================================================================"
echo "  • Agents synced:   $AGENTS_COUNT"
echo "  • Commands synced: $COMMANDS_COUNT"
echo "  • Synergized for: Claude Code, OpenCode, Gemini/Antigravity, DeepSeek Harness"
echo "============================================================================"
