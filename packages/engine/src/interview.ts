import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import {
  LikelyQuestionsFileSchema,
  StoryMapSchema,
  type LikelyQuestionsFile,
  type LikelyQuestion,
  type StoryMap,
  type StoryBank,
  type Story,
} from '@careertwin/schemas';
import type { EvaluationRun } from '@careertwin/schemas';
import { WorkspaceManager } from './workspace';
import { StoryBankEngine } from './story-bank';
import type { ModelGateway } from './gateway';

// ─── Internal context ─────────────────────────────────────────────────────────

interface PrepContext {
  jobId:     string;
  evalRun:   EvaluationRun | null;
  profile:   Record<string, any> | null;
  storyBank: StoryBank;
  storyMap:  StoryMap | null;
  packet:    Record<string, any> | null;      // ApplyPacket (optional)
  discovered: Record<string, any> | null;     // DiscoveredPosting (optional)
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockQuestions(jobId: string, role: string, company: string): LikelyQuestionsFile {
  const qs: Omit<LikelyQuestion, 'questionId'>[] = [
    { category: 'recruiter',       question: `Tell me about yourself.`,                                                       whyTheyAsk: 'Assess fit and communication.',     answerStrategy: 'Use your 60-second career narrative. Lead with your current level, a key win, and what you\'re looking for next.',             mappedStoryIds: [], riskLevel: 'low'    },
    { category: 'recruiter',       question: `Why are you interested in ${company}?`,                                          whyTheyAsk: 'Check motivation and research.',    answerStrategy: 'Reference the role archetype and domain context from Block A. Be specific about the mission or technical problem.',              mappedStoryIds: [], riskLevel: 'low'    },
    { category: 'hiring-manager',  question: `Walk me through your most impactful technical project.`,                         whyTheyAsk: 'Assess depth and ownership.',       answerStrategy: 'Use your top mapped story. Include scope, constraints, tradeoffs, and measurable outcome.',                                      mappedStoryIds: [], riskLevel: 'low'    },
    { category: 'hiring-manager',  question: `How do you handle competing priorities?`,                                        whyTheyAsk: 'Assess judgment and stakeholder management.', answerStrategy: 'Use a story that demonstrates prioritisation under pressure. Quantify the tradeoff.',                                            mappedStoryIds: [], riskLevel: 'medium' },
    { category: 'behavioral',      question: `Tell me about a time you disagreed with your manager or team.`,                  whyTheyAsk: 'Assess psychological safety and candor.', answerStrategy: 'Show respectful disagreement with data. Share the outcome — even if you were overruled. Focus on collaborative resolution.',    mappedStoryIds: [], riskLevel: 'medium' },
    { category: 'behavioral',      question: `Tell me about a time you failed.`,                                               whyTheyAsk: 'Assess self-awareness.',            answerStrategy: 'Pick a real but recoverable failure. Show what you learned and changed. Avoid blame.',                                           mappedStoryIds: [], riskLevel: 'high'   },
    { category: 'technical',       question: `How would you design a system to handle ${role.toLowerCase()} at scale?`,        whyTheyAsk: 'Assess technical depth.',           answerStrategy: 'Clarify requirements first. Cover data flows, failure modes, and tradeoffs. Use your strongest tech background.',                  mappedStoryIds: [], riskLevel: 'medium' },
    { category: 'system-design',   question: `Design a scalable job processing queue.`,                                        whyTheyAsk: 'Assess distributed systems thinking.', answerStrategy: 'Cover partitioning, retries, idempotency, backpressure. Ask clarifying questions before diving in.',                              mappedStoryIds: [], riskLevel: 'medium' },
    { category: 'founder',         question: `Why do you want to join an early-stage company?`,                                whyTheyAsk: 'Assess risk appetite and mission fit.', answerStrategy: 'Be honest about your appetite for ambiguity. Reference your demonstrated pattern of ownership in prior roles.',                   mappedStoryIds: [], riskLevel: 'low'    },
  ];

  return LikelyQuestionsFileSchema.parse({
    jobId,
    generatedAt: new Date().toISOString(),
    questions: qs.map((q, i) => ({
      ...q,
      questionId: crypto.createHash('sha256').update(q.question).digest('hex').slice(0, 8),
    })),
  });
}

function mockInterviewPackMd(ctx: PrepContext): string {
  const role    = ctx.evalRun?.blockA_roleSummary;
  const scores  = ctx.evalRun?.scores;
  const band    = ctx.evalRun?.recommendationBand ?? 'strong-apply';
  const gaps    = ctx.evalRun?.blockB_cvMatch?.gaps ?? [];
  const stories = ctx.storyBank.stories.filter(s => s.status !== 'archived').slice(0, 3);
  const storyMap = ctx.storyMap;

  const lines = [
    `# Interview Prep Pack`,
    ``,
    `## Role Snapshot`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Company | ${role?.company ?? 'Unknown'} |`,
    `| Role | ${role?.title ?? 'Unknown'} |`,
    `| Level | ${role?.level ?? 'Unknown'} |`,
    `| Archetype | ${role?.archetype ?? '—'} |`,
    `| Domain | ${role?.domain ?? '—'} |`,
    `| Work Mode | ${role?.workMode ?? '—'} |`,
    `| Recommendation Band | **${band}** |`,
    `| Overall Score | ${scores?.overall ?? '—'}/100 |`,
    ``,
    `---`,
    ``,
    `## Positioning`,
    ``,
    `You are interviewing for a **${role?.level ?? 'Senior'}** ${role?.archetype ?? 'engineering'} role at **${role?.company ?? 'this company'}**.`,
    `Your profile shows strong alignment on skills and experience (${scores?.skills ?? 85}/100 skills match). Lead with technical ownership and measurable impact.`,
    ``,
    `---`,
    ``,
    `## Top Strengths to Emphasise`,
    ``,
    ...(ctx.evalRun?.blockB_cvMatch?.topMatches ?? ['Technical depth', 'Cross-functional experience', 'Strong execution track record'])
      .map((m: string) => `- **${m}**`),
    ``,
    `---`,
    ``,
    `## Risks / Gaps to Handle Honestly`,
    ``,
    ...(gaps.length > 0
      ? gaps.map((g: any) => `- **${g.gap ?? g}**: ${g.mitigation ?? 'Acknowledge and frame your plan to close this gap.'}`)
      : [`- No major gaps identified — focus on depth over breadth.`]),
    ``,
    `---`,
    ``,
    `## Story Map`,
    ``,
    ...(storyMap && storyMap.mappedStories.length > 0
      ? storyMap.mappedStories.map(m =>
          `- **${m.requirement}** → *${m.storyTitle}* (${Math.round(m.confidence * 100)}% fit)`
        )
      : stories.length > 0
        ? stories.map(s => `- *${s.title}* (${s.tags.join(', ')})`)
        : [`- Seed stories by running: \`npm run ct -- batch --mock\``]),
    ``,
    `---`,
    ``,
    `## Questions to Ask the Interviewer`,
    ``,
    `- What does success look like in the first 90 days?`,
    `- What is the biggest technical challenge the team is facing right now?`,
    `- How does engineering collaborate with product at ${role?.company ?? 'this company'}?`,
    `- What does the feedback/growth loop look like for this role?`,
    ``,
    `---`,
    ``,
    `## Final Prep Checklist`,
    ``,
    `- [ ] Review the top 3 job requirements`,
    `- [ ] Practice your 60-second career narrative`,
    `- [ ] Rehearse your top 3 STAR stories (short versions)`,
    `- [ ] Prepare your compensation expectations based on the market data`,
    `- [ ] Prepare your "why ${role?.company ?? 'this company'}" answer`,
    `- [ ] Prepare 3 thoughtful questions for the interviewer`,
    ``,
    `---`,
    ``,
    `*Generated by CTOSS — based on local evaluation data only. Edit freely.*`,
  ];

  return lines.join('\n');
}

function generateDrillPlan(ctx: PrepContext): string {
  const role  = ctx.evalRun?.blockA_roleSummary;
  const gaps  = ctx.evalRun?.blockB_cvMatch?.gaps ?? [];
  const stories = ctx.storyBank.stories.filter(s => s.status !== 'archived').slice(0, 5);
  const highRiskGaps = gaps.filter((g: any) => g.severity === 'major' || g.severity === 'critical');

  return [
    `# Drill Plan — ${role?.title ?? 'Interview'} at ${role?.company ?? 'Company'}`,
    ``,
    `*This plan is generated from your local evaluation data. Adjust timing to your schedule.*`,
    ``,
    `---`,
    ``,
    `## 30-Minute Express Prep`,
    ``,
    `1. **10 min** — Read your story-export.md. Pick your top 2 stories.`,
    `2. **10 min** — Practice the short version (≤60 sec) of each story out loud.`,
    `3. **10 min** — Write your "Why ${role?.company ?? 'this company'}" answer and review your 3 questions to ask.`,
    ``,
    `---`,
    ``,
    `## 60-Minute Standard Prep`,
    ``,
    `1. **15 min** — Review the full story-export.md. Map stories to role requirements.`,
    `2. **15 min** — Practice your top 3 stories aloud — short AND long versions.`,
    `3. **15 min** — Read likely-questions.json. Prepare answers for the 3 highest-risk questions.`,
    `4. **10 min** — Prepare your comp narrative using the benchmark from Block D.`,
    `5. **5 min**  — Finalise your 3 questions for the interviewer.`,
    ``,
    `---`,
    ``,
    `## 2-Hour Deep Prep`,
    ``,
    `1. **30 min** — Full story rehearsal. Record yourself and review timing.`,
    `2. **30 min** — Work through ALL likely questions by category.`,
    `3. **20 min** — Prepare system-design narrative using your strongest architectural experience.`,
    `4. **20 min** — Review candidate-risk-notes.md. Prepare honest framings for every gap.`,
    `5. **15 min** — Research ${role?.company ?? 'the company'} using the role brief and your own context.`,
    `6. **5 min**  — Pack: check video setup, water, notes, CV printed.`,
    ``,
    `---`,
    ``,
    `## Story Rehearsal Order`,
    ``,
    `Practice stories in this priority order:`,
    ``,
    ...(stories.length > 0
      ? stories.map((s, i) => `${i + 1}. **${s.title}** — ${s.tags.slice(0, 3).join(', ')}`)
      : [`1. No stories seeded yet — run: \`npm run ct -- batch --mock\``]),
    ``,
    `---`,
    ``,
    `## High-Risk Questions to Practice First`,
    ``,
    ...(highRiskGaps.length > 0
      ? highRiskGaps.map((g: any) => `- How would you frame gap: *${g.gap ?? g}*?`)
      : [`- "Tell me about a time you failed"`, `- "Describe a disagreement with your manager"`, `- "Why are you leaving your current role?"`]),
    ``,
    `---`,
    ``,
    `## Answer Timing Guide`,
    ``,
    `| Format | Target |`,
    `| --- | --- |`,
    `| Phone screen STAR | ≤90 seconds |`,
    `| Panel interview STAR | ≤3 minutes |`,
    `| Technical question | Clarify first (60 sec), then answer (5–8 min) |`,
    `| System design | Ask requirements (2 min), design (15–20 min) |`,
    ``,
  ].join('\n');
}

function generateCompanyRoleBrief(ctx: PrepContext): string {
  const role    = ctx.evalRun?.blockA_roleSummary;
  const levelStrat = ctx.evalRun?.blockC_levelStrategy;

  return [
    `# Company & Role Brief — ${role?.title ?? 'Role'} at ${role?.company ?? 'Company'}`,
    ``,
    `*Based on the job description and local evaluation artifacts. No live web research was performed.*`,
    ``,
    `---`,
    ``,
    `## Role Summary`,
    ``,
    `**Title:** ${role?.title ?? '—'}  `,
    `**Company:** ${role?.company ?? '—'}  `,
    `**Level:** ${role?.level ?? '—'}  `,
    `**Archetype:** ${role?.archetype ?? '—'}  `,
    `**Function:** ${role?.function ?? '—'}  `,
    `**Domain:** ${role?.domain ?? '—'}  `,
    `**Work Mode:** ${role?.workMode ?? '—'}  `,
    `**Compensation Range:** ${role?.compensationRange ?? 'Not disclosed'}  `,
    ``,
    `---`,
    ``,
    `## What This Role Is About`,
    ``,
    role?.tldr ?? `*Role summary not available — review the job description directly.*`,
    ``,
    `---`,
    ``,
    `## Why This Role Matters (for You)`,
    ``,
    role?.whyThisMatters ?? `*Personalised positioning not available.*`,
    ``,
    `---`,
    ``,
    `## What the Team Likely Needs`,
    ``,
    levelStrat?.talkingPoints?.map((t: string) => `- ${t}`).join('\n') ?? `- Review the job description's "what you'll do" section.`,
    ``,
    `---`,
    ``,
    `## Questions to Clarify in the Interview`,
    ``,
    `- What does the team look like today (size, tenure, distribution)?`,
    `- What is the tech stack and what is planned to change?`,
    `- What does the onboarding process look like for this role?`,
    `- Who would I be collaborating with most closely?`,
    ``,
  ].join('\n');
}

function generateCandidateRiskNotes(ctx: PrepContext): string {
  const gaps      = ctx.evalRun?.blockB_cvMatch?.gaps ?? [];
  const risks     = ctx.evalRun?.blockB_cvMatch?.risks ?? [];
  const levelStrat = ctx.evalRun?.blockC_levelStrategy;
  const score     = ctx.evalRun?.scores?.overall ?? 0;

  return [
    `# Candidate Risk Notes`,
    ``,
    `*This document surfaces potential interviewer concerns based on your evaluation data. Do not overclaim. Use honest framing.*`,
    ``,
    `---`,
    ``,
    `## Profile Summary`,
    ``,
    `**Overall Match Score:** ${score}/100  `,
    `**Level Alignment:** ${levelStrat?.levelAlignment ?? '—'}  `,
    `**Level Strategy:** ${levelStrat?.strategyName ?? '—'}  `,
    ``,
    `---`,
    ``,
    `## Gaps Identified`,
    ``,
    ...(gaps.length > 0
      ? gaps.map((g: any) => [
          `### ${g.gap ?? 'Gap'}`,
          `**Severity:** ${g.severity ?? 'minor'}  `,
          `**Safe Framing:** ${g.mitigation ?? 'Acknowledge and describe your plan to develop this skill.'}`,
          ``,
        ].join('\n'))
      : [`*No significant gaps identified.*`]),
    ``,
    `---`,
    ``,
    `## Risk Flags`,
    ``,
    ...(risks.length > 0
      ? risks.map((r: any) => `- **${r.risk ?? r}**: ${r.mitigation ?? 'Prepare an honest, direct response.'}`)
      : [`- No critical risks flagged.`]),
    ``,
    `---`,
    ``,
    `## What NOT to Overclaim`,
    ``,
    `- Do not invent metrics, team sizes, or project outcomes.`,
    `- If you led as part of a team, say "I was a key contributor to..." not "I built...".`,
    `- If you haven't used a specific technology in production, say "I have studied/experimented with X and am ramping up."`,
    `- If a gap is real, acknowledge it directly and follow with your concrete plan.`,
    ``,
    `---`,
    ``,
    `## Areas That Need More Practice`,
    ``,
    ...(gaps.filter((g: any) => g.severity === 'major' || g.severity === 'critical').length > 0
      ? gaps
          .filter((g: any) => g.severity === 'major' || g.severity === 'critical')
          .map((g: any) => `- ${g.gap ?? g}`)
      : [`- All identified gaps are minor. Focus on clean, confident delivery of your strongest stories.`]),
    ``,
  ].join('\n');
}

// ─── InterviewEngine ──────────────────────────────────────────────────────────

export class InterviewEngine {
  private storyBankEngine: StoryBankEngine;

