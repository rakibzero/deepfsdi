import { Context } from '@deepseek-ai/cordis';
import { defineTool, type ParameterSchemaSpec, type StringValueSchemaSpec } from '@deepseek-ai/dsh-tools';

export interface FSDIPluginConfig {
  fsdiPath?: string;
  enabledCommands?: string[];
}

export async function apply(ctx: Context, config: FSDIPluginConfig) {
  const fsdiRoot = config.fsdiPath || process.env.FSDI_PATH || '/run/media/rakib/884050c7-61f0-4705-b22b-dd68b37f67f8/FSDI';
  const enabled = new Set(config.enabledCommands || ['run', 'auto', 'init', 'query']);

  const str = (description: string, required = false): StringValueSchemaSpec & { required?: true } => ({
    type: 'string',
    description,
    ...(required ? { required: true } : {}),
  });

  const renderText = (_a: any, v: any) => [{ type: 'text', text: String(v) } as const].map((b) => ({ ...b }));

  const runFSDICommand = async (command: string, args: string[]): Promise<string> => {
    const { spawn } = await import('child_process');
    const { join } = await import('path');

    const cmdPath = join(fsdiRoot, 'sdk', 'dist', 'cli.js');
    const fsdiArgs = [command, ...args];

    return new Promise((resolve, reject) => {
      const proc = spawn('node', [cmdPath, ...fsdiArgs], {
        cwd: process.cwd(),
        env: { ...process.env, FSDI_PATH: fsdiRoot },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout || 'Command completed successfully');
        } else {
          reject(new Error(`FSDI command failed (exit ${code}): ${stderr || stdout || 'Unknown error'}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn FSDI: ${err.message}`));
      });

      setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error('FSDI command timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  };

  // fsdi_run - Run a full milestone from a text prompt
  if (enabled.has('run')) {
    ctx.tools.register(defineTool({
      name: 'fsdi_run',
      description: '[FSDI] Run a full milestone from a text prompt. Executes the complete FSDI lifecycle.',
      parameters: {
        prompt: str('High-level prompt describing what to build', true),
        projectDir: str('Project directory (default: cwd)'),
        model: str('Override LLM model'),
        maxBudget: { type: 'number', description: 'Max budget per step in USD' },
        ws: str('Workstream name for .planning/ routing'),
        wsPort: { type: 'number', description: 'Enable WebSocket transport on port' },
      },
      output: { schema: { type: 'string' }, render: renderText as any },
      execute: async (args: any) => {
        const prompt = String(args?.prompt || '');
        if (!prompt) throw new Error('Prompt is required for fsdi_run');
        const fsdiArgs: string[] = [prompt];
        if (args?.projectDir) fsdiArgs.push('--project-dir', String(args.projectDir));
        if (args?.model) fsdiArgs.push('--model', String(args.model));
        if (args?.maxBudget) fsdiArgs.push('--max-budget', String(args.maxBudget));
        if (args?.ws) fsdiArgs.push('--ws', String(args.ws));
        if (args?.wsPort) fsdiArgs.push('--ws-port', String(args.wsPort));
        return runFSDICommand('run', fsdiArgs);
      },
    }));
  }

  // fsdi_auto - Run the full autonomous lifecycle
  if (enabled.has('auto')) {
    ctx.tools.register(defineTool({
      name: 'fsdi_auto',
      description: '[FSDI] Run the full autonomous lifecycle (discover → execute → advance). Best for unattended spec-driven development.',
      parameters: {
        init: str('Bootstrap from PRD/description before running (file path @... or text)'),
        projectDir: str('Project directory (default: cwd)'),
        model: str('Override LLM model'),
        maxBudget: { type: 'number', description: 'Max budget per step in USD' },
        ws: str('Workstream name for .planning/ routing'),
        wsPort: { type: 'number', description: 'Enable WebSocket transport on port' },
      },
      output: { schema: { type: 'string' }, render: renderText as any },
      execute: async (args: any) => {
        const fsdiArgs: string[] = [];
        if (args?.init) fsdiArgs.push('--init', String(args.init));
        if (args?.projectDir) fsdiArgs.push('--project-dir', String(args.projectDir));
        if (args?.model) fsdiArgs.push('--model', String(args.model));
        if (args?.maxBudget) fsdiArgs.push('--max-budget', String(args.maxBudget));
        if (args?.ws) fsdiArgs.push('--ws', String(args.ws));
        if (args?.wsPort) fsdiArgs.push('--ws-port', String(args.wsPort));
        return runFSDICommand('auto', fsdiArgs);
      },
    }));
  }

  // fsdi_init - Bootstrap a new project from PRD or description
  if (enabled.has('init')) {
    ctx.tools.register(defineTool({
      name: 'fsdi_init',
      description: '[FSDI] Bootstrap a new project from a PRD or description. Creates .planning/ structure.',
      parameters: {
        input: str('Input: @path/to/prd.md or "description text" or empty for stdin', true),
        projectDir: str('Project directory (default: cwd)'),
      },
      output: { schema: { type: 'string' }, render: renderText as any },
      execute: async (args: any) => {
        const input = String(args?.input || '');
        if (!input) throw new Error('Input is required for fsdi_init');
        const fsdiArgs: string[] = [input];
        if (args?.projectDir) fsdiArgs.push('--project-dir', String(args.projectDir));
        return runFSDICommand('init', fsdiArgs);
      },
    }));
  }

  // fsdi_query - Registered query handlers
  if (enabled.has('query')) {
    ctx.tools.register(defineTool({
      name: 'fsdi_query',
      description: '[FSDI] Query registered handlers (longest-prefix argv match). Use --pick <field> to extract JSON field.',
      parameters: {
        argv: str('Query arguments (see QUERY-HANDLERS.md)', true),
        pick: str('Extract specific field from JSON output'),
        projectDir: str('Project directory (default: cwd)'),
      },
      output: { schema: { type: 'string' }, render: renderText as any },
      execute: async (args: any) => {
        const argv = String(args?.argv || '');
        if (!argv) throw new Error('Query argv is required for fsdi_query');
        const fsdiArgs: string[] = argv.split(/\s+/);
        if (args?.pick) fsdiArgs.push('--pick', String(args.pick));
        if (args?.projectDir) fsdiArgs.push('--project-dir', String(args.projectDir));
        return runFSDICommand('query', fsdiArgs);
      },
    }));
  }

  // fsdi_autonomous_max - Resilient autonomous with auto-retry on transient failures
  ctx.tools.register(defineTool({
    name: 'fsdi_autonomous_max',
    description: '[FSDI] Autonomous MAX — runs fsdi_auto with resilient auto-retry on transient failures (network, timeout, rate-limit, 5xx). Uses exponential backoff + jitter. Only stops when goal reached or maxRetries exhausted.',
    parameters: {
      init: str('Bootstrap from PRD/description before running (file path @... or text)'),
      maxRetries: { type: 'number', description: 'Maximum retries on transient failure (default: 5)' },
      baseDelayMs: { type: 'number', description: 'Base delay for exponential backoff in ms (default: 30000)' },
      maxDelayMs: { type: 'number', description: 'Maximum delay between retries in ms (default: 300000)' },
      projectDir: str('Project directory (default: cwd)'),
      model: str('Override LLM model'),
      maxBudget: { type: 'number', description: 'Max budget per step in USD' },
      ws: str('Workstream name for .planning/ routing'),
      wsPort: { type: 'number', description: 'Enable WebSocket transport on port' },
    },
    output: { schema: { type: 'string' }, render: renderText as any },
    execute: async (args: any) => {
      const maxRetries = Math.min(Math.max(Number(args?.maxRetries) || 5, 1), 20);
      const baseDelayMs = Math.max(Number(args?.baseDelayMs) || 30000, 5000);
      const maxDelayMs = Math.max(Number(args?.maxDelayMs) || 300000, baseDelayMs);

      const isTransientError = (error: Error): boolean => {
        const msg = error.message.toLowerCase();
        return (
          msg.includes('timeout') ||
          msg.includes('econnreset') ||
          msg.includes('etimedout') ||
          msg.includes('enotfound') ||
          msg.includes('econnrefused') ||
          msg.includes('network') ||
          msg.includes('rate limit') ||
          msg.includes('429') ||
          msg.includes('503') ||
          msg.includes('502') ||
          msg.includes('504') ||
          (msg.includes('api') && (msg.includes('unavailable') || msg.includes('error')))
        );
      };

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const runWithRetry = async (attempt: number = 1): Promise<string> => {
        try {
          const fsdiArgs: string[] = [];
          if (args?.init) fsdiArgs.push('--init', String(args.init));
          if (args?.projectDir) fsdiArgs.push('--project-dir', String(args.projectDir));
          if (args?.model) fsdiArgs.push('--model', args.model);
          if (args?.maxBudget) fsdiArgs.push('--max-budget', String(args.maxBudget));
          if (args?.ws) fsdiArgs.push('--ws', args.ws);
          if (args?.wsPort) fsdiArgs.push('--ws-port', String(args.wsPort));
          return await runFSDICommand('auto', fsdiArgs);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          if (attempt > maxRetries) {
            throw new Error(`fsdi_auto failed after ${maxRetries} retries: ${err.message}`);
          }
          if (!isTransientError(err)) {
            throw new Error(`fsdi_auto failed with non-transient error: ${err.message}`);
          }
          const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
          const jitter = Math.random() * 0.3 * delay;
          const totalDelay = Math.floor(delay + jitter);
          await sleep(totalDelay);
          return runWithRetry(attempt + 1);
        }
      };

      return runWithRetry();
    },
  }));
}

export default apply;