import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import type {
  ApplyPacket,
  ApplicationAnswersFile,
  EvaluationRun,
  ApplicationTrackerItem,
  DiscoveredPosting,
} from '@careertwin/schemas';
import { ApplyPacketSchema } from '@careertwin/schemas';
import { WorkspaceManager } from './workspace';
import { TrackerEngine } from './tracker';
import { ModelGateway } from './gateway';

// ─── ApplyEngine ─────────────────────────────────────────────────────────────

export class ApplyEngine {
  private tracker: TrackerEngine;

  constructor(
    private workspace: WorkspaceManager,
    private gateway?: ModelGateway,
  ) {
    this.tracker = new TrackerEngine(workspace);
  }

  // ─── Draft creation ────────────────────────────────────────────────────────

  async createDraft(jobId: string, opts?: { mock?: boolean }): Promise<ApplyPacket> {
    // 1. Load evaluation artifact
    const evalRun = await this.loadEvaluation(jobId);
    if (!evalRun) {
      throw new Error(`No evaluation found for job ${jobId}. Run: npm run ct -- evaluate <jd> first.`);
    }

    // 2. Load candidate profile
    const profile = await this.loadProfile();

    // 3. Resolve source artifact references
    const trackerEntry = await this.findTrackerEntry(jobId);
    const discovered = await this.findDiscoveredPosting(evalRun);

    // 4. Build packet directory
    const packetDir = this.workspace.getPath(`jobs/applications/${jobId}`);
    await fs.ensureDir(packetDir);

    // 5. Generate answers (always — non-blocking)
    const answers = this.generateAnswers(jobId, evalRun, profile);
    await fs.writeJson(path.join(packetDir, 'answers.json'), answers, { spaces: 2 });

    // 6. Generate cover letter (optional — non-blocking)
    let coverLetterPath: string | undefined;
    try {
      const coverLetter = opts?.mock
        ? this.mockCoverLetter(evalRun, profile)
        : await this.generateCoverLetter(evalRun, profile);
      const clPath = path.join(packetDir, 'cover-letter.md');
      await fs.writeFile(clPath, coverLetter, 'utf-8');
      coverLetterPath = 'cover-letter.md';
    } catch {
      // Cover letter generation is optional — packet creation continues without it
      coverLetterPath = undefined;
    }

    // 7. Link tailored resume if it exists
    let tailoredResumePath: string | undefined;
    const resumeDir = this.workspace.getPath('artifacts/resumes');
    if (await fs.pathExists(resumeDir)) {
      const files = await fs.readdir(resumeDir);
      const tailored = files.find(f => f.includes(jobId.slice(0, 8)));
      if (tailored) tailoredResumePath = `../../artifacts/resumes/${tailored}`;
    }

    // 8. Generate review checklist
    const checklist = this.generateChecklist(evalRun, coverLetterPath, tailoredResumePath);
    await fs.writeFile(path.join(packetDir, 'review-checklist.md'), checklist, 'utf-8');

    // 9. Assemble packet.json
    const packet = ApplyPacketSchema.parse({
      jobId,
      company: evalRun.blockA_roleSummary?.company ?? 'Unknown',
      title: evalRun.blockA_roleSummary?.title ?? 'Unknown',
      createdAt: new Date().toISOString(),
      status: 'draft',
      evaluationBand: evalRun.recommendationBand,
      evaluationScore: evalRun.scores?.overall,
      sourceUrl: discovered?.sourceUrl,
      canonicalJobUrl: discovered?.canonicalUrl ?? undefined,
      evaluationArtifactPath: `../evaluations/${evalRun.jobId}.json`,
      trackerEntryId: trackerEntry?.id,
      discoveredPostingId: discovered?.discoveredId,
      artifacts: {
        coverLetter: coverLetterPath,
        answers: 'answers.json',
        tailoredResume: tailoredResumePath,
        reviewChecklist: 'review-checklist.md',
      },
    });

    await fs.writeJson(path.join(packetDir, 'packet.json'), packet, { spaces: 2 });

    // 10. Update tracker status → tailored
    if (trackerEntry) {
      await this.tracker.update(trackerEntry.id, 'tailored');
      await this.tracker.addNote(trackerEntry.id, `Apply draft created at ${new Date().toISOString()}`);
    }

    return packet;
  }

  // ─── Review ────────────────────────────────────────────────────────────────

