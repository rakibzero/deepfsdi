# 🎉 UNRESTRICTED DEEPSEEK HARNESS - COMPLETE SETUP
## All Permissions + 2-Hour Timeouts for Local Models

> Policy: **7200000ms (2 hr), extended 14400000ms (4 hr)**, retry **disabled**,
> stuck-killer **disabled** — slow local models need time, not fast-fail.

---

## ✅ WHAT'S BEEN CREATED

5 configuration files ready for use:

### 1️⃣ `unrestricted.cordis.patch.yml` (Main Config)
- **Full permissions** - No approval prompts
- **Long timeouts** - 2 hr (7200000ms), extended 4 hr (14400000ms)
- **No retry logic** - Slow models get time, not fast-fail
- **Disabled guardrails** - No safety checks
- **Production mode** - Optimized performance

### 2️⃣ `.env.unrestricted` (Environment Variables)
- Local model configuration (Ollama, LM Studio, vLLM, etc.)
- Timeout values and retry settings
- Permission mode: `danger-full-access`
- Telemetry: DISABLED

### 3️⃣ `settings.unrestricted.json` (Settings File)
- All profiles configured (web, headless, sdk, acp)
- 2-hour timeout configuration (7200000ms)
- Retry policy disabled (MAX_RETRIES=0)
- Stuck operation killer disabled

### 4️⃣ `install-unrestricted.sh` (Automated Installer)
- One-command installation
- Copies configs to all profile directories
- Interactive setup with confirmations
- Backs up existing configs

### 5️⃣ Documentation
- `UNRESTRICTED_SETUP.md` - Full setup guide
- `SMART_TIMEOUT_GUIDE.md` - Detailed timeout logic explanation
- `README_COMPLETE.md` - This file

---

## 🚀 QUICK START (3 STEPS)

### Step 1: Run Installer
```bash
cd /home/rakib/Desktop/deepfsdi
bash install-unrestricted.sh
```

### Step 2: Configure Local Model
```bash
# Edit .env file
nano .env

# Set your local model endpoint:
OPENAI_BASE_URL=http://localhost:11434/v1  # Ollama
OPENAI_MODEL=llama3.1:70b
```

### Step 3: Launch DeepSeek Harness
```bash
# Start your local model first
ollama serve

# Launch DeepSeek Harness
dsh web                      # Web GUI
# or
dsh headless "your task"     # CLI
# or
dsh --profile sdk            # SDK server
```

---

## ⚡ TIMEOUT POLICY (LONG — NO RETRY)

### The Problem
Slow local/uncensored models need **time**, not fast-fail. Short timeouts
kill legitimate long operations.

### The Solution
**Long timeouts, retry disabled:**

```
Operation starts
    ↓
Wait up to 2 hours (7200000ms)
    ↓
Completes → SUCCESS ✅
    ↓
Still running → extended cap 4 hours (14400000ms), then timeout
```

No auto-retry (`MAX_RETRIES=0`), no stuck-killer
(`KILL_STUCK_OPERATIONS=false`).

### Benefits
- 🕐 **Slow-model friendly** - 2 hr per operation vs 60s default
- 🚫 **No false kills** - Long ops never cut off early
- ✅ **Simple** - No retry/killer interplay to debug

---

## 📊 CONFIGURATION SUMMARY

### Permissions
```yaml
Mode: danger-full-access
Approval: never
Sandbox: disabled
Filesystem: unrestricted
Network: unrestricted
Commands: unrestricted
```

### Timeouts
```yaml
Default: 2 hours (7,200,000ms)
Extended: 4 hours (14,400,000ms)
Fast-fail threshold: disabled (999999999)
Max retries: 0
```

### Features Enabled
- ✅ Native tool execution (no PTC overhead)
- ✅ Unlimited subagents (100 concurrent)
- ✅ Unlimited workflows (50 concurrent agents)
- ✅ Full-text session search
- ✅ HMR live updates

### Features Disabled
- ❌ Approval prompts
- ❌ Plan mode (execute directly)
- ❌ Content filtering
- ❌ Safety checks
- ❌ Telemetry/logging
- ❌ Context compaction
- ❌ Tool result pruning
- ❌ Retry logic (MAX_RETRIES=0)
- ❌ Stuck operation killer

---

## 🎯 SUPPORTED LOCAL MODELS

### Ollama (Recommended)
```bash
# Install: https://ollama.ai
ollama serve
ollama pull llama3.1:70b

# Configure in .env:
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1:70b
```

### LM Studio
```bash
# Install: https://lmstudio.ai
# Start LM Studio server (port 1234)

# Configure in .env:
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_MODEL=llama-3.1-70b-instruct
```

### vLLM
```bash
# Install: pip install vllm
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-70B-Instruct

# Configure in .env:
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_MODEL=meta-llama/Llama-3.1-70B-Instruct
```

### Text Generation WebUI
```bash
# Install: https://github.com/oobabooga/text-generation-webui
# Start with --api flag

# Configure in .env:
OPENAI_BASE_URL=http://localhost:5000/v1
OPENAI_MODEL=your-model-name
```

---

## 🔧 MANUAL INSTALLATION

If you prefer manual setup:

```bash
cd /home/rakib/Desktop/deepfsdi

# Copy configs to profiles
cp unrestricted.cordis.patch.yml ~/.dsh/profiles/web/cordis.patch.yml
cp unrestricted.cordis.patch.yml ~/.dsh/profiles/headless/cordis.patch.yml
cp unrestricted.cordis.patch.yml ~/.dsh/profiles/sdk/cordis.patch.yml

# Copy environment
cp .env.unrestricted .env

# Copy settings (optional)
cp settings.unrestricted.json ~/.dsh/settings.json

# Configure local model in .env
nano .env
```

---

## 📝 USAGE EXAMPLES

### Web GUI - Full Access
```bash
dsh web
# Opens http://localhost:3080
# No approval prompts
# Full filesystem access
# 2hr timeout, no retry
```

### CLI One-Shot - Complex Task
```bash
dsh headless "clone repo, analyze entire codebase, refactor all files, commit changes"
# Executes with full permissions
# No auto-retry (slow models need time)
# 2hr timeout per operation
```

### SDK Server - Programmatic Control
```bash
dsh --profile sdk

# From Python:
from deepseek_harness import Client
client = Client()
response = client.run("your unrestricted task")
```

---

## 🐛 TROUBLESHOOTING

### Problem: Still getting approval prompts
**Solution:**
```bash
# Verify config loaded
dsh web --dump-config | grep -A5 sandbox-policy
# Should show: mode: danger-full-access

# Check environment
grep DSH_PERMISSION_MODE .env
# Should be: DSH_PERMISSION_MODE=danger-full-access
```

### Problem: Operations timing out before 6 minutes
**Solution:**
```bash
# Verify timeout settings
dsh web --dump-config | grep -i timeout

# Check retry disabled
dsh web --dump-config | grep -A10 llm-retry
# Should show: disabled: true
```

### Problem: Local model not connecting
**Solution:**
```bash
# Test model server
curl http://localhost:11434/v1/models    # Ollama
curl http://localhost:1234/v1/models     # LM Studio

# Verify .env settings
grep OPENAI .env

# Check model running
ollama list  # For Ollama
```

### Problem: Agent gets stuck and never times out
**Solution:**
```bash
# With 2-hour timeouts the agent gets time; check logs if stuck:
tail -f ~/.dsh/logs/startup-*.log

# Verify stuck killer disabled (slow models need time):
grep KILL_STUCK .env
# Should be: KILL_STUCK_OPERATIONS=false
```

---

## 📚 DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| `UNRESTRICTED_SETUP.md` | Complete setup guide |
| `SMART_TIMEOUT_GUIDE.md` | Detailed timeout logic |
| `README_COMPLETE.md` | This summary (start here) |
| `unrestricted.cordis.patch.yml` | Main configuration |
| `.env.unrestricted` | Environment variables |
| `settings.unrestricted.json` | Settings file |
| `install-unrestricted.sh` | Automated installer |

---

## ⚠️ SECURITY WARNING

**THIS CONFIGURATION HAS ZERO RESTRICTIONS:**
- ❌ No approval prompts
- ❌ No sandboxing
- ❌ No safety checks
- ❌ No content filtering
- ❌ Full filesystem access
- ❌ Unrestricted command execution

**ONLY USE ON:**
- Isolated test systems
- Development environments
- Systems with trusted local models
- Non-production machines

**DO NOT USE:**
- On production servers
- With sensitive data
- On shared systems
- With untrusted models

---

## 🎉 YOU'RE ALL SET!

Everything is configured and ready to use.

### Next Steps:
1. ✅ Run installer: `bash install-unrestricted.sh`
2. ✅ Configure local model in `.env`
3. ✅ Start model server: `ollama serve`
4. ✅ Launch: `dsh web`

### Quick Verification:
```bash
# Should show no approval prompts
# Should allow up to 2hr per operation (not hang forever)
# Should NOT auto-retry (retry disabled for slow models)
# Should give full filesystem access
```

---

## 📊 WHAT YOU GET

| Feature | Default | Unrestricted |
|---------|---------|--------------|
| Timeout | 60s | 2hr (7200s), extended 4hr |
| Permissions | Restricted | Full access |
| Approvals | Required | Never |
| Safety | Enabled | Disabled |
| Retries | Disabled | Disabled (0) |
| Subagents | ~10 | 100 |
| Context | Compacted | Unlimited |
| Telemetry | Enabled | Disabled |

---

## 🔗 QUICK LINKS

- [DeepSeek Harness Repo](https://github.com/deepseek-ai/deepseek-harness)
- [Ollama](https://ollama.ai)
- [LM Studio](https://lmstudio.ai)
- [vLLM](https://docs.vllm.ai)

---

**Version:** 3.0.0 (Maximum Timeout Edition — 2hr, no retry)  
**Created:** 2026-10-03  
**Location:** `/home/rakib/Desktop/deepfsdi/`  
**Status:** ✅ Ready for production use with local models

---

## 🎯 READY TO GO!

```bash
cd /home/rakib/Desktop/deepfsdi
bash install-unrestricted.sh
```

That's it! Your DeepSeek Harness is now configured for unrestricted local model access with 2-hour timeouts.

---

**Questions? Check:**
- `UNRESTRICTED_SETUP.md` for detailed setup
- `SMART_TIMEOUT_GUIDE.md` for timeout logic
- `~/.dsh/logs/` for debugging
