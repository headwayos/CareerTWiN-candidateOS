import * as path from 'path';
import * as fs from 'fs-extra';
import { WorkspaceManager } from './workspace.js';
import { ModelGateway } from './gateway.js';
import { TrackerEngine } from './tracker.js';
import { EvaluationRunSchema } from '@careertwin/schemas';
import { 
  NegotiationPacket, 
  NegotiationPacketSchema, 
  CompensationBoundaries, 
  NegotiationPlanFileSchema,
  NegotiationPlanFile
} from '@careertwin/schemas';
import { z } from 'zod';

export interface NegotiationContext {
  jobId: string;
  evaluation?: any;
  trackerEntry?: any;
  profile?: any;
  applyPacket?: any;
  interviewPack?: any;
}

export class NegotiationEngine {
  constructor(
    private workspace: WorkspaceManager,
    private gateway: ModelGateway,
    private tracker: TrackerEngine
  ) {}

  async loadContext(jobId: string): Promise<NegotiationContext> {
    const ctx: NegotiationContext = { jobId };

    const evalPath = this.workspace.getPath(`jobs/evaluations/${jobId}.json`);
    if (await fs.pathExists(evalPath)) {
      try {
        const raw = await fs.readJson(evalPath);
        ctx.evaluation = EvaluationRunSchema.parse(raw);
      } catch (e) {
        console.warn(`[Negotiation] Failed to parse evaluation for ${jobId}`);
      }
    }

    try {
      const entries = await this.tracker.list();
      ctx.trackerEntry = entries.find(e => e.jobId === jobId);
    } catch (e) {}

    const profilePath = this.workspace.getPath('profile/candidate.json');
    if (await fs.pathExists(profilePath)) {
      try {
        ctx.profile = await fs.readJson(profilePath);
      } catch (e) {}
    }

    const applyPath = this.workspace.getPath(`jobs/applications/${jobId}/packet.json`);
    if (await fs.pathExists(applyPath)) {
      try {
        ctx.applyPacket = await fs.readJson(applyPath);
      } catch (e) {}
    }

    const mapPath = this.workspace.getPath(`jobs/interview/${jobId}/story-map.json`);
    if (await fs.pathExists(mapPath)) {
      try {
        ctx.interviewPack = await fs.readJson(mapPath);
      } catch (e) {}
    }

    return ctx;
  }

  async generateNegotiationPack(jobId: string, useMock: boolean = false): Promise<NegotiationPacket> {
    const ctx = await this.loadContext(jobId);
    if (!ctx.evaluation) {
      throw new Error(`Cannot generate negotiation pack: No evaluation found for job ${jobId}`);
    }

    const outDir = this.workspace.getPath(`jobs/negotiation/${jobId}`);
    await fs.ensureDir(outDir);

    const plan = await this.generateNegotiationPlan(ctx, useMock);
    const scripts = await this.generateScripts(ctx, useMock);
    const tradeoffMatrix = this.generateTradeoffMatrix(ctx);
    const checklist = this.generateChecklist(ctx);

    const planPath = path.join(outDir, 'negotiation-plan.md');
    await fs.writeFile(planPath, this.formatPlanMarkdown(plan));

    const recruiterScriptPath = path.join(outDir, 'recruiter-script.md');
    await fs.writeFile(recruiterScriptPath, scripts.recruiter);

    const founderScriptPath = path.join(outDir, 'founder-script.md');
    await fs.writeFile(founderScriptPath, scripts.founder);

    const downlevelPath = path.join(outDir, 'downlevel-response.md');
    await fs.writeFile(downlevelPath, scripts.downlevel);

    const boundariesPath = path.join(outDir, 'compensation-boundaries.json');
    await fs.writeFile(boundariesPath, JSON.stringify(plan.compensationSummary, null, 2));

    const tradeoffPath = path.join(outDir, 'tradeoff-matrix.md');
    await fs.writeFile(tradeoffPath, tradeoffMatrix);

    const checklistPath = path.join(outDir, 'negotiation-checklist.md');
    await fs.writeFile(checklistPath, checklist);

    const packet: NegotiationPacket = {
      jobId,
      company: ctx.evaluation.blockA_roleSummary.company,
      title: ctx.evaluation.blockA_roleSummary.title,
      createdAt: new Date().toISOString(),
      status: 'draft',
      manualReviewRequired: true,
      evaluationBand: ctx.evaluation.recommendationBand,
      evaluationScore: ctx.evaluation.scores?.overall,
      trackerEntryId: ctx.trackerEntry?.id,
      applyPacketPath: ctx.applyPacket ? `jobs/applications/${jobId}/packet.json` : undefined,
      interviewPackPath: ctx.interviewPack ? `jobs/interview/${jobId}/story-map.json` : undefined,
      evaluationArtifactPath: `jobs/evaluations/${jobId}.json`,
      compensation: plan.compensationSummary,
      leverage: plan.leverage,
      scripts: {
        recruiterScriptPath: `jobs/negotiation/${jobId}/recruiter-script.md`,
        founderScriptPath: `jobs/negotiation/${jobId}/founder-script.md`,
        downlevelResponsePath: `jobs/negotiation/${jobId}/downlevel-response.md`
      }
    };

    const packetPath = path.join(outDir, 'negotiation-packet.json');
    await fs.writeFile(packetPath, JSON.stringify(packet, null, 2));

    return packet;
  }

