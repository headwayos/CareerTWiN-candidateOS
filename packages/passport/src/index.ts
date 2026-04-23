import crypto from 'crypto';
import { 
  PassportSchema, 
  PassportReadinessSchema,
  type Passport,
  type PassportReadiness,
  type CandidateProfile,
} from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from '@careertwin/engine';

// Trust Boundary: which fields go where
export const TRUST_BOUNDARIES = {
  public: ['roleTags', 'skillTags', 'domainTags', 'founderIntro', 'summary'],
  founder: ['startupFitIndicators', 'evidenceMarkers', 'candidateId'],
  private: ['id'],  // raw profile, compensation, notes stay local
} as const;

export type PublishStatus = 'draft' | 'published' | 'unpublished';

interface PublishRecord {
  status: PublishStatus;
  lastPublishedAt?: string;
  lastUnpublishedAt?: string;
}

export class PassportBuilder {
  constructor(private workspace: WorkspaceManager) {}

  async buildPassport(profile: CandidateProfile): Promise<Passport> {
    const passport: Passport = {
      id: crypto.randomUUID() as any,
      candidateId: profile.id,
      summary: profile.bio.summary,
      founderIntro: `Passionate developer with expertise in ${profile.skills.slice(0, 3).join(', ')}.`,
      roleTags: ["Full Stack", "Backend"],
      skillTags: profile.skills,
      domainTags: ["SaaS", "DevTools"],
      evidenceMarkers: [],
      startupFitIndicators: ["Founder mindset", "Technical ownership"],
    };

    const validated = PassportSchema.parse(passport);
    await this.savePassport(validated);
    
    // Initialize publish state as draft
    await this.setPublishState({ status: 'draft' });
    
    return validated;
  }

  async checkReadiness(passport: Passport): Promise<PassportReadiness> {
    const checklist = [
      { task: "Bio complete", completed: !!passport.summary, impact: "high" as const },
      { task: "Skills tagged", completed: passport.skillTags.length > 0, impact: "medium" as const },
      { task: "Founder intro crafted", completed: !!passport.founderIntro, impact: "critical" as const },
      { task: "Evidence markers added", completed: passport.evidenceMarkers.length > 0, impact: "high" as const },
      { task: "Role tags defined", completed: passport.roleTags.length > 0, impact: "medium" as const },
      { task: "Domain tags defined", completed: passport.domainTags.length > 0, impact: "medium" as const },
      { task: "Startup fit indicators set", completed: passport.startupFitIndicators.length > 0, impact: "high" as const },
    ];

    const completedCount = checklist.filter(c => c.completed).length;
    const score = Math.round((completedCount / checklist.length) * 100);

    const readiness: PassportReadiness = {
      score,
      isReady: score >= 70,
      checklist,
    };

    const validated = PassportReadinessSchema.parse(readiness);
    await this.saveReadinessReport(validated);
    return validated;
  }

  /** Filter passport to only include fields for the given trust boundary */
  filterForBoundary(passport: Passport, boundary: 'public' | 'founder'): Partial<Passport> {
    const allowedFields = boundary === 'founder'
      ? [...TRUST_BOUNDARIES.public, ...TRUST_BOUNDARIES.founder]
      : TRUST_BOUNDARIES.public;

    const filtered: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in passport) {
        filtered[key] = (passport as any)[key];
      }
    }
    return filtered as Partial<Passport>;
  }

  async getPublishState(): Promise<PublishRecord> {
    const statePath = this.workspace.getPath('artifacts/passports/publish-state.json');
    if (await fs.pathExists(statePath)) {
      return await fs.readJson(statePath);
    }
    return { status: 'draft' };
  }

  async setPublishState(state: PublishRecord): Promise<void> {
    const statePath = this.workspace.getPath('artifacts/passports/publish-state.json');
    await fs.ensureDir(this.workspace.getPath('artifacts/passports'));
    await fs.writeJson(statePath, state, { spaces: 2 });
  }

  async publish(): Promise<{ publicPayload: Partial<Passport>; founderPayload: Partial<Passport> }> {
    const passportPath = this.workspace.getPath('artifacts/passports/passport.json');
    if (!(await fs.pathExists(passportPath))) {
      throw new Error('No passport found. Run "npm run ct -- passport build" first.');
    }
    const passport = PassportSchema.parse(await fs.readJson(passportPath));
    
    const publicPayload = this.filterForBoundary(passport, 'public');
    const founderPayload = this.filterForBoundary(passport, 'founder');
    
    await this.setPublishState({
      status: 'published',
      lastPublishedAt: new Date().toISOString(),
    });

    return { publicPayload, founderPayload };
  }

  async unpublish(): Promise<void> {
    await this.setPublishState({
      status: 'unpublished',
      lastUnpublishedAt: new Date().toISOString(),
    });
  }

  async savePassport(passport: Passport) {
    const path = this.workspace.getPath('artifacts/passports/passport.json');
    await fs.ensureDir(this.workspace.getPath('artifacts/passports'));
    await fs.writeJson(path, passport, { spaces: 2 });
  }

  async saveReadinessReport(report: PassportReadiness) {
    const path = this.workspace.getPath('artifacts/passports/readiness.json');
    await fs.writeJson(path, report, { spaces: 2 });
  }
}
