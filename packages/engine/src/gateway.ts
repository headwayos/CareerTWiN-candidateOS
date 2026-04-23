import OpenAI from 'openai';
import { WorkspaceManager } from './workspace';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fs from 'fs-extra';

export interface ProviderReadiness {
  ready: boolean;
  provider: string;
  hasCredentials: boolean;
  configuredModel: string;
  supportsStructuredOutput: boolean;
  baseUrl?: string;
  errors: string[];
}

export type ProviderType = 'openai' | 'anthropic' | 'openrouter' | 'local' | 'none';

interface ProviderConfig {
  provider: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export class ModelGateway {
  private client: OpenAI | null = null;
  private config: ProviderConfig;

  constructor(private workspace: WorkspaceManager) {
    this.config = this.resolveProvider();
    if (this.config.provider !== 'none' && this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        ...(this.config.baseUrl ? { baseURL: this.config.baseUrl } : {}),
      });
    }
  }

  private resolveProvider(): ProviderConfig {
    // Priority: env vars → config.json → none
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.CT_MODEL || 'gpt-4o',
      };
    }
    // Anthropic (via OpenAI-compatible proxy)
    if (process.env.ANTHROPIC_API_KEY) {
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
        model: process.env.CT_MODEL || 'claude-sonnet-4-20250514',
      };
    }
    // OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      return {
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        model: process.env.CT_MODEL || 'openai/gpt-4o',
      };
    }
    // Local (Ollama, LM Studio, vLLM, etc.)
    if (process.env.CT_LOCAL_URL) {
      return {
        provider: 'local',
        apiKey: process.env.CT_LOCAL_API_KEY || 'local',
        baseUrl: process.env.CT_LOCAL_URL,
        model: process.env.CT_MODEL || 'llama3',
      };
    }
    return { provider: 'none', model: 'none' };
  }

  get isConfigured(): boolean {
    return this.config.provider !== 'none' && !!this.config.apiKey;
  }

  async checkReadiness(): Promise<ProviderReadiness> {
    const errors: string[] = [];

    if (this.config.provider === 'none') {
      errors.push('No provider configured. Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY, or CT_LOCAL_URL');
    }
    if (this.config.provider === 'local' && this.config.baseUrl) {
      // Test reachability for local endpoints
      try {
        const res = await fetch(this.config.baseUrl + '/models');
        if (!res.ok) errors.push(`Local endpoint returned ${res.status}`);
      } catch {
        errors.push(`Local endpoint unreachable at ${this.config.baseUrl}`);
      }
    }
    if (this.config.model === 'none') {
      errors.push('No model configured. Set CT_MODEL env var.');
    }

    const supportsStructuredOutput = ['openai', 'openrouter'].includes(this.config.provider)
      || (this.config.provider === 'local'); // assume local supports it

    return {
      ready: this.config.provider !== 'none' && !!this.config.apiKey && errors.length === 0,
      provider: this.config.provider,
      hasCredentials: !!this.config.apiKey,
      configuredModel: this.config.model,
      supportsStructuredOutput,
      baseUrl: this.config.baseUrl,
      errors,
    };
  }

  async generateStructured<T>(
    systemPrompt: string, 
    userContent: string, 
    zodSchema: any, 
    schemaName: string
  ): Promise<T> {
    if (!this.client) {
      const readiness = await this.checkReadiness();
      const errorMsg = readiness.errors.length > 0
        ? readiness.errors.join('\n  ')
        : 'Provider not configured.';
      throw new Error(
        `ModelGateway: Cannot run inference.\n  ${errorMsg}\n\n` +
        `  Setup options:\n` +
        `    export OPENAI_API_KEY="sk-..."        # OpenAI\n` +
        `    export ANTHROPIC_API_KEY="sk-ant-..." # Anthropic\n` +
        `    export OPENROUTER_API_KEY="sk-or-..." # OpenRouter\n` +
        `    export CT_LOCAL_URL="http://localhost:11434/v1"  # Ollama/local\n\n` +
        `  Or run with --mock for demo data.`
      );
    }

    const schema = zodToJsonSchema(zodSchema as any, schemaName);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `${userContent}\n\nJSON SCHEMA STRICT:\n${JSON.stringify(schema)}`
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from provider.");

    return JSON.parse(content) as T;
  }
}
