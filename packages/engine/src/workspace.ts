import fs from 'fs-extra';
import path from 'path';
import { 
  LocalConfigSchema, 
  ArtifactManifestSchema,
  type LocalConfig,
  type ArtifactManifest
} from '@careertwin/schemas';

export class WorkspaceManager {
  private root: string;
  private ctDir: string;

  constructor(root: string) {
    this.root = root;
    this.ctDir = path.join(root, '.careertwin');
  }

  async init() {
    const dirs = [
      '',
      'profile',
      'artifacts/resumes',
      'artifacts/passports',
      'artifacts/reports',
      'artifacts/cover-letters',
      'jobs/postings',
      'jobs/evaluations',
      'tracker',
      'logs',
      'cache',
    ];

    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.ctDir, dir));
    }

    const configPath = path.join(this.ctDir, 'config.json');
    if (!(await fs.pathExists(configPath))) {
      const defaultConfig: LocalConfig = {
        workspaceRoot: this.root,
        version: '0.1.0',
        assistant: { default: 'antigravity' },
        llm: { provider: 'openai', model: 'gpt-4-turbo-preview' },
        rendering: { latex: 'tectonic' },
      };
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
    }

    const manifestPath = path.join(this.ctDir, 'manifest.json');
    if (!(await fs.pathExists(manifestPath))) {
      const defaultManifest: ArtifactManifest = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        artifacts: [],
      };
      await fs.writeJson(manifestPath, defaultManifest, { spaces: 2 });
    }

    const trackerPath = path.join(this.ctDir, 'tracker/applications.json');
    if (!(await fs.pathExists(trackerPath))) {
      await fs.writeJson(trackerPath, [], { spaces: 2 });
    }
  }

  async getConfig(): Promise<LocalConfig> {
    const config = await fs.readJson(path.join(this.ctDir, 'config.json'));
    return LocalConfigSchema.parse(config);
  }

  async updateConfig(config: Partial<LocalConfig>) {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    await fs.writeJson(path.join(this.ctDir, 'config.json'), updated, { spaces: 2 });
  }

  async getManifest(): Promise<ArtifactManifest> {
    const manifest = await fs.readJson(path.join(this.ctDir, 'manifest.json'));
    return ArtifactManifestSchema.parse(manifest);
  }

  getPath(subPath: string) {
    return path.join(this.ctDir, subPath);
  }

  async exists() {
    return fs.pathExists(this.ctDir);
  }
}