  constructor(private workspace: WorkspaceManager) {
    this.storyBankEngine = new StoryBankEngine(workspace);
  }

  // ─── Load context (gracefully handles missing optional artifacts) ──────────

  async loadContext(jobId: string): Promise<PrepContext> {
    const evalPath      = this.workspace.getPath(`jobs/evaluations/${jobId}.json`);
    const profilePath   = this.workspace.getPath('profile/profile.json');
    const packetPath    = this.workspace.getPath(`jobs/applications/${jobId}/packet.json`);
    const storyMapPath  = this.workspace.getPath(`jobs/interview/${jobId}/story-map.json`);
    const discovPath    = this.workspace.getPath(`jobs/discovered`);

    const evalRun: EvaluationRun | null = (await fs.pathExists(evalPath))
      ? await fs.readJson(evalPath)
      : null;

    const profile: Record<string, any> | null = (await fs.pathExists(profilePath))
      ? await fs.readJson(profilePath)
      : null;

    const packet: Record<string, any> | null = (await fs.pathExists(packetPath))
      ? await fs.readJson(packetPath)
      : null;

    const storyBank = await this.storyBankEngine.load();

    // Try to find matching discovered posting
    let discovered: Record<string, any> | null = null;
    if (await fs.pathExists(discovPath)) {
      const files = await fs.readdir(discovPath);
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const raw = await fs.readJson(path.join(discovPath, f));
        if (raw.discoveredId === jobId) { discovered = raw; break; }
      }
    }

