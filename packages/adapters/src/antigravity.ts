import { AssistantAdapter, HealthReport } from './contract';
import { 
  WorkspaceManager, 
  IngestionEngine 
} from '@careertwin/engine';
import { DocumentEngine } from '@careertwin/document-engine';
import { EvaluationRunSchema } from '@careertwin/schemas';
import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import path from 'path';

export class AntigravityAdapter implements AssistantAdapter {
  private workspace: WorkspaceManager;
  private ingestion: IngestionEngine;
  private documents: DocumentEngine;
  private openai: OpenAI;

  constructor(workspaceRoot: string) {
    this.workspace = new WorkspaceManager(workspaceRoot);
    this.ingestion = new IngestionEngine(this.workspace);
    this.documents = new DocumentEngine(path.join(workspaceRoot, 'packages/document-engine/templates'));
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'MISSING_API_KEY'
    });
  }

  async init() {
    await this.workspace.init();
  }

  async doctor(): Promise<HealthReport> {
    const fsExists = await this.workspace.exists();
    let configValid = false;
    if (fsExists) {
      try {
        await this.workspace.getConfig();
        configValid = true;
      } catch {}
    }

    return {
      node: process.version,
      config: configValid,
      latex: false, // Need actual check
      filesystem: fsExists,
    };
  }

  profile = {
    show: async () => this.ingestion.loadProfile(),
    ingest: async (text: string) => {
      await this.ingestion.importCV(text);
    },
    importCV: async (filePath: string) => {
      // Logic to read file and pass to ingest
    }
  };

  async evaluate(jobSource: string): Promise<any> {
    const profile = await this.ingestion.loadProfile();
    if (!profile) throw new Error('Cannot evaluate job: No candidate profile found.');

    const schema = zodToJsonSchema(EvaluationRunSchema as any, "EvaluationRun");

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert technical recruiter and career strategist. 
          Your task is to evaluate the provided candidate profile against the provided job description.
          Output strictly in JSON matching the EvaluationRunSchema. 
          Provide detailed actionable fixes and a realistic fit score.`
        },
        {
          role: "user",
          content: `CANDIDATE PROFILE:\n${JSON.stringify(profile, null, 2)}\n\nJOB DESCRIPTION:\n${jobSource}\n\nJSON SCHEMA:\n${JSON.stringify(schema)}`
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from OpenAI");

    const parsed = JSON.parse(content);
    
    // Ensure jobId and evaluatedAt are set correctly locally
    parsed.jobId = crypto.randomUUID();
    parsed.evaluatedAt = new Date().toISOString();
    
    return parsed;
  }

  async tailor(jobId: string): Promise<any> {
    throw new Error('Not implemented');
  }

  resume = {
    build: async (mode: 'ats' | 'startup' = 'ats', jobId?: string) => {
      const profile = await this.ingestion.loadProfile();
      if (!profile) throw new Error('No profile found');
      
      const outputPath = this.workspace.getPath(`artifacts/resumes/resume-${mode}-${Date.now()}.pdf`);
      const templateMode = mode === 'ats' ? 'ats-safe' : 'startup';
      return await this.documents.generateResume(profile, templateMode, outputPath);
    }
  };

  passport = {
    build: async () => { throw new Error('Not implemented'); },
    publish: async () => { throw new Error('Not implemented'); },
    unpublish: async () => { throw new Error('Not implemented'); },
  };

  tracker = {
    list: async () => [],
    get: async (id: string) => null,
    update: async (id: string, status: string) => {},
  };

  artifact = {
    inspect: async (id: string) => '',
    list: async () => [],
  };
}
