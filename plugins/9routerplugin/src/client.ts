/**
 * 9Router client for DSH plugin
 * Base: http://192.168.0.133:20128 (SKILL.md: /api/health, /v1/*)
 * WebUI pass: 123Warlock123@ (API key from Dashboard → Keys if requireApiKey=true)
 */
export interface NineRouterConfig {
  baseUrl: string;
  apiKey?: string;
}
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}
export interface ChatResponse {
  id: string; object: string; created: number; model: string;
  choices: Array<{ index: number; message: ChatMessage; finish_reason: string | null }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}
export interface ModelsResponse {
  object: string;
  data: Array<{ id: string; object: string; owned_by: string; created: number; kind?: string }>;
}
export interface SearchRequest {
  model: string;
  query: string;
  max_results?: number;
  search_type?: string;
  country?: string;
  language?: string;
  time_range?: string;
  domain_filter?: string[];
}
export interface FetchRequest {
  model: string;
  url: string;
  format?: 'markdown' | 'text' | 'html';
  max_characters?: number;
}
export interface ImageRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  response_format?: 'url' | 'b64_json';
}
export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
}
export interface TTSRequest {
  model: string;
  input: string;
  voice?: string;
  response_format?: 'mp3' | 'json';
  speed?: number;
}
export interface STTRequest {
  model: string;
  file: string | Buffer;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'verbose_json' | 'srt' | 'vtt';
  temperature?: number;
}
export class NineRouterClient {
  private baseUrl: string;
  private apiKey?: string;
  constructor(config: NineRouterConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey?.trim() || undefined;
  }
  private buildHeaders(extra: Record<string,string> = {}): Record<string,string> {
    const h: Record<string,string> = { 'Content-Type': 'application/json', ...extra };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders(init.headers as Record<string,string>);
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      const text = await res.text();
      const retry = res.headers.get('retry-after');
      const hint = res.status === 503 && retry ? ` retry-after: ${retry}s` : '';
      throw new Error(`9Router ${res.status} at ${path}: ${text}${hint}`);
    }
    return res.json() as Promise<T>;
  }
  private async requestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders(init.headers as Record<string,string>);
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`9Router ${res.status} at ${path}: ${text}`);
    }
    return res.blob();
  }
  async listModels(kind?: string): Promise<ModelsResponse> {
    const p = kind ? `/v1/models/${kind}` : '/v1/models';
    return this.request<ModelsResponse>(p);
  }
  async chat(req: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/v1/chat/completions', { method: 'POST', body: JSON.stringify(req) });
  }
  async search(req: SearchRequest): Promise<any> {
    return this.request('/v1/search', { method: 'POST', body: JSON.stringify(req) });
  }
  async fetch(req: FetchRequest): Promise<any> {
    return this.request('/v1/web/fetch', { method: 'POST', body: JSON.stringify(req) });
  }
  async generateImage(req: ImageRequest): Promise<any> {
    return this.request('/v1/images/generations', { method: 'POST', body: JSON.stringify(req) });
  }
  async createEmbeddings(req: EmbeddingRequest): Promise<any> {
    return this.request('/v1/embeddings', { method: 'POST', body: JSON.stringify(req) });
  }
  async textToSpeech(req: TTSRequest): Promise<string> {
    const blob = await this.requestBlob('/v1/audio/speech', { method: 'POST', body: JSON.stringify(req) });
    const buf = Buffer.from(await blob.arrayBuffer());
    return buf.toString('base64');
  }
  async speechToText(req: STTRequest): Promise<string> {
    const form = new FormData();
    form.append('model', req.model || 'openai/whisper-1');
    if (typeof req.file === 'string') {
      if (req.file.startsWith('data:')) {
        const [meta, data] = req.file.split(',');
        const mime = meta.match(/data:([^;]+)/)?.[1] || 'audio/wav';
        const b = Buffer.from(data, 'base64');
        form.append('file', new Blob([b], { type: mime }), 'audio.wav');
      } else {
        form.append('file', req.file);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.append('file', new Blob([req.file as any], { type: 'audio/wav' }), 'audio.wav');
    }
    if (req.language) form.append('language', req.language);
    if (req.prompt) form.append('prompt', req.prompt);
    if (req.response_format) form.append('response_format', req.response_format);
    if (req.temperature) form.append('temperature', String(req.temperature));
    const url = `${this.baseUrl}/v1/audio/transcriptions`;
    const headers: Record<string,string> = {};
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    const res = await fetch(url, { method: 'POST', headers, body: form });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`9Router STT ${res.status}: ${text}`);
    }
    const j = await res.json();
    return j.text ?? '';
  }
  async healthCheck(): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('/api/health');
  }
}
export function createNineRouterClient(config: Partial<NineRouterConfig> = {}): NineRouterClient {
  const baseUrl = config.baseUrl ?? 'http://192.168.0.133:20128';
  return new NineRouterClient({ baseUrl, apiKey: config.apiKey });
}