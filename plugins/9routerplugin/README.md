# 9Router AI Gateway Plugin for DeepSeek Harness

**Gateway:** `http://192.168.0.133:20128` (Docker) — see [9Router setup](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router/SKILL.md).  
**Verify:** `curl http://192.168.0.133:20128/api/health` → `{"ok":true}`.

## What it exposes

The plugin registers DSH tools for every 9Router capability the skill indexes:

| Tool | 9Router endpoint | SKILL |
|------|----------------|-------|
| `9router_chat` | `POST /v1/chat/completions` | [9router-chat](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router-chat/SKILL.md) |
| `9router_web_search` | `POST /v1/search` | [9router-web-search](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router-web-search/SKILL.md) |
| `9router_web_fetch` | `POST /v1/web/fetch` | [9router-web-fetch](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router-web-fetch/SKILL.md) |
| `9router_image_gen` | `POST /v1/images/generations` | [9router-image](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router-image/SKILL.md) |
| `9router_embeddings` | `POST /v1/embeddings` | [9router-embeddings](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router-embeddings/SKILL.md) |
| `9router_tts` | `POST /v1/audio/speech` | [9router-tts](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router-tts/SKILL.md) |
| `9router_stt` | `POST /v1/audio/transcriptions` | [9router-stt](https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router-stt/SKILL.md) |
| `9router_models` | `GET /v1/models[/kind]` | Setup skill |

## Config

Declared in `cordis.patch.yml` (inserted as bundle `@local/9routerplugin`):

```yaml
- insert:
    - id: 9router
      name: '@local/9routerplugin'
      config:
        baseUrl: "http://192.168.0.133:20128"
        defaultModel: "opencode256"
```

`baseUrl` is the Docker host root — the client strips a trailing `/v1` if present and always calls `/v1/...`. Auth is optional: if your instance has `requireApiKey=true`, set `apiKey` to a Dashboard → Keys value (otherwise omit).

## Auto-discovery

Use `data[].id` from the `GET /v1/models[/kind]` responses as the `model` field. Examples against this host:

```bash
curl http://192.168.0.133:20128/v1/models | jq '.data[].id'            # chat
curl http://192.168.0.133:20128/v1/models/web | jq .                   # web search/fetch (kind field)
curl http://192.168.0.133:20128/v1/models/tts | jq '.data[].id'
curl http://192.168.0.133:20128/v1/models/embedding | jq '.data[].id'
curl http://192.168.0.133:20128/v1/models/stt | jq '.data[].id'
curl http://192.168.0.133:20128/v1/models/image | jq '.data[].id'
curl http://192.168.0.133:20128/v1/models/image-to-text | jq '.data[].id'
```

The `.env` in this directory mirrors the Docker settings:

```
NINEROUTER_URL=http://192.168.0.133:20128
ANTHROPIC_BASE_URL=http://192.168.0.133:20128/v1
ANTHROPIC_DEFAULT_HAIKU_MODEL=opencode256
9ROUTER_WEBUI_PASSWORD=123Warlock123@
```

## Build / verify

```bash
pnpm --filter '@local/9routerplugin...' install
pnpm --filter '@local/9routerplugin' run build   # tsc → lib/
node -e "import('./lib/index.js').then(m=>console.log(Object.keys(m)))" # ['apply']
```

503 `All accounts unavailable` → respect `retry-after`; 401 → set `NINEROUTER_KEY`; 400 `Invalid model format` → pick an id from `/v1/models/<kind>`.