  private async generateNegotiationPlan(ctx: NegotiationContext, useMock: boolean): Promise<NegotiationPlanFile> {
    if (useMock) {
      return {
        roleSnapshot: {
          title: ctx.evaluation?.blockA_roleSummary?.title ?? 'Role',
          company: ctx.evaluation?.blockA_roleSummary?.company ?? 'Company'
        },
        compensationSummary: {
          targetBase: "TBD",
          minimumBase: "TBD",
          expectedRange: "TBD",
          marketRange: "TBD",
          currency: "USD",
          confidence: "low",
          sourceNotes: ["Demo-only values. Replace before real negotiation."],
          manualReviewRequired: true
        },
        leverage: {
          strengths: ["Strong technical match", "Domain expertise"],
          risks: ["Salary at top of range"],
          proofPoints: ["Open source contributions", "Previous measurable impact"],
          alternatives: ["Additional equity", "Remote flexibility", "Accelerated review cycle"]
        },
        risks: ["Salary at top of band", "No competing offers currently"],
        strategy: {
          openingPosition: "Enthusiastic but firm on target range",
          safeAsk: "$175k",
          fallbackAsk: "$165k + extra equity",
          walkAwayLine: "$150k",
          nonCashLevers: ["Sign-on bonus", "Learning budget", "Remote flexibility"]
        }
      };
    }

    const prompt = `You are an expert career and compensation negotiation coach.
Generate a negotiation plan for the candidate based on the provided evaluation.

HONESTY GUARDRAILS:
1. DO NOT fabricate competing offers.
2. DO NOT fabricate market numbers. If 'blockD_compensationDemand' is missing or weak, output confidence "low" and generic market placeholders.
3. DO NOT invent leverage or interview outcomes.
4. DO NOT inflate seniority.

Extract and synthesise:
- Compensation Summary (target, minimum, expectedRange, marketRange, currency, confidence)
- Leverage (strengths from blockB, risks from blockB)
- Strategy (openingPosition, safeAsk, fallbackAsk, walkAwayLine, nonCashLevers)

Return ONLY valid JSON matching the exact schema.`;

    const userContent = JSON.stringify({
      role: ctx.evaluation.blockA_roleSummary,
      match: ctx.evaluation.blockB_cvMatch,
      level: ctx.evaluation.blockC_levelStrategy,
      compensation: ctx.evaluation.blockD_compensationDemand || null
    }, null, 2);

    const raw = await this.gateway.generateText(prompt, userContent);

    return JSON.parse(raw);
  }

