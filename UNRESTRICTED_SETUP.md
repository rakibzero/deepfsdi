# 🚀 UNRESTRICTED DEEPSEEK HARNESS CONFIGURATION
## Full Permissions for Local/Uncensored Models

This guide shows you how to run DeepSeek Harness with **ZERO restrictions** - perfect for local uncensored models like Llama, Mistral, Qwen, etc.

---

## 📋 What This Configuration Does

✅ **No Approval Prompts** - Auto-approves ALL actions  
✅ **Extended Timeouts** - 2 hours (7200000ms) instead of 60 seconds  
✅ **Full Filesystem Access** - Read/write/delete anywhere  
✅ **Disabled Safety Guardrails** - No content filtering  
✅ **Disabled Telemetry** - Complete privacy  
✅ **Native Tool Execution** - Faster, no sandbox overhead  
✅ **Unlimited Subagents** - 100 concurrent agents  
✅ **Unlimited Context** - No auto-compaction  
✅ **Production Mode** - Always optimized  

---

## 🛠️ Installation & Setup

### Step 1: Copy Configuration Files

Three files have been created in `/home/rakib/Desktop/deepfsdi/`:

```bash
cd /home/rakib/Desktop/deepfsdi

# 1. Main configuration patch
cp unrestricted.cordis.patch.yml ~/.dsh/profiles/web/cordis.patch.yml
cp unrestricted.cordis.patch.yml ~/.dsh/profiles/headless/cordis.patch.yml  
cp unrestricted.cordis.patch.yml ~/.dsh/profiles/sdk/cordis.patch.yml

# 2. Environment variables
cp .env.unrestricted .env

# 3. Settings file (optional)
cp settings.unrestricted.json ~/.dsh/settings.json
```

### Step 2: Configure Your Local Model

Edit `.env` and set your local model endpoint:

```bash
# For Ollama (most common)
OPENAI_API_KEY=ollama-local
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1:70b

# For LM Studio
# OPENAI_BASE_URL=http://localhost:1234/v1
# OPENAI_MODEL=llama-3.1-70b-instruct

# For vLLM
# OPENAI_BASE_URL=http://localhost:8000/v1
# OPENAI_MODEL=meta-llama/Llama-3.1-70B-Instruct
```

### Step 3: Launch DeepSeek Harness

```bash
# Option A: Web GUI (with unrestricted config already in profile)
dsh web

# Option B: CLI one-shot tasks
dsh headless "your task here"

# Option C: SDK server
dsh --profile sdk

# Option D: Use patch file directly (if not copied to profile)
dsh web --patch unrestricted.cordis.patch.yml
```

---

## 🎯 Usage Examples

### Example 1: Web GUI with Local Llama
```bash
# Start Ollama first
ollama serve

# Launch DeepSeek Harness
dsh web

# In browser: http://localhost:3080
# Model will auto-connect to Ollama
```

### Example 2: Headless CLI Tasks
```bash
# One-shot task with full permissions
dsh headless "analyze this entire codebase and refactor all Python files"

# Complex multi-step task
dsh headless "clone repository, analyze architecture, create documentation, commit changes"
```

### Example 3: SDK Integration
```bash
# Start SDK server
dsh --profile sdk

# From Python:
from deepseek_harness import Client

client = Client()
response = client.run("your task with full access")
```

---

## ⚙️ Configuration Details

### Timeout Settings
All timeouts set to **2 hours (7200000ms), extended 4 hours (14400000ms)**:
- Bash commands: 2 hr
- PowerShell commands: 2 hr
- Web search: 2 hr
- Web fetch: 2 hr
- Subagent execution: 2 hr
- Workflow execution: 2 hr
- LSP operations: 2 hr

### Permission Mode
```yaml
DSH_PERMISSION_MODE=danger-full-access
```
- No sandbox restrictions
- Full filesystem access
- Network access everywhere
- Execute any command
- No approval prompts

### Disabled Features (for speed)
- ❌ Plan mode (executes directly)
- ❌ Content filtering
- ❌ Safety checks
- ❌ Telemetry/logging
- ❌ Context compaction
- ❌ Tool result pruning
- ❌ Image offloading
- ❌ Retry logic

### Enabled Features (unlimited)
- ✅ 100 concurrent subagents
- ✅ 50 concurrent workflow agents
- ✅ 1000 goal rounds
- ✅ 1000 Ralph iteration rounds
- ✅ 125,000 inline tokens (10x default)
- ✅ 655KB instruction budget (10x default)
- ✅ Full-text session search
- ✅ Unlimited parallel tasks

---

## 🔧 Troubleshooting

### Issue: "Model not found" or API errors
**Solution:**
```bash
# Check local model server is running
curl http://localhost:11434/v1/models  # Ollama
curl http://localhost:1234/v1/models   # LM Studio

# Verify model name in .env matches available models
ollama list  # For Ollama
```

