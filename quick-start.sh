#!/bin/bash
# QUICK START - One command to install everything

cd /home/rakib/Desktop/deepfsdi

echo "🚀 DeepSeek Harness Unrestricted Setup - Quick Start"
echo ""
echo "This will:"
echo "  ✅ Install full permissions config"
echo "  ✅ Enable 2-hour timeouts (7200000ms), no retry"
echo "  ✅ Disable all approval prompts"
echo "  ✅ Configure for local models"
echo ""

# Run installer
bash install-unrestricted.sh

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Configure your local model:"
echo "   nano .env"
echo "   # Set OPENAI_BASE_URL and OPENAI_MODEL"
echo ""
echo "2. Start your model server:"
echo "   ollama serve"
echo ""
echo "3. Launch DeepSeek Harness:"
echo "   dsh web"
echo ""
echo "📖 Read README_COMPLETE.md for full documentation"