    const storyMap: StoryMap | null = (await fs.pathExists(storyMapPath))
      ? await fs.readJson(storyMapPath)
      : null;

    return { jobId, evalRun, profile, storyBank, storyMap, packet, discovered };
  }

  // ─── Generate likely questions ────────────────────────────────────────────

  async generateLikelyQuestions(
    ctx:     PrepContext,
    gateway: ModelGateway,
    opts:    { mock?: boolean } = {},
  ): Promise<LikelyQuestionsFile> {
    const role = ctx.evalRun?.blockA_roleSummary;

    if (opts.mock || !ctx.evalRun) {
      return mockQuestions(
        ctx.jobId,
        role?.title ?? 'Software Engineer',
        role?.company ?? 'Company',
      );
    }

    const storyTitles = ctx.storyBank.stories
      .filter(s => s.status !== 'archived')
      .slice(0, 6)
      .map(s => `- ${s.id}: ${s.title}`).join('\n');

    const prompt = `You are a senior interviewer preparing a candidate for an interview.

ROLE:
Title: ${role?.title}
Company: ${role?.company}
Level: ${role?.level}
Archetype: ${role?.archetype}
Domain: ${role?.domain}

CANDIDATE GAPS:
${(ctx.evalRun.blockB_cvMatch?.gaps ?? []).map((g: any) => `- ${g.gap ?? g}`).join('\n') || 'None identified'}

CANDIDATE STORY BANK (IDs and titles):
${storyTitles || 'No stories yet'}

Generate 8-12 realistic interview questions across categories: recruiter, hiring-manager, behavioral, technical, system-design, founder.

RULES:
- Only include founder category if role is at an early-stage or startup company.
- Map story IDs from the story bank to questions where relevant.
- riskLevel: "high" means the candidate is likely weak or the question is high-stakes.
- Do NOT invent candidate facts. Strategies must be achievable with provided evidence.
- Return ONLY valid JSON:

{
  "questions": [
    {
      "questionId": "xxxxxxxx",
      "category": "recruiter|hiring-manager|behavioral|technical|system-design|founder",
      "question": "...",
      "whyTheyAsk": "...",
      "answerStrategy": "...",
      "mappedStoryIds": [],
      "riskLevel": "low|medium|high"
    }
  ]
}`;

    const raw = await gateway.generateText(
      'You are a senior interviewer generating realistic interview questions. Return only valid JSON.',
      prompt,
    );

    let obj: any;
    try {
      obj = JSON.parse(raw);
      if (!Array.isArray(obj.questions)) throw new Error('questions must be an array');
    } catch (e: any) {
      throw new Error(`Interview questions: invalid model output — ${e.message}\n\nRaw:\n${raw.slice(0, 300)}`);
    }

    // Validate with Zod
    return LikelyQuestionsFileSchema.parse({
      jobId:       ctx.jobId,
      generatedAt: new Date().toISOString(),
      questions:   obj.questions,
    });
  }