### Issue: "Permission denied" errors
**Solution:**
```bash
# Verify permission mode
grep DSH_PERMISSION_MODE .env
# Should be: DSH_PERMISSION_MODE=danger-full-access

# Check cordis patch is active
dsh web --dump-config | grep -A5 sandbox-policy
# Should show: mode: danger-full-access
```

### Issue: Timeouts still occurring under 2 hours
**Solution:**
```bash
# Verify timeout settings
dsh web --dump-config | grep -i timeout

# Check environment variables
env | grep TIMEOUT

# Ensure .env is loaded
source .env
dsh web
```

### Issue: Local model responses blocked/filtered
**Solution:**
```bash
# Ensure safety checks disabled in .env
DISABLE_CONTENT_FILTER=true
DISABLE_SAFETY_CHECKS=true
SKIP_MODEL_CAPABILITY_CHECK=true

# Verify in cordis patch
grep -A5 "repeat-tool-reminder" unrestricted.cordis.patch.yml
# Should show: disabled: true
```

---

## 📊 Performance Comparison

| Feature | Default Config | Unrestricted Config |
|---------|---------------|-------------------|
| Timeout | 60s | 7200s (2 hr, extended 4 hr) |
| Approval Prompts | Yes | No |
| Max Subagents | ~10 | 100 |
| Context Limit | Auto-compact | Unlimited |
| Tool Execution | Sandboxed | Native |
| Telemetry | Enabled | Disabled |
| Safety Checks | Enabled | Disabled |

---

## 🚨 Security Warning

⚠️ **THIS CONFIGURATION DISABLES ALL SAFETY FEATURES**

- No approval prompts for dangerous operations
- Full filesystem read/write/delete access
- No sandbox restrictions
- Network access to any host
- Executes any command without confirmation
- No content filtering or safety checks

**Only use:**
- On isolated/test systems
- With trusted local models
- When you understand the risks
- In controlled environments

---

## 🔄 Reverting to Safe Mode

To restore default safety features:

```bash
# Remove unrestricted configs
rm ~/.dsh/profiles/*/cordis.patch.yml
rm .env

# Or set safe mode
export DSH_PERMISSION_MODE=workspace-write
dsh web
```

---

## 📁 File Locations

```
/home/rakib/Desktop/deepfsdi/
├── unrestricted.cordis.patch.yml    # Main config patch
├── .env.unrestricted                # Environment variables
├── settings.unrestricted.json       # Settings file
└── UNRESTRICTED_SETUP.md           # This guide

After setup:
~/.dsh/profiles/web/cordis.patch.yml
~/.dsh/profiles/headless/cordis.patch.yml
~/.dsh/profiles/sdk/cordis.patch.yml
~/.dsh/settings.json
```

---

## 🎓 Advanced Configuration

### Custom Model Provider
Edit `.env` to add custom providers:
```bash
# For custom OpenAI-compatible API
CUSTOM_PROVIDER_NAME=my-local-model
CUSTOM_PROVIDER_URL=http://192.168.1.100:8000/v1
CUSTOM_PROVIDER_KEY=custom-key
CUSTOM_PROVIDER_MODEL=custom-model-name
```

### Multiple Model Support
DeepSeek Harness can connect to multiple providers simultaneously:
```bash
# Primary: Ollama for general tasks
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1:70b

# Secondary: LM Studio for coding
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=deepseek-coder-33b

# Tertiary: vLLM for fast inference
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_MODEL=mistral-7b-instruct
```

### Workspace Root Override
```bash
# Set custom workspace directory
WORKSPACE_ROOT=/path/to/your/project
dsh web
```

### Debug Mode
```bash
# Enable detailed logging
DEBUG=dsh:*
LOG_LEVEL=debug
dsh web
```

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Local model server running (`ollama serve` or equivalent)
- [ ] `.env` file configured with correct endpoint
- [ ] `unrestricted.cordis.patch.yml` copied to profile directories
- [ ] Launch DeepSeek Harness successfully
- [ ] No approval prompts appear
- [ ] Commands execute without timeout (test with long-running task)
- [ ] Full filesystem access works (test write operation)
- [ ] Telemetry disabled (check no uploads in logs)

---

## 📞 Support

If issues persist:

1. Check logs: `~/.dsh/logs/`
2. Verify config: `dsh web --dump-config`
3. Test model: `curl http://localhost:11434/v1/models`
4. Review startup: `dsh web --help`

---

## 🎉 You're Ready!

Your DeepSeek Harness is now configured for **unrestricted local model access** with:
- ✅ No timeouts under 2 hours (7200000ms)
- ✅ Zero approval prompts
- ✅ Full filesystem access
- ✅ Unlimited subagents
- ✅ Production-optimized performance

Launch with: `dsh web` or `dsh headless "your task"`

---

**Created:** 2026-10-03  
**Version:** 1.0.0  
**For:** DeepSeek Harness (all profiles: web, headless, sdk, sdk-minimal, acp)
