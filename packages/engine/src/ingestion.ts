import crypto from 'crypto';
import { 
  CandidateProfileSchema, 
  type CandidateProfile 
} from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from './workspace';
import { ModelGateway } from './gateway';

export class IngestionEngine {
  constructor(
    private workspace: WorkspaceManager,
    private gateway?: ModelGateway
  ) {}

  async importCV(input: string | Buffer, options?: { mock?: boolean }): Promise<CandidateProfile> {
    let rawText = '';
    
    if (Buffer.isBuffer(input)) {
      try {
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: input });
        const data = await parser.getText();
        await parser.destroy();
        rawText = data.text;
      } catch (error: any) {
        throw new Error(`Failed to parse PDF: ${error.message}`);
      }
    } else {
      rawText = input;
    }

    if (options?.mock) {
      return this.importMockProfile();
    }

    if (!this.gateway) {
      throw new Error(
        'ModelGateway is not configured.\n' +
        '  To use live ingestion, set your provider credentials:\n' +
        '    export OPENAI_API_KEY="sk-..."\n' +
        '  Or run with --mock for demo data:\n' +
        '    npm run ct -- cv import --mock'
      );
    }

    const readiness = await this.gateway.checkReadiness();
    if (!readiness.ready) {
      throw new Error(
        `Provider "${readiness.provider}" is not ready.\n` +
        `  Credentials present: ${readiness.hasCredentials}\n` +
        `  Model: ${readiness.configuredModel}\n` +
        '  Run "npm run ct -- doctor" for details.'
      );
    }

    const parsed = await this.gateway.generateStructured<CandidateProfile>(
      `You are an expert resume parser. 
      Convert the raw resume text into a strictly structured JSON object. 
      The root object MUST contain the following keys: "bio", "experience", "education", "skills".
      - "bio" MUST have "name", "email", "summary", and "links".
      - "experience" and "education" should be arrays.
      - "skills" should be an array of strings.
      Extract all available information accurately.`,
      rawText,
      CandidateProfileSchema,
      'CandidateProfile'
    );

    if (!parsed.id) (parsed as any).id = crypto.randomUUID();

    const validated = CandidateProfileSchema.parse(parsed);
    await this.saveProfile(validated);
    return validated;
  }

  private async importMockProfile(): Promise<CandidateProfile> {
    const mockProfile: CandidateProfile = {
      id: crypto.randomUUID() as any,
      bio: {
        name: "[DEMO] Mock User",
        email: "demo@careertwin.local",
        summary: "This is a demo profile created with --mock. Replace with real data using ct cv import.",
        links: {},
      },
      experience: [],
      education: [],
      skills: ["demo-mode"],
    };
    const validated = CandidateProfileSchema.parse(mockProfile);
    await this.saveProfile(validated);
    return validated;
  }

  async saveProfile(profile: CandidateProfile) {
    const profilePath = this.workspace.getPath('profile/candidate.json');
    await fs.ensureDir(this.workspace.getPath('profile'));
    await fs.writeJson(profilePath, profile, { spaces: 2 });
  }

  async loadProfile(): Promise<CandidateProfile | null> {
    const profilePath = this.workspace.getPath('profile/candidate.json');
    if (await fs.pathExists(profilePath)) {
      return await fs.readJson(profilePath);
    }
    return null;
  }
}
