import { Context } from '@deepseek-ai/cordis';
import { defineTool, type ParameterSchemaSpec, type StringValueSchemaSpec } from '@deepseek-ai/dsh-tools';

export interface TavilyResearchPluginConfig {
  baseUrl?: string;
  apiKey?: string;
  mcpEnabled?: boolean;
  mcpServerUrl?: string;
}

const s = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const renderText = (_a: any, v: any) => [{ type: 'text', text: String(v) } as const].map((b) => ({ ...b }));

export async function apply(ctx: Context, config: TavilyResearchPluginConfig) {
  const baseUrl = (config.baseUrl || 'http://192.168.0.133:20128').replace(/\/v1\/?$/, '');
  const apiKey = config.apiKey?.trim() || undefined;

  const str = (description: string, required = false): StringValueSchemaSpec & { required?: true } => ({
    type: 'string',
    description,
    ...(required ? { required: true } : {}),
  });

  // 9Router Tavily search endpoint
  const doSearch = async (path: string, body: Record<string, any>): Promise<any> => {
    const url = `${baseUrl}/v1${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`9Router ${res.status} at ${path}: ${text}`);
    }
    return res.json();
  };

  // 1. Tavily Web Search (enhanced with more parameters)
  const searchParams: ParameterSchemaSpec = {
    query: str('Search query', true),
    max_results: { type: 'number', description: 'Maximum results to return (default: 10, max: 50)' },
    search_depth: str('Search depth: basic (faster) or advanced (more thorough, default: basic)'),
    topic: str('Search topic: general, news, finance, or research (default: general)'),
    days: { type: 'number', description: 'Time range in days for news/finance topics (default: 7)' },
    include_answer: { type: 'boolean', description: 'Include AI-generated answer (default: true)' },
    include_raw_content: { type: 'boolean', description: 'Include raw HTML content (default: false)' },
    include_images: { type: 'boolean', description: 'Include images in results (default: false)' },
    include_image_descriptions: { type: 'boolean', description: 'Include AI-generated image descriptions (default: false)' },
    country: str('Country code for localized results (e.g., us, gb, ca)'),
    domains: str('Comma-separated list of domains to include'),
    exclude_domains: str('Comma-separated list of domains to exclude'),
  };

  ctx.tools.register(defineTool({
    name: 'tavily_search',
    description: '[Tavily] Search the web via 9Router Tavily integration. Supports general, news, finance, and research topics with configurable depth.',
    parameters: searchParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const body: Record<string, any> = {
        model: 'tavily/search',
        query: s(args?.query),
        max_results: num(args?.max_results) ?? 10,
      };

      if (args?.search_depth) body.search_depth = s(args.search_depth);
      if (args?.topic) body.topic = s(args.topic);
      if (args?.days) body.days = num(args.days);
      if (bool(args?.include_answer) !== undefined) body.include_answer = bool(args.include_answer);
      if (bool(args?.include_raw_content) !== undefined) body.include_raw_content = bool(args.include_raw_content);
      if (bool(args?.include_images) !== undefined) body.include_images = bool(args.include_images);
      if (bool(args?.include_image_descriptions) !== undefined) body.include_image_descriptions = bool(args.include_image_descriptions);
      if (args?.country) body.country = s(args.country);
      if (args?.domains) body.domain_filter = s(args.domains).split(',').map((d: string) => d.trim());
      if (args?.exclude_domains) body.exclude_domain_filter = s(args.exclude_domains).split(',').map((d: string) => d.trim());

      return doSearch('/search', body);
    },
  }));

  // 2. Tavily Extract (fetch + extract content from URLs)
  const extractParams: ParameterSchemaSpec = {
    urls: str('Comma-separated URLs to extract content from', true),
    extract_depth: str('Extraction depth: basic (faster) or advanced (more thorough, default: basic)'),
    include_images: { type: 'boolean', description: 'Include images in extraction (default: false)' },
    include_image_descriptions: { type: 'boolean', description: 'Include AI-generated image descriptions (default: false)' },
    format: str('Output format: markdown, text, or html (default: markdown)'),
  };

  ctx.tools.register(defineTool({
    name: 'tavily_extract',
    description: '[Tavily] Extract full content from URLs via 9Router Tavily. Use for deep content extraction from search results.',
    parameters: extractParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const urls = s(args?.urls).split(',').map((u: string) => u.trim()).filter(Boolean);
      if (urls.length === 0) throw new Error('At least one URL is required');

      const body: Record<string, any> = {
        model: 'tavily/extract',
        urls,
      };

      if (args?.extract_depth) body.extract_depth = s(args.extract_depth);
      if (bool(args?.include_images) !== undefined) body.include_images = bool(args.include_images);
      if (bool(args?.include_image_descriptions) !== undefined) body.include_image_descriptions = bool(args.include_image_descriptions);
      if (args?.format) body.format = s(args.format);

      return doSearch('/extract', body);
    },
  }));

  // 3. Tavily Deep Research (multi-step research with synthesis)
  const deepResearchParams: ParameterSchemaSpec = {
    query: str('Research question or topic', true),
    max_depth: { type: 'number', description: 'Maximum research depth/iterations (default: 3, max: 10)' },
    max_breadth: { type: 'number', description: 'Maximum sources per iteration (default: 5, max: 20)' },
    time_range: str('Time range: day, week, month, year, or all (default: month)'),
    include_domains: str('Comma-separated domains to prioritize'),
    exclude_domains: str('Comma-separated domains to exclude'),
    format: str('Report format: markdown, bullet_points, or executive_summary (default: markdown)'),
  };

  ctx.tools.register(defineTool({
    name: 'tavily_deep_research',
    description: '[Tavily] Deep multi-step research via 9Router. Iteratively searches, extracts, and synthesizes a comprehensive report.',
    parameters: deepResearchParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const body: Record<string, any> = {
        model: 'tavily/deep-research',
        query: s(args?.query),
        max_depth: Math.min(Math.max(num(args?.max_depth) ?? 3, 1), 10),
        max_breadth: Math.min(Math.max(num(args?.max_breadth) ?? 5, 1), 20),
      };

      if (args?.time_range) body.time_range = s(args.time_range);
      if (args?.include_domains) body.include_domains = s(args.include_domains).split(',').map((d: string) => d.trim());
      if (args?.exclude_domains) body.exclude_domains = s(args.exclude_domains).split(',').map((d: string) => d.trim());
      if (args?.format) body.format = s(args.format);

      return doSearch('/deep-research', body);
    },
  }));

  // 4. Tavily Crawl (bulk site extraction)
  const crawlParams: ParameterSchemaSpec = {
    url: str('Starting URL to crawl', true),
    max_pages: { type: 'number', description: 'Maximum pages to crawl (default: 10, max: 1000)' },
    max_depth: { type: 'number', description: 'Maximum crawl depth (default: 2, max: 10)' },
    allow_subdomains: { type: 'boolean', description: 'Allow crawling subdomains (default: true)' },
    allow_external: { type: 'boolean', description: 'Allow crawling external links (default: false)' },
    include_path_patterns: str('Comma-separated regex patterns to include paths'),
    exclude_path_patterns: str('Comma-separated regex patterns to exclude paths'),
    format: str('Output format: markdown, text, or json (default: markdown)'),
  };

  ctx.tools.register(defineTool({
    name: 'tavily_crawl',
    description: '[Tavily] Bulk crawl and extract a website via 9Router. Follows links up to max_depth and max_pages.',
    parameters: crawlParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const body: Record<string, any> = {
        model: 'tavily/crawl',
        url: s(args?.url),
        max_pages: Math.min(Math.max(num(args?.max_pages) ?? 10, 1), 1000),
        max_depth: Math.min(Math.max(num(args?.max_depth) ?? 2, 1), 10),
      };

      if (bool(args?.allow_subdomains) !== undefined) body.allow_subdomains = bool(args.allow_subdomains);
      if (bool(args?.allow_external) !== undefined) body.allow_external = bool(args.allow_external);
      if (args?.include_path_patterns) body.include_path_patterns = s(args.include_path_patterns).split(',').map((p: string) => p.trim());
      if (args?.exclude_path_patterns) body.exclude_path_patterns = s(args.exclude_path_patterns).split(',').map((p: string) => p.trim());
      if (args?.format) body.format = s(args.format);

      return doSearch('/crawl', body);
    },
  }));

  // 5. Tavily Map (discover site structure)
  const mapParams: ParameterSchemaSpec = {
    url: str('URL to map', true),
    max_pages: { type: 'number', description: 'Maximum pages to discover (default: 100, max: 5000)' },
    include_path_patterns: str('Comma-separated regex patterns to include'),
    exclude_path_patterns: str('Comma-separated regex patterns to exclude'),
  };

  ctx.tools.register(defineTool({
    name: 'tavily_map',
    description: '[Tavily] Discover and list all URLs on a website via 9Router. Fast site mapping without full extraction.',
    parameters: mapParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const body: Record<string, any> = {
        model: 'tavily/map',
        url: s(args?.url),
        max_pages: Math.min(Math.max(num(args?.max_pages) ?? 100, 1), 5000),
      };

      if (args?.include_path_patterns) body.include_path_patterns = s(args.include_path_patterns).split(',').map((p: string) => p.trim());
      if (args?.exclude_path_patterns) body.exclude_path_patterns = s(args.exclude_path_patterns).split(',').map((p: string) => p.trim());

      return doSearch('/map', body);
    },
  }));

  // 6. Tavily Company Research (specialized for company intelligence)
  const companyResearchParams: ParameterSchemaSpec = {
    company: str('Company name or domain', true),
    max_depth: { type: 'number', description: 'Research depth (default: 3, max: 10)' },
    include_financials: { type: 'boolean', description: 'Include financial data if available (default: true)' },
    include_news: { type: 'boolean', description: 'Include recent news (default: true)' },
    include_competitors: { type: 'boolean', description: 'Include competitor analysis (default: false)' },
    format: str('Report format: markdown, json, or executive_summary (default: markdown)'),
  };

  ctx.tools.register(defineTool({
    name: 'tavily_company_research',
    description: '[Tavily] Specialized company intelligence research via 9Router. Financials, news, leadership, competitors.',
    parameters: companyResearchParams,
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const body: Record<string, any> = {
        model: 'tavily/company-research',
        company: s(args?.company),
        max_depth: Math.min(Math.max(num(args?.max_depth) ?? 3, 1), 10),
      };

      if (bool(args?.include_financials) !== undefined) body.include_financials = bool(args.include_financials);
      if (bool(args?.include_news) !== undefined) body.include_news = bool(args.include_news);
      if (bool(args?.include_competitors) !== undefined) body.include_competitors = bool(args.include_competitors);
      if (args?.format) body.format = s(args.format);

      return doSearch('/company-research', body);
    },
  }));

  // 7. MCP Integration - Register Tavily MCP server if enabled
  if (config.mcpEnabled && config.mcpServerUrl) {
    ctx.logger.info('Tavily MCP server configured, would register via dsh-mcp-client');
    // Note: The actual MCP registration is done via dsh-mcp-client plugin in cordis.yml
    // This plugin just provides the native 9Router Tavily tools above
  }
}

export default apply;