# 🎯 SMART TIMEOUT CONFIGURATION FOR LOCAL MODELS
## Prevents Stuck Agents While Allowing Long Operations

> ⚠️ SUPERSEDED: slow local/uncensored models need LONG timeouts, not fast-fail.
> Current policy is **7200000ms (2 hr), extended 14400000ms (4 hr)** with
> **retry disabled** (`ENABLE_SMART_RETRY=false`, `MAX_RETRIES=0`,
> `KILL_STUCK_OPERATIONS=false`). The 6-minute examples below are historical
> and must not be copied into live config.

---

## 🧠 The Problem with Local Models

Local/uncensored models can get **stuck in loops**:
- Infinite reasoning cycles
- Repeated tool calls that never complete
- Network timeouts waiting for responses
- Agents that hang without progress

**Previous solution:** 30-minute timeouts everywhere  
**Problem:** Wastes time waiting for stuck operations  

**New solution:** Smart timeout + retry logic  
**Result:** Fast fail on stuck operations, auto-retry with extended time if needed  

---

## ⚡ Smart Timeout Strategy

### Initial Timeout: 5-6 Minutes (360,000ms)
```
Operation starts → Wait 5-6 minutes → Check completion time
```

### If completes in < 200 seconds (3.3 min) and FAILS:
```
Fast failure detected → Auto-retry with 60-minute timeout
```

### If takes > 5-6 minutes:
```
Operation timeout → Cancel and move on (likely stuck)
```

---

## 📊 Timeout Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Operation Starts                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Wait: 5-6 minutes (360s)                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│ Success         │    │ Timeout/Failure  │
│ ✅ Done         │    │ ❌ Check time    │
└─────────────────┘    └────────┬─────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌─────────────────────┐
        │ Took < 200s       │   │ Took > 200s         │
        │ 🔄 Fast fail      │   │ 🛑 Likely stuck     │
        │ Retry: 60min      │   │ Give up             │
        └───────────────────┘   └─────────────────────┘
```

---

## 🔧 Configuration Details

### Timeouts Applied Everywhere

| Component | Initial Timeout | Retry Timeout | Max Retries |
|-----------|----------------|---------------|-------------|
| Bash commands | 6 min | 60 min | 2 |
| PowerShell | 6 min | 60 min | 2 |
| Web search | 6 min | 60 min | 2 |
| Web fetch | 6 min | 60 min | 2 |
| LSP operations | 6 min | 60 min | 2 |
| Subagents | 6 min | 60 min | 2 |
| Workflows | 6 min | 60 min | 2 |
| LLM requests | 6 min | 60 min | 2 |

### Smart Retry Logic

```yaml
# In unrestricted.cordis.patch.yml
- id: llm-retry
  disabled: false
  config:
    enabled: true
    maxRetries: 2
    retryIfFastFail: true
    fastFailThresholdMs: 200000  # 200 seconds
    retryOnTimeout: true
    retryOnConnectionError: true
```

### Environment Variables

```bash
# SUPERSEDED — live .env.unrestricted uses long timeouts, no retry:
TOOL_TIMEOUT_MS=7200000             # 2 hours
EXTENDED_TIMEOUT_MS=14400000        # 4 hours extended
FAST_FAIL_THRESHOLD_MS=999999999    # effectively disabled
ENABLE_SMART_RETRY=false
MAX_RETRIES=0
KILL_STUCK_OPERATIONS=false
```

---

## 📈 Real-World Examples

### Example 1: Successful Long Operation
```
User: "Analyze this entire 10GB codebase"

Timeline:
00:00 → Operation starts
00:30 → Still processing (under 6 min)
04:45 → Completes successfully ✅
Result: SUCCESS - took 4m45s, no retry needed
```

### Example 2: Fast Failure (Network Issue)
```
User: "Search the web for recent news"

Timeline:
00:00 → Operation starts
00:15 → Network timeout (under 200s) ❌
00:15 → Auto-retry with 60min timeout 🔄
00:16 → Success on retry ✅
Result: SUCCESS - fast fail detected, retry worked
```

### Example 3: Stuck Agent (Infinite Loop)
```
User: "Run this buggy script"

Timeline:
00:00 → Operation starts
06:00 → Timeout at 6 minutes (no completion)
06:00 → Operation took > 200s when failed
06:00 → Likely stuck, no retry 🛑
Result: TIMEOUT - agent was stuck, moved on
```

### Example 4: Multiple Retry Exhaustion
```
User: "Connect to unreachable server"

Timeline:
00:00 → Attempt 1 starts
00:30 → Fast fail (under 200s) ❌
00:30 → Retry 1 with 60min timeout 🔄
00:45 → Fast fail again ❌
00:45 → Retry 2 with 60min timeout 🔄
01:00 → Fast fail again ❌
01:00 → Max retries reached 🛑
Result: FAILED - 3 attempts exhausted
```

---

## 🎮 Configuration in Action

### File 1: unrestricted.cordis.patch.yml
```yaml
# Bash timeout: 6 minutes initially
- id: bash-sandbox
  config:
    timeoutMs: 360000

# Smart retry with extended timeout
- id: timeout-policy
  config:
    defaultTimeoutMs: 360000
    retryWithExtendedTimeout:
      enabled: true
      thresholdMs: 200000        # If fails under 200s
      extendedTimeoutMs: 3600000  # Retry with 60min
      maxRetries: 2

# LLM retry enabled for stuck models
- id: llm-retry
  disabled: false
  config:
    enabled: true
    maxRetries: 2
    retryIfFastFail: true
    fastFailThresholdMs: 200000
```

### File 2: .env.unrestricted
```bash
# SUPERSEDED — live values use long timeouts, features off:
TOOL_TIMEOUT_MS=7200000             # 2 hr
EXTENDED_TIMEOUT_MS=14400000        # 4 hr
FAST_FAIL_THRESHOLD_MS=999999999    # disabled

# Smart features OFF for slow local models
ENABLE_SMART_RETRY=false
MAX_RETRIES=0
KILL_STUCK_OPERATIONS=false
STUCK_OPERATION_THRESHOLD_MS=7200000
```

### File 3: settings.unrestricted.json
```json
{
  "timeouts": {
    "default": 360000,
    "extended": 3600000,
    "fastFailThreshold": 200000,
    "smartRetry": {
      "enabled": true,
      "maxRetries": 2,
      "retryIfUnder200s": true
    }
  },
  "features": {
    "retryPolicy": {
      "enabled": true,
      "maxRetries": 2,
      "retryOnTimeout": true,
      "retryOnStuck": true,
      "fastFailRetry": true,
      "fastFailThresholdMs": 200000
    },
    "stuckOperationKiller": {
      "enabled": true,
      "thresholdMs": 360000,
      "autoRetry": true
    }
  }
}
```

---

## 🚀 Benefits of Smart Timeout

### ✅ Advantages
1. **Fast recovery** - Network issues retry immediately
2. **No wasted time** - Stuck operations timeout in 6min, not 30min
3. **Intelligent retry** - Only retries operations that failed quickly
4. **Prevents loops** - Kills agents stuck in infinite cycles
5. **Allows long operations** - Legitimate 60min tasks still work via retry

### ⚠️ Edge Cases Handled
- **Network flakiness**: Fast fail → immediate retry
- **Model loading delays**: First attempt times out → retry succeeds
- **Infinite reasoning**: No fast fail → no retry → moved on
- **Connection drops**: Fast fail → retry with more time
- **Stuck subagents**: 6min kill prevents cascading failures

---

## 🔍 Monitoring Stuck Operations

### Check Logs
```bash
# View timeout events
tail -f ~/.dsh/logs/startup-*.log | grep -i timeout

# View retry attempts
tail -f ~/.dsh/logs/startup-*.log | grep -i retry

# View stuck operations killed
tail -f ~/.dsh/logs/startup-*.log | grep -i stuck
```

### Debug Mode
```bash
# Enable detailed logging
export DEBUG=dsh:*
export LOG_LEVEL=debug
dsh web
```

---

## 🎛️ Tuning the Configuration

### Make Timeouts MORE Aggressive (4 min initial)
```yaml
# In cordis patch
timeoutMs: 240000  # 4 minutes
```

### Make Timeouts MORE Lenient (10 min initial)
```yaml
# In cordis patch
timeoutMs: 600000  # 10 minutes
```

### Change Fast-Fail Threshold (5 min instead of 200s)
```yaml
fastFailThresholdMs: 300000  # 5 minutes
```

### Disable Retry Completely
```yaml
- id: llm-retry
  disabled: true
```

### Allow More Retries (3 instead of 2)
```yaml
maxRetries: 3
```

---

## 📋 Quick Reference

| Scenario | Initial Timeout | Retry? | Extended Timeout |
|----------|----------------|--------|------------------|
| Fast success (< 6min) | 6 min | No | N/A |
| Fast failure (< 200s) | 6 min | Yes (2x) | 60 min |
| Slow failure (> 200s) | 6 min | No | N/A |
| Stuck operation | 6 min | No | N/A |
| Network drop | 6 min | Yes | 60 min |

---

## 🎯 Summary

**Smart timeout configuration provides:**
- ⚡ 6-minute initial timeout (prevents wasting time)
- 🔄 Auto-retry with 60-minute timeout (handles network issues)
- 🎯 Only retries "fast failures" under 200 seconds
- 🛑 Kills stuck operations that take > 6 minutes
- ✅ Max 2 retries (prevents infinite retry loops)
- 🚀 Full permissions still enabled

**Best for:**
- Local models that occasionally get stuck
- Unreliable network connections
- Tasks that legitimately take > 6 minutes (via retry mechanism)
- Production use where time efficiency matters

**Installation:**
```bash
cd /home/rakib/Desktop/deepfsdi
bash install-unrestricted.sh
```

---

**Created:** 2026-10-03  
**Version:** 2.0.0 (Smart Timeout Edition)  
**For:** DeepSeek Harness with local/uncensored models