  private async generateScripts(ctx: NegotiationContext, useMock: boolean): Promise<{ recruiter: string, founder: string, downlevel: string }> {
    if (useMock) {
      return {
        recruiter: "Hi [Recruiter Name], I've reviewed the offer. I'm very excited about the role. Based on my research and the value I'll bring to the team, I was hoping for a base salary closer to $180k. Is there any flexibility there?",
        founder: "Hey [Founder Name], I really believe in the mission. I'm less concerned with the exact cash split and more focused on having significant skin in the game through equity. Can we discuss a higher equity percentage for a slightly lower base?",
        downlevel: "I understand the decision to bring me in at this level. However, given my experience at [Previous Company], I'd like to ensure there is a clear path and timeline for me to reach the Senior level within 6-12 months."
      };
    }

    const prompt = `You are an expert tech negotiation coach. Generate three distinct markdown scripts for the candidate:
1. recruiter: Script for talking to a recruiter. Include standard comp response, "flexible but aligned", and "need more info".
2. founder: Script for talking to a startup founder. Focus on mission alignment, equity, and scope over pure cash.
3. downlevel: Script for responding to a title/level downgrade (e.g. from Senior to Mid). Include scope clarification and growth path.

HONESTY GUARDRAILS:
1. No fake competing offers.
2. No fake leverage.

Output format MUST be a JSON object with keys "recruiter", "founder", and "downlevel" containing the markdown scripts as strings.`;

    const userContent = JSON.stringify({
      role: ctx.evaluation.blockA_roleSummary,
      level: ctx.evaluation.blockC_levelStrategy
    }, null, 2);

    const schema = z.object({
      recruiter: z.string(),
      founder: z.string(),
      downlevel: z.string()
    });

    const raw = await this.gateway.generateText(prompt, userContent);

    return JSON.parse(raw);
  }

  private generateTradeoffMatrix(ctx: NegotiationContext): string {
    const company = ctx.evaluation.blockA_roleSummary.company;
    const remote = ctx.evaluation.blockA_roleSummary.workMode;
    const archetype = ctx.evaluation.blockA_roleSummary.archetype;
    
    return `# Tradeoff Matrix: ${company}

| Lever | Flexibility | Importance | Strategy |
| --- | --- | --- | --- |
| **Base Salary** | Usually Low-Med | High | Push to target, but be willing to trade for equity if startup. |
| **Equity / Stock** | Usually Med-High | Varies | High upside if early stage. Treat as bonus if public. |
| **Sign-on Bonus** | High | Low | Use to bridge gap if base salary is capped. |
| **Remote / Location** | ${remote === 'remote' ? 'High' : 'Low'} | High | Protect flexibility if it matters. |
| **Title / Scope** | Med | Med | ${archetype} typically requires clear scope definition. |
| **Learning / Upside** | High | High | Consider long-term career capital over immediate cash. |

**Decision Framework:**
1. What is your absolute walk-away point for cash?
2. Are you willing to take a 10% base cut for 20% more equity?
3. Is remote work a dealbreaker?
`;
  }

  private generateChecklist(ctx: NegotiationContext): string {
    return `# Pre-Negotiation Checklist

- [ ] I know my absolute walk-away number (Minimum Acceptable Base).
- [ ] I have reviewed the \`recruiter-script.md\` and practiced saying it out loud.
- [ ] I understand the tradeoffs between equity and base salary for this specific company stage.
- [ ] I have reviewed the \`downlevel-response.md\` in case they offer a lower title.
- [ ] I will not accept an offer on the first call. I will express excitement and ask for 24-48 hours to review the details.
`;
  }

  private formatPlanMarkdown(plan: NegotiationPlanFile): string {
    return `# Negotiation Strategy Plan

> **WARNING**: This plan is generated based on local evaluation data and market estimates. All strategies and numbers MUST be manually reviewed and adapted to your specific situation. Never use fabricated leverage or fake competing offers.

## Compensation Boundaries (Confidence: ${plan.compensationSummary.confidence.toUpperCase()})
- **Target Ask:** ${plan.compensationSummary.targetBase || 'TBD'}
- **Minimum Acceptable (Walk-away):** ${plan.compensationSummary.minimumBase || 'TBD'}
- **Expected Range:** ${plan.compensationSummary.expectedRange || 'TBD'}
- **Market Range:** ${plan.compensationSummary.marketRange || 'TBD'}

## Leverage & Risks
**Strengths (Use these):**
${plan.leverage.strengths.map(s => `- ${s}`).join('\n')}

**Risks (Mitigate these):**
${plan.leverage.risks.map(r => `- ${r}`).join('\n')}

## Strategy
- **Opening Position:** ${plan.strategy.openingPosition}
- **Safe Ask:** ${plan.strategy.safeAsk}
- **Fallback Ask:** ${plan.strategy.fallbackAsk}
- **Walk-away Line:** ${plan.strategy.walkAwayLine || 'N/A'}
- **Non-Cash Levers:** ${plan.strategy.nonCashLevers.join(', ')}
`;
  }
}
