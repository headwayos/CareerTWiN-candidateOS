import OpenAI from 'openai';
import { WorkspaceManager } from './workspace';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface ProviderReadiness {
  ready: boolean;
  provider: string;
  hasCredentials: boolean;
  configuredModel: string;
  supportsStructuredOutput: boolean;
}

export class ModelGateway {
  private openai: OpenAI | null = null;
  private isConfigured = false;

  constructor(private workspace: WorkspaceManager) {
    const apiKey = process.env.OPENAI_API_KEY; // Extendable to read from config.json
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.isConfigured = true;
    }
  }

  async checkReadiness(): Promise<ProviderReadiness> {
    return {
      ready: this.isConfigured,
      provider: 'openai',
      hasCredentials: this.isConfigured,
      configuredModel: 'gpt-4o',
      supportsStructuredOutput: true,
    };
  }

  async generateStructured<T>(
    systemPrompt: string, 
    userContent: string, 
    zodSchema: any, 
    schemaName: string
  ): Promise<T> {
    if (!this.openai) {
      throw new Error("ModelGateway not configured. Provide an API key.");
    }

    const schema = zodToJsonSchema(zodSchema, schemaName);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
