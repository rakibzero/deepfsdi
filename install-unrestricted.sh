#!/bin/bash
# ============================================================================
# UNRESTRICTED DEEPSEEK HARNESS INSTALLER
# ============================================================================
# Automatically configures DeepSeek Harness for full permissions and local models
# Usage: bash install-unrestricted.sh
# ============================================================================

set -e

echo "============================================================================"
echo "🚀 DeepSeek Harness UNRESTRICTED Configuration Installer"
echo "============================================================================"
echo ""
echo "⚠️  WARNING: This will configure DeepSeek Harness with:"
echo "   - NO approval prompts"
echo "   - NO safety checks"
echo "   - FULL filesystem access"
echo "   - 2-hour timeouts (7200000ms)"
echo "   - Disabled telemetry"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Installation cancelled."
    exit 0
fi

echo ""
echo "📦 Installing unrestricted configuration..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Isolated home: repo-local dir by default, so other versions (~/.dsh) never conflict.
# Override with DSH_HOME=/custom/path only if you know what you are doing.
SCRIPT_DIR_DEFAULT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSH_HOME="${DSH_HOME:-$SCRIPT_DIR_DEFAULT/.dsh-isolated}"
mkdir -p "$DSH_HOME/profiles/web"
mkdir -p "$DSH_HOME/profiles/headless"
mkdir -p "$DSH_HOME/profiles/sdk"
mkdir -p "$DSH_HOME/profiles/sdk-minimal"
mkdir -p "$DSH_HOME/profiles/acp"

echo "✅ Created profile directories"

# Copy cordis patch to all profiles
for profile in web headless sdk sdk-minimal acp; do
    cp "$SCRIPT_DIR/unrestricted.cordis.patch.yml" "$DSH_HOME/profiles/$profile/cordis.patch.yml"
    echo "✅ Installed unrestricted config for profile: $profile"
done

# Copy environment file
if [ -f "$SCRIPT_DIR/.env.unrestricted" ]; then
    if [ -f "$SCRIPT_DIR/.env" ]; then
        echo ""
        echo "⚠️  Existing .env file found!"
        read -p "Overwrite existing .env? (yes/no): " overwrite_env
        if [ "$overwrite_env" = "yes" ]; then
            cp "$SCRIPT_DIR/.env.unrestricted" "$SCRIPT_DIR/.env"
            echo "✅ Replaced .env with unrestricted configuration"
        else
            echo "⏭️  Keeping existing .env (you can manually copy .env.unrestricted)"
        fi
    else
        cp "$SCRIPT_DIR/.env.unrestricted" "$SCRIPT_DIR/.env"
        echo "✅ Created .env file"
    fi
fi

# Copy settings file (optional)
if [ -f "$SCRIPT_DIR/settings.unrestricted.json" ]; then
    echo ""
    read -p "Install settings.json to ~/.dsh/settings.json? (yes/no): " install_settings
    if [ "$install_settings" = "yes" ]; then
        if [ -f "$DSH_HOME/settings.json" ]; then
            cp "$DSH_HOME/settings.json" "$DSH_HOME/settings.json.backup"
            echo "📦 Backed up existing settings to settings.json.backup"
        fi
        cp "$SCRIPT_DIR/settings.unrestricted.json" "$DSH_HOME/settings.json"
        echo "✅ Installed settings.json"
    else
        echo "⏭️  Skipped settings.json installation"
    fi
fi

echo ""
echo "============================================================================"
echo "✅ INSTALLATION COMPLETE!"
echo "============================================================================"
echo ""
echo "📋 Configuration Summary:"
echo "   • All profiles: unrestricted mode enabled"
echo "   • Timeouts: 2 hours (7200 seconds), extended 4 hours"
echo "   • Permissions: danger-full-access"
echo "   • Safety checks: DISABLED"
echo "   • Telemetry: DISABLED"
echo ""
echo "📁 Files installed:"
echo "   • $DSH_HOME/profiles/*/cordis.patch.yml"
echo "   • $SCRIPT_DIR/.env"
if [ "$install_settings" = "yes" ]; then
    echo "   • $DSH_HOME/settings.json"
fi
echo ""
echo "🔧 Next Steps:"
echo ""
echo "1. Configure your local model in .env:"
echo "   nano $SCRIPT_DIR/.env"
echo "   # Set OPENAI_BASE_URL and OPENAI_MODEL"
echo ""
echo "2. Start your local model server:"
echo "   ollama serve                    # For Ollama"
echo "   # or lm-studio, vllm, etc."
echo ""
echo "3. Launch DeepSeek Harness:"
echo "   cd $SCRIPT_DIR"
echo "   dsh web                         # Web GUI"
echo "   dsh headless \"your task\"        # CLI"
echo "   dsh --profile sdk               # SDK server"
echo ""
echo "📖 Full documentation: $SCRIPT_DIR/UNRESTRICTED_SETUP.md"
echo ""
echo "⚠️  SECURITY REMINDER:"
echo "   This configuration has NO SAFETY RESTRICTIONS."
echo "   Use only on isolated systems with trusted models."
echo ""
echo "============================================================================"
echo "🎉 Ready to use DeepSeek Harness with unrestricted access!"
echo "============================================================================"
