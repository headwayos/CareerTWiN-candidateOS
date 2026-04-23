import { AssistantAdapter, HealthReport } from './contract';
import { 
  WorkspaceManager, 
  IngestionEngine,
  EvaluationEngine,
  ModelGateway
} from '@careertwin/engine';
import { DocumentEngine } from '@careertwin/document-engine';
import { PassportBuilder } from '@careertwin/passport';
import path from 'path';

/**
 * AntigravityAdapter — Thin operator surface for the Antigravity AI IDE.
 * 
 * This adapter does NOT contain inference logic. All AI operations
 * are delegated to the Engine's ModelGateway. The adapter only wraps
 * Engine operations into the AssistantAdapter contract.
 */
export class AntigravityAdapter implements AssistantAdapter {
  private workspace: WorkspaceManager;
  private gateway: ModelGateway;
  private ingestion: IngestionEngine;
  private evaluation: EvaluationEngine;
  private documents: DocumentEngine;
  private passportBuilder: PassportBuilder;

  constructor(workspaceRoot: string) {
    this.workspace = new WorkspaceManager(workspaceRoot);
    this.gateway = new ModelGateway(this.workspace);
    this.ingestion = new IngestionEngine(this.workspace, this.gateway);
    this.evaluation = new EvaluationEngine(this.workspace, this.gateway);
    this.documents = new DocumentEngine(path.join(workspaceRoot, 'packages/document-engine/templates'));
    this.passportBuilder = new PassportBuilder(this.workspace);
  }

  async init() {
    await this.workspace.init();
  }

  async doctor(): Promise<HealthReport> {
    const fsExists = await this.workspace.exists();
    let configValid = false;
    if (fsExists) {
      try { await this.workspace.getConfig(); configValid = true; } catch {}
    }

    let latexOk = false;
    try {
      const { execSync } = require('child_process');
      execSync('tectonic --version', { stdio: 'pipe' });
      latexOk = true;
    } catch {}

    return {
      node: process.version,
      config: configValid,
      latex: latexOk,
      filesystem: fsExists,
    };
  }

  // ─── Profile: Delegates to IngestionEngine ─────────────────
  profile = {
    show: async () => this.ingestion.loadProfile(),
    ingest: async (text: string) => {
      await this.ingestion.importCV(text);
    },
    importCV: async (filePath: string) => {
      const fs = require('fs-extra');
      const content = await fs.readFile(filePath, 'utf-8');
      await this.ingestion.importCV(content);
    }
  };

  // ─── Evaluate: Delegates to EvaluationEngine ──────────────
  async evaluate(jobSource: string): Promise<any> {
    const profile = await this.ingestion.loadProfile();
    if (!profile) throw new Error('No profile found. Import a CV first.');
    return this.evaluation.evaluateJob(jobSource, profile);
  }

  // ─── Tailor: Delegates to Engine ModelGateway ─────────────
  async tailor(jobId: string): Promise<any> {
    const profile = await this.ingestion.loadProfile();
    if (!profile) throw new Error('No profile found.');
    // Tailoring through the gateway is handled by the engine
    throw new Error('Tailoring not yet wired through the Engine. Use the CLI directly.');
  }

  // ─── Resume: Delegates to DocumentEngine ──────────────────
  resume = {
    build: async (mode: 'ats' | 'startup' = 'ats') => {
      const profile = await this.ingestion.loadProfile();
      if (!profile) throw new Error('No profile found');
      const outputPath = this.workspace.getPath(`artifacts/resumes/resume-${mode}-${Date.now()}.pdf`);
      const templateMode = mode === 'ats' ? 'ats-safe' : 'startup';
      return await this.documents.generateResume(profile, templateMode, outputPath);
    }
  };

  // ─── Passport: Delegates to PassportBuilder ───────────────
  passport = {
    build: async () => {
      const profile = await this.ingestion.loadProfile();
      if (!profile) throw new Error('No profile found.');
      return this.passportBuilder.buildPassport(profile);
    },
    publish: async () => this.passportBuilder.publish(),
    unpublish: async () => this.passportBuilder.unpublish(),
  };

  // ─── Tracker: Stub (tracker engine is not yet wired) ──────
  tracker = {
    list: async () => [],
    get: async (_id: string) => null,
    update: async (_id: string, _status: string) => {},
  };

  artifact = {
    inspect: async (_id: string) => '',
    list: async () => [],
  };
}
