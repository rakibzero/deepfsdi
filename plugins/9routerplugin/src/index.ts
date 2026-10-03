import { Context } from '@deepseek-ai/cordis';
import { createNineRouterClient, ChatMessage } from './client.js';
import { defineTool, type ParameterSchemaSpec, type StringValueSchemaSpec } from '@deepseek-ai/dsh-tools';

export interface NineRouterPluginConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
}

const s = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const renderText = (_a: any, v: any) => [{ type: 'text', text: String(v) } as const].map((b) => ({ ...b }));

export async function apply(ctx: Context, config: NineRouterPluginConfig) {
  const baseUrl = (config.baseUrl || 'http://192.168.0.133:20128').replace(/\/v1\/?$/, '');
  const client = createNineRouterClient({ baseUrl: `${baseUrl}/v1`, apiKey: config.apiKey });

  try { await client.healthCheck(); } catch (e) { ctx.logger.warn('9Router health check failed:', e); }

  const str = (description: string, required = false): StringValueSchemaSpec & { required?: true } => ({
    type: 'string',
    description,
    ...(required ? { required: true } : {}),
  });

  // 1. Chat
  const chatParams: ParameterSchemaSpec = {
    prompt: str('The prompt to send to the AI', true),
    model: str('Model ID (e.g., opencode256)'),
    systemPrompt: str('Optional system prompt'),
    temperature: { type: 'number', description: 'Temperature for sampling (0-2)' },
  };
  ctx.tools.register(defineTool({
    name: '9router_chat',
    description: 'Chat with an AI model via 9Router gateway. Use this for general purpose AI requests.',
    parameters: chatParams,
    output: {
      schema: { type: 'string' },
      render: renderText as any,
    },
    execute: async (args: any) => {
      const model = s(args?.model, config.defaultModel || 'opencode256');
      const prompt = s(args?.prompt);
      const systemPrompt = s(args?.systemPrompt);
      const temperature = num(args?.temperature);
      const msgs: ChatMessage[] = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      msgs.push({ role: 'user', content: prompt });
      const resp = await client.chat({ model, messages: msgs, temperature });
      return resp.choices[0].message.content;
    },
  }));

  // 2. Web Search (POST /v1/search)
  const searchParams: ParameterSchemaSpec = {
    query: str('Search query', true),
    model: str('Search model ID (default: tavily/search)'),
    max_results: { type: 'number', description: 'Max results (default 5)' },
  };
  ctx.tools.register(defineTool({
    name: '9router_web_search',
    description: 'Search the web using 9Router gateway. Returns a list of results with content.',
    parameters: searchParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const res = await client.search({ 
        model: s(args?.model, 'tavily/search'), 
        query: s(args?.query), 
        max_results: num(args?.max_results) ?? 5 
      });
      return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
    },
  }));

  // 3. Web Fetch (POST /v1/web/fetch)
  const fetchParams: ParameterSchemaSpec = {
    url: str('URL to fetch', true),
    model: str('Fetch model ID (default: firecrawl/fetch)'),
    format: str('Output format: markdown/text/html (default: markdown)'),
    max_characters: { type: 'number', description: 'Truncate output to max characters' },
  };
  ctx.tools.register(defineTool({
    name: '9router_web_fetch',
    description: 'Fetch and convert a URL to markdown using 9Router gateway.',
    parameters: fetchParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      return client.fetch({
        url: s(args?.url),
        model: s(args?.model, 'firecrawl/fetch'),
        format: s(args?.format, 'markdown') as any,
        max_characters: num(args?.max_characters),
      });
    },
  }));

  // 4. Image Generation
  const imgParams: ParameterSchemaSpec = {
    prompt: str('Image description', true),
    model: str('Image model ID (default: dalle-3)'),
    size: str('Image size (e.g., 1024x1024)'),
    quality: str('Quality: standard/hd'),
    response_format: str('Response format: url/b64_json'),
  };
  ctx.tools.register(defineTool({
    name: '9router_image_gen',
    description: 'Generate an image using 9Router gateway.',
    parameters: imgParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const res = await client.generateImage({ 
        model: s(args?.model, 'dalle-3'), 
        prompt: s(args?.prompt),
        size: s(args?.size),
        quality: s(args?.quality),
        response_format: s(args?.response_format) as any,
      });
      return res?.data?.[0]?.url ?? res?.data?.[0]?.b64_json ?? 'No image returned';
    },
  }));

  // 5. Embeddings
  const embParams: ParameterSchemaSpec = {
    text: str('Text to embed (or comma-separated list)', true),
    model: str('Embedding model ID (default: text-embedding-3-small)'),
    encoding_format: str('Encoding: float/base64'),
    dimensions: { type: 'number', description: 'Dimensions (OpenAI v3 only)' },
  };
  ctx.tools.register(defineTool({
    name: '9router_embeddings',
    description: 'Create embeddings for a given text using 9Router gateway.',
    parameters: embParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const input = s(args?.text).split(',').map((x: string) => x.trim());
      const res = await client.createEmbeddings({ 
        model: s(args?.model, 'text-embedding-3-small'), 
        input: input.length === 1 ? input[0] : input,
        encoding_format: s(args?.encoding_format, 'float') as any,
        dimensions: num(args?.dimensions),
      });
      return res?.data?.[0]?.embedding ? JSON.stringify(res.data[0].embedding, null, 2) : 'No embedding returned';
    },
  }));

  // 6. TTS
  const ttsParams: ParameterSchemaSpec = {
    text: str('Text to synthesize', true),
    model: str('TTS model/voice ID (e.g., openrouter/openai/tts-1, edge-tts/vi-VN-HoaiMyNeural)'),
    voice: str('Voice name (for OpenAI: alloy, echo, fable, onyx, nova, shimmer)'),
    speed: { type: 'number', description: 'Speech speed (0.25-4.0)' },
  };
  ctx.tools.register(defineTool({
    name: '9router_tts',
    description: 'Text-to-speech via 9Router gateway. Returns base64-encoded MP3 audio.',
    parameters: ttsParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const res = await client.textToSpeech({ 
        model: s(args?.model, 'openrouter/openai/tts-1'), 
        input: s(args?.text), 
        voice: s(args?.voice, 'alloy'),
        speed: num(args?.speed),
      });
      return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
    },
  }));

  // 7. STT
  const sttParams: ParameterSchemaSpec = {
    file: str('Audio file path or base64 data URL', true),
    model: str('STT model ID (e.g., openai/whisper-1, groq/whisper-large-v3-turbo)'),
    language: str('Language code (e.g., en, vi)'),
    prompt: str('Prompt to guide transcription'),
    response_format: str('Format: json/text/verbose_json/srt/vtt'),
  };
  ctx.tools.register(defineTool({
    name: '9router_stt',
    description: 'Speech-to-text via 9Router gateway. Returns transcribed text.',
    parameters: sttParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      return client.speechToText({ 
        model: s(args?.model), 
        file: s(args?.file), 
        language: s(args?.language) || undefined,
        prompt: s(args?.prompt) || undefined,
        response_format: s(args?.response_format, 'json') as any,
      });
    },
  }));

  // 8. Models list
  const modelsParams: ParameterSchemaSpec = {
    kind: str('Model kind: chat/image/tts/stt/embedding/web/image-to-text (omit for all)'),
  };
  ctx.tools.register(defineTool({
    name: '9router_models',
    description: 'List models available on the 9Router gateway, optionally filtered by kind.',
    parameters: modelsParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const res = await client.listModels(s(args?.kind) || undefined);
      return JSON.stringify(res.data.map((m) => m.id), null, 2);
    },
  }));
}