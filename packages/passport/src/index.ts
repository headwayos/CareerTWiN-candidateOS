import { 
  PassportSchema, 
  PassportReadinessSchema,
  type Passport,
  type PassportReadiness,
  type CandidateProfile,
  type PublishState
} from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from '@careertwin/engine';

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
    return validated;
  }

  async checkReadiness(passport: Passport): Promise<PassportReadiness> {
    const readiness: PassportReadiness = {
      score: 80,
      isReady: true,
      checklist: [
        { task: "Bio complete", completed: true, impact: "high" },
        { task: "Skills tagged", completed: true, impact: "medium" },
        { task: "Founder intro crafted", completed: true, impact: "critical" },
        { task: "Evidence markers added", completed: false, impact: "high" },
      ],
    };

    const validated = PassportReadinessSchema.parse(readiness);
    await this.saveReadinessReport(validated);
    return validated;
  }

  async savePassport(passport: Passport) {
    const path = this.workspace.getPath('artifacts/passports/passport.json');
    await fs.writeJson(path, passport, { spaces: 2 });
  }

  async saveReadinessReport(report: PassportReadiness) {
    const path = this.workspace.getPath('artifacts/passports/readiness.json');
    await fs.writeJson(path, report, { spaces: 2 });
  }
}