  async reviewPacket(jobId: string, notes?: string): Promise<ApplyPacket> {
    const packetPath = this.workspace.getPath(`jobs/applications/${jobId}/packet.json`);
    if (!(await fs.pathExists(packetPath))) {
      throw new Error(`No apply packet for job ${jobId}. Run: npm run ct -- apply draft ${jobId}`);
    }

    const packet: ApplyPacket = await fs.readJson(packetPath);
    packet.status = 'reviewed';
    packet.reviewedAt = new Date().toISOString();
    if (notes) packet.reviewNotes = notes;

    await fs.writeJson(packetPath, packet, { spaces: 2 });

    // Update tracker → ready-to-apply (NOT applied — reserved for submission phase)
    const trackerEntry = await this.findTrackerEntry(jobId);
    if (trackerEntry) {
      await this.tracker.update(trackerEntry.id, 'ready-to-apply');
      await this.tracker.addNote(trackerEntry.id, `Packet reviewed. ${notes ?? ''}`);
    }

    return packet;
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async listPackets(): Promise<ApplyPacket[]> {
    const applyDir = this.workspace.getPath('jobs/applications');
    if (!(await fs.pathExists(applyDir))) return [];

    const dirs = await fs.readdir(applyDir);
    const packets: ApplyPacket[] = [];

    for (const d of dirs) {
      const pPath = path.join(applyDir, d, 'packet.json');
      if (await fs.pathExists(pPath)) {
        try {
          packets.push(await fs.readJson(pPath));
        } catch { /* skip malformed */ }
      }
    }

    return packets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async loadEvaluation(jobId: string): Promise<EvaluationRun | null> {
    const evalDir = this.workspace.getPath('jobs/evaluations');
    if (!(await fs.pathExists(evalDir))) return null;

    const files = await fs.readdir(evalDir);
    for (const f of files.filter(f => f.endsWith('.json'))) {
      try {
        const data = await fs.readJson(path.join(evalDir, f));
        if (data.jobId === jobId) return data as EvaluationRun;
      } catch { /* skip */ }
    }
    return null;
  }

  private async loadProfile(): Promise<any> {
    const profilePath = this.workspace.getPath('profile/candidate.json');
    if (await fs.pathExists(profilePath)) return fs.readJson(profilePath);
    return { name: 'Candidate', summary: '' };
  }

  private async findTrackerEntry(jobId: string): Promise<ApplicationTrackerItem | null> {
    const items = await this.tracker.list();
    return items.find(i => i.jobId === jobId) ?? null;
  }

  private async findDiscoveredPosting(evalRun: EvaluationRun): Promise<DiscoveredPosting | null> {
    const discDir = this.workspace.getPath('jobs/discovered');
    if (!(await fs.pathExists(discDir))) return null;

    const files = await fs.readdir(discDir);
    for (const f of files.filter(f => f.endsWith('.json'))) {
      try {
        const data = await fs.readJson(path.join(discDir, f));
        // Match by company + title if possible
        if (data.company === evalRun.blockA_roleSummary?.company && data.title === evalRun.blockA_roleSummary?.title) {
          return data as DiscoveredPosting;
        }
      } catch { /* skip */ }
    }
    return null;
  }

  private generateAnswers(jobId: string, evalRun: EvaluationRun, profile: any): ApplicationAnswersFile {
    const now = new Date().toISOString();
    return {
      jobId,
      generatedAt: now,
      answers: [
        {
          questionKey: 'why_interested',
          questionText: 'Why are you interested in this role?',
          answer: evalRun.blockE_personalizationPlan?.cvChanges?.[0]
            ? `I'm drawn to this role because it aligns with my experience in ${evalRun.blockA_roleSummary?.function ?? 'engineering'}. ${evalRun.blockC_levelStrategy?.strategyName ?? ''}`
            : `This role at ${evalRun.blockA_roleSummary?.company ?? 'the company'} aligns well with my career goals and technical expertise.`,
          source: 'generated',
          editable: true,
        },
        {
          questionKey: 'relevant_experience',
          questionText: 'What relevant experience do you have?',
          answer: evalRun.blockB_cvMatch?.topMatches
            ? `Key strengths: ${evalRun.blockB_cvMatch.topMatches.join(', ')}`
            : `I bring ${profile.experience?.[0]?.years ?? 'several'} years of experience in ${profile.experience?.[0]?.role ?? 'software engineering'}.`,
          source: 'generated',
          editable: true,
        },
        {
          questionKey: 'compensation',
          questionText: 'What is your expected compensation?',
          answer: evalRun.blockD_compensationDemand?.benchmarkTable?.[0]
            ? `Based on market data: ${evalRun.blockD_compensationDemand.benchmarkTable[0].p50 ?? 'competitive'}`
            : 'Open to discussion based on the full compensation package.',
          source: 'generated',
          editable: true,
        },
        {
          questionKey: 'work_authorization',
          questionText: 'Are you authorized to work in the required location?',
          answer: 'Please confirm and edit this answer based on your work authorization status.',
          source: 'generated',
          editable: true,
        },
        {
          questionKey: 'start_date',
          questionText: 'When can you start?',
          answer: 'Available to discuss start date. Standard notice period applies.',
          source: 'generated',
          editable: true,
        },
      ],
    };
  }

  private async generateCoverLetter(evalRun: EvaluationRun, profile: any): Promise<string> {
    if (!this.gateway) {
      return this.mockCoverLetter(evalRun, profile);
    }

    // Use LLM for cover letter
    const prompt = [
      'Generate a professional cover letter for the following opportunity.',
      `Company: ${evalRun.blockA_roleSummary?.company ?? 'Unknown'}`,
      `Role: ${evalRun.blockA_roleSummary?.title ?? 'Unknown'}`,
      `Match Score: ${evalRun.scores?.overall ?? 'N/A'}/100`,
      `Strengths: ${JSON.stringify(evalRun.blockB_cvMatch?.topMatches ?? [])}`,
      `Positioning: ${evalRun.blockC_levelStrategy?.strategyName ?? ''}`,
      `Candidate: ${profile.name ?? 'Candidate'}`,
      `Summary: ${profile.summary ?? ''}`,
      '',
      'Write 3-4 paragraphs: intro with enthusiasm, body with specific fit evidence, closing with call to action.',
      'Output markdown only, no explanations.',
    ].join('\n');

    try {
      const response = await this.gateway.generateText(
        'You are an expert career coach helping a candidate apply for a job.',
        prompt
      );
      return response ?? this.mockCoverLetter(evalRun, profile);
    } catch {
      return this.mockCoverLetter(evalRun, profile);
    }
  }

  private mockCoverLetter(evalRun: EvaluationRun, profile: any): string {
    const company = evalRun.blockA_roleSummary?.company ?? 'the company';
    const role = evalRun.blockA_roleSummary?.title ?? 'this role';
    const score = evalRun.scores?.overall ?? 'N/A';

    return [
      `# Cover Letter — ${role} at ${company}`,
      '',
      `Dear Hiring Manager,`,
      '',
      `I am writing to express my strong interest in the ${role} position at ${company}. ` +
      `With my background in ${profile.summary?.slice(0, 100) ?? 'software engineering'}, ` +
      `I believe I am well-positioned to contribute meaningfully to your team.`,
      '',
      `My evaluation of this opportunity indicates a ${evalRun.recommendationBand ?? 'strong'} match ` +
      `(${score}/100). ${evalRun.blockC_levelStrategy?.strategyName ?? 'I bring relevant experience and a strong technical foundation.'}`,
      '',
      `I would welcome the opportunity to discuss how my experience aligns with your needs. ` +
      `I am available at your earliest convenience for a conversation.`,
      '',
      `Best regards,`,
      `${profile.name ?? 'Candidate'}`,
      '',
      `---`,
      `*This cover letter was generated by CTOSS. Please review and personalize before sending.*`,
    ].join('\n');
  }

  private generateChecklist(
    evalRun: EvaluationRun,
    coverLetter?: string,
    tailoredResume?: string,
  ): string {
    const lines = [
      `## Application Review Checklist`,
      `**${evalRun.blockA_roleSummary?.title ?? 'Role'} at ${evalRun.blockA_roleSummary?.company ?? 'Company'}**`,
      `Band: ${evalRun.recommendationBand ?? 'unknown'} · Score: ${evalRun.scores?.overall ?? '?'}/100`,
      '',
      `### Artifacts`,
      coverLetter ? `- [ ] Cover letter reviewed and personalized` : `- [x] Cover letter skipped (not generated)`,
      `- [ ] Application answers reviewed and edited`,
      tailoredResume ? `- [ ] Tailored resume reviewed` : `- [ ] Resume tailored for this role`,
      '',
      `### Pre-Submit`,
      `- [ ] Compensation expectations confirmed`,
      `- [ ] Work authorization verified`,
      `- [ ] Start date confirmed`,
      `- [ ] Ready to submit`,
      '',
      `> Run: npm run ct -- apply review <jobId>  when all items are checked.`,
    ];
    return lines.join('\n');
  }
}