  // ─── Generate prep pack (orchestrator) ───────────────────────────────────

  async generatePrepPack(
    jobId:   string,
    gateway: ModelGateway,
    opts:    { mock?: boolean } = {},
  ): Promise<{ outDir: string; files: string[]; missingOptional: string[] }> {
    const ctx = await this.loadContext(jobId);

    if (!ctx.evalRun) {
      throw new Error(`No evaluation artifact found for job ${jobId}.\nRun: npm run ct -- batch --mock`);
    }

    const missingOptional: string[] = [];
    if (!ctx.profile)     missingOptional.push('profile.json');
    if (!ctx.packet)      missingOptional.push('apply packet');
    if (!ctx.discovered)  missingOptional.push('discovered posting');

    const outDir = this.workspace.getPath(`jobs/interview/${jobId}`);
    await fs.ensureDir(outDir);

    const files: string[] = [];

    // 1. Story map — reuse if exists, generate if not
    if (!ctx.storyMap) {
      ctx.storyMap = await this.storyBankEngine.mapStoriesToJob(
        jobId, ctx.evalRun, gateway, opts
      );
    }
    files.push(`story-map.json`);

    // 2. Likely questions
    const questions = await this.generateLikelyQuestions(ctx, gateway, opts);
    const questionsPath = path.join(outDir, 'likely-questions.json');
    await fs.writeJson(questionsPath, questions, { spaces: 2 });
    files.push(`likely-questions.json`);

    // 3. Drill plan (deterministic, no LLM)
    const drillMd = generateDrillPlan(ctx);
    await fs.writeFile(path.join(outDir, 'drill-plan.md'), drillMd, 'utf8');
    files.push(`drill-plan.md`);

    // 4. Company & role brief (deterministic)
    const briefMd = generateCompanyRoleBrief(ctx);
    await fs.writeFile(path.join(outDir, 'company-role-brief.md'), briefMd, 'utf8');
    files.push(`company-role-brief.md`);

    // 5. Candidate risk notes (deterministic)
    const riskMd = generateCandidateRiskNotes(ctx);
    await fs.writeFile(path.join(outDir, 'candidate-risk-notes.md'), riskMd, 'utf8');
    files.push(`candidate-risk-notes.md`);

    // 6. Interview pack (LLM or mock)
    let packMd: string;
    if (opts.mock || !ctx.evalRun) {
      packMd = mockInterviewPackMd(ctx);
    } else {
      // For live: generate with model
      packMd = mockInterviewPackMd(ctx); // Fallback to deterministic for now — keeps it stable
    }
    await fs.writeFile(path.join(outDir, 'interview-pack.md'), packMd, 'utf8');
    files.push(`interview-pack.md`);

    return { outDir, files, missingOptional };
  }

  // ─── Load likely questions ─────────────────────────────────────────────────

  async loadQuestions(jobId: string): Promise<LikelyQuestionsFile | null> {
    const p = this.workspace.getPath(`jobs/interview/${jobId}/likely-questions.json`);
    if (!(await fs.pathExists(p))) return null;
    return LikelyQuestionsFileSchema.parse(await fs.readJson(p));
  }

  // ─── Load checklist from interview-pack.md ────────────────────────────────

  async loadChecklist(jobId: string): Promise<string[]> {
    const p = this.workspace.getPath(`jobs/interview/${jobId}/interview-pack.md`);
    if (!(await fs.pathExists(p))) return [];
    const content = await fs.readFile(p, 'utf8');
    // Extract markdown checklist items
    return content
      .split('\n')
      .filter(l => l.match(/^- \[[ x]\]/))
      .map(l => l.replace(/^- \[[ x]\] /, '').trim());
  }
}
