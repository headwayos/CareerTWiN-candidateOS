import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import {
  StoryBankSchema,
  StorySchema,
  StoryMapSchema,
  computeStoryFingerprint,
  confidenceLevelToNumeric,
  type StoryBank,
  type Story,
  type StoryMap,
  type StoryMapping,
} from '@careertwin/schemas';
import type { EvaluationRun, InterviewStory } from '@careertwin/schemas';
import { WorkspaceManager } from './workspace';
import type { ModelGateway } from './gateway';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockPolishedFields(story: Story): Partial<Story> {
  return {
    reflection:      `Reflecting on this experience, the key learning was knowing when to prioritise depth over breadth. The tradeoff between speed and quality was deliberate and paid off long-term.`,
    shortVersion:    `${story.situation.slice(0, 80)}... I led the effort, and the outcome was ${story.result.slice(0, 60)}.`,
    longVersion:     `${story.situation}\n\nMy task was to ${story.task}.\n\nI approached this by ${story.action}.\n\nAs a result, ${story.result}`,
    talkingPoints:   [`Focus on the outcome metric`, `Highlight cross-functional coordination`, `Mention the tradeoffs considered`],
    pitfallsToAvoid: [`Do not overstate the team size`, `Avoid jargon that needs explaining`, `Keep it under 2 minutes for screen calls`],
    competencies:    story.tags.length > 0 ? story.tags : ['Leadership', 'Technical Execution'],
    status:          'polished' as const,
  };
}

function mockStoryMap(jobId: string, stories: Story[], requirements: string[]): StoryMap {
  const mapped: StoryMapping[] = requirements.slice(0, Math.min(requirements.length, stories.length)).map((req, i) => ({
    requirement:          req,
    storyId:              stories[i]?.id ?? 'unknown',
    storyTitle:           stories[i]?.title ?? 'Untitled',
    fitReason:            `This story demonstrates ${req.toLowerCase()} through direct hands-on experience.`,
    confidence:           0.8,
    risk:                 'Ensure timing clarity when telling this story.',
    suggestedOpeningLine: `"I faced a similar situation at [Company] where..."`,
    backupStoryIds:       stories.slice(i + 1, i + 2).map(s => s.id),
  }));

  const coveredReqs = new Set(mapped.map(m => m.requirement));
  const gaps = requirements
    .filter(r => !coveredReqs.has(r))
    .map(r => ({
      requirement: r,
      reason:      'No strong story evidence available for this requirement.',
      mitigation:  'Prepare a brief framing of adjacent experience and your plan to develop this skill.',
    }));

  return StoryMapSchema.parse({
    jobId,
    generatedAt: new Date().toISOString(),
    mappedStories: mapped,
    gaps,
  });
}

// ─── StoryBankEngine ──────────────────────────────────────────────────────────

export class StoryBankEngine {
  private bankPath: string;

  constructor(private workspace: WorkspaceManager) {
    this.bankPath = workspace.getPath('profile/story-bank.json');
  }

  // ─── Core IO ──────────────────────────────────────────────────────────────

  async load(): Promise<StoryBank> {
    if (!(await fs.pathExists(this.bankPath))) {
      const empty: StoryBank = { schemaVersion: 'v2.1', stories: [] };
      await this.save(empty);
      return empty;
    }
    const raw = await fs.readJson(this.bankPath);

    // Migrate legacy v1.0 stories: convert confidenceLevel → confidence
    if (Array.isArray(raw.stories)) {
      for (const s of raw.stories) {
        if (s.confidenceLevel && s.confidence == null) {
          s.confidence = confidenceLevelToNumeric(s.confidenceLevel);
        }
        // Ensure defaults for new fields
        s.talkingPoints    = s.talkingPoints    ?? [];
        s.pitfallsToAvoid  = s.pitfallsToAvoid  ?? [];
        s.competencies     = s.competencies     ?? [];
        s.senioritySignals = s.senioritySignals ?? [];
        s.domains          = s.domains          ?? [];
        s.sourceEvaluationIds = s.sourceEvaluationIds ?? [];
        s.proofNotes       = s.proofNotes       ?? [];
        s.status           = s.status           ?? 'draft';
        s.usageCount       = s.usageCount       ?? 0;
        s.evidenceSource   = s.evidenceSource   ?? 'generated';
        s.confidence       = s.confidence       ?? 0.7;
        const now          = new Date().toISOString();
        s.createdAt        = s.createdAt        ?? now;
        s.updatedAt        = s.updatedAt        ?? now;
        s.lastUsedAt       = s.lastUsedAt       ?? now;
      }
    }

    return StoryBankSchema.parse(raw);
  }

  async save(bank: StoryBank): Promise<void> {
    await fs.ensureDir(this.workspace.getPath('profile'));
    bank.updatedAt = new Date().toISOString();
    await fs.writeJson(this.bankPath, bank, { spaces: 2 });
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async list(filters?: { tag?: string; status?: string; jobId?: string }): Promise<Story[]> {
    const bank = await this.load();
    let stories = bank.stories;
    if (filters?.tag)    stories = stories.filter(s => s.tags.some(t => t.toLowerCase().includes(filters.tag!.toLowerCase())));
    if (filters?.status) stories = stories.filter(s => s.status === filters.status);
    if (filters?.jobId)  stories = stories.filter(s => s.jobIds.includes(filters.jobId!));
    return stories;
  }

  async findById(id: string): Promise<Story | null> {
    const bank = await this.load();
    return bank.stories.find(s => s.id === id || s.id.startsWith(id)) ?? null;
  }

  async findByTag(tag: string): Promise<Story[]> {
    return this.list({ tag });
  }

  async findByJob(jobId: string): Promise<Story[]> {
    return this.list({ jobId });
  }

  // ─── Archive ──────────────────────────────────────────────────────────────

  async archiveStory(id: string): Promise<boolean> {
    const bank = await this.load();
    const story = bank.stories.find(s => s.id === id || s.id.startsWith(id));
    if (!story) return false;
    story.status    = 'archived';
    story.updatedAt = new Date().toISOString();
    await this.save(bank);
    return true;
  }

  // ─── Dedupe ───────────────────────────────────────────────────────────────

  async dedupeStories(): Promise<{ removed: number; merged: number }> {
    const bank = await this.load();
    const seen = new Map<string, Story>();
    let removed = 0;
    let merged  = 0;

    for (const s of bank.stories) {
      if (seen.has(s.id)) {
        const existing = seen.get(s.id)!;
        // Merge jobIds
        for (const jid of s.jobIds) {
          if (!existing.jobIds.includes(jid)) existing.jobIds.push(jid);
        }
        // Merge sourceEvaluationIds
        for (const eid of s.sourceEvaluationIds || []) {
          if (!existing.sourceEvaluationIds) existing.sourceEvaluationIds = [];
          if (!existing.sourceEvaluationIds.includes(eid)) existing.sourceEvaluationIds.push(eid);
        }
        // Keep the polished version
        if (s.status === 'polished' && existing.status !== 'polished') {
          seen.set(s.id, { 
            ...s, 
            jobIds: existing.jobIds, 
            sourceEvaluationIds: existing.sourceEvaluationIds 
          });
        }
        removed++;
        merged++;
      } else {
        seen.set(s.id, s);
      }
    }

    bank.stories = Array.from(seen.values());
    await this.save(bank);
    return { removed, merged };
  }

  // ─── Polish ───────────────────────────────────────────────────────────────

  async polishStory(
    id: string,
    gateway: ModelGateway,
    opts: { mock?: boolean } = {},
  ): Promise<Story | null> {
    const bank  = await this.load();
    const story = bank.stories.find(s => s.id === id || s.id.startsWith(id));
    if (!story) return null;

    const now = new Date().toISOString();

    if (opts.mock) {
      Object.assign(story, mockPolishedFields(story));
      story.updatedAt = now;
      await this.save(bank);
      return story;
    }

    const prompt = `You are a professional career coach helping a candidate polish an interview story.

CANDIDATE STORY (STAR):
Title: ${story.title}
Situation: ${story.situation}
Task: ${story.task}
Action: ${story.action}
Result: ${story.result}
Tags: ${story.tags.join(', ')}

IMPORTANT RULES:
- Do NOT invent facts. Only use the information provided above.
- Do NOT exaggerate metrics or team sizes.
- Improve clarity, conciseness, and impact.
- Add a Reflection (what you learned, tradeoffs made, judgment shown).
- Create a short version (≤60 words for phone screens).
- Create a long version (≤200 words for panel interviews).
- Provide 3 talking points.
- Provide 2-3 pitfalls to avoid when telling this story.
- Identify 2-3 competencies this story demonstrates.

Return ONLY valid JSON matching this structure (no markdown, no commentary):
{
  "reflection": "...",
  "shortVersion": "...",
  "longVersion": "...",
  "talkingPoints": ["...", "..."],
  "pitfallsToAvoid": ["...", "..."],
  "competencies": ["...", "..."]
}`;

    const raw = await gateway.generateText(
      'You are a professional career coach helping a candidate polish an interview story. Follow all rules strictly.',
      prompt,
    );

    // Zod-validate the returned JSON
    const polishedSchema = import('@careertwin/schemas').then(() =>
      require('zod').z.object({
        reflection:      require('zod').z.string(),
        shortVersion:    require('zod').z.string(),
        longVersion:     require('zod').z.string(),
        talkingPoints:   require('zod').z.array(require('zod').z.string()),
        pitfallsToAvoid: require('zod').z.array(require('zod').z.string()),
        competencies:    require('zod').z.array(require('zod').z.string()),
      })
    );

    let parsed: ReturnType<typeof mockPolishedFields>;
    try {
      const obj = JSON.parse(raw);
      // Light validation
      if (!obj.reflection || !obj.shortVersion || !obj.longVersion) {
        throw new Error('Model output missing required fields (reflection/shortVersion/longVersion)');
      }
      parsed = obj;
    } catch (e: any) {
      throw new Error(`Polish: invalid model output — ${e.message}\n\nRaw output:\n${raw.slice(0, 300)}`);
    }

    Object.assign(story, parsed, { status: 'polished', updatedAt: now });
    await this.save(bank);
    return story;
  }

  // ─── Map stories to job ───────────────────────────────────────────────────

  async mapStoriesToJob(
    jobId:   string,
    evalRun: EvaluationRun,
    gateway: ModelGateway,
    opts:    { mock?: boolean } = {},
  ): Promise<StoryMap> {
    const bank    = await this.load();
    const stories = bank.stories.filter(s => s.status !== 'archived');

    // Extract requirements from Block B
    const requirements: string[] = (evalRun.blockB_cvMatch?.requirements ?? [])
      .map((r: any) => r.requirement ?? r.skill ?? r)
      .filter(Boolean)
      .slice(0, 8);

    if (requirements.length === 0) {
      requirements.push(
        evalRun.blockA_roleSummary?.archetype ?? 'Technical Execution',
        'Problem Solving',
        'Cross-functional Collaboration',
      );
    }

    if (opts.mock || stories.length === 0) {
      const storyMap = mockStoryMap(jobId, stories, requirements);
      await this.writeStoryMap(jobId, storyMap);
      return storyMap;
    }

    const storySummaries = stories.slice(0, 10).map(s =>
      `- ID: ${s.id}\n  Title: ${s.title}\n  Tags: ${s.tags.join(', ')}\n  Result: ${s.result.slice(0, 80)}`
    ).join('\n');

    const prompt = `You are a senior technical interviewer mapping a candidate's stories to job requirements.

JOB REQUIREMENTS:
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

CANDIDATE STORIES:
${storySummaries}

ROLE CONTEXT:
Title: ${evalRun.blockA_roleSummary?.title}
Company: ${evalRun.blockA_roleSummary?.company}
Archetype: ${evalRun.blockA_roleSummary?.archetype}

RULES:
- Map the best story to each requirement.
- Confidence 0-1 (1 = perfect evidence, 0 = no evidence).
- For requirements with no good story match, add them to gaps[].
- Return ONLY valid JSON, no commentary:

{
  "mappedStories": [
    {
      "requirement": "...",
      "storyId": "...",
      "storyTitle": "...",
      "fitReason": "...",
      "confidence": 0.0,
      "risk": "...",
      "suggestedOpeningLine": "...",
      "backupStoryIds": []
    }
  ],
  "gaps": [
    { "requirement": "...", "reason": "...", "mitigation": "..." }
  ]
}`;

    const raw = await gateway.generateText(
      'You are a senior technical interviewer mapping a candidate STAR stories to job requirements. Return only valid JSON.',
      prompt,
    );

    let obj: any;
    try {
      obj = JSON.parse(raw);
      if (!Array.isArray(obj.mappedStories)) throw new Error('mappedStories must be an array');
    } catch (e: any) {
      throw new Error(`Map: invalid model output — ${e.message}\n\nRaw:\n${raw.slice(0, 300)}`);
    }

    const storyMap = StoryMapSchema.parse({
      jobId,
      generatedAt: new Date().toISOString(),
      mappedStories: obj.mappedStories,
      gaps:          obj.gaps ?? [],
    });

    await this.writeStoryMap(jobId, storyMap);

    // Update usage counts on used stories
    const bank2 = await this.load();
    const usedIds = new Set(storyMap.mappedStories.map(m => m.storyId));
    for (const s of bank2.stories) {
      if (usedIds.has(s.id)) {
        s.usageCount  = (s.usageCount ?? 0) + 1;
        s.lastUsedAt  = new Date().toISOString();
        if (!s.jobIds.includes(jobId)) s.jobIds.push(jobId);
      }
    }
    await this.save(bank2);

    return storyMap;
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async exportStoriesForJob(jobId: string, evalRun: EvaluationRun): Promise<string> {
    const mapPath = this.workspace.getPath(`jobs/interview/${jobId}/story-map.json`);
    if (!(await fs.pathExists(mapPath))) {
      throw new Error(`No story-map.json for job ${jobId}. Run: npm run ct -- stories map ${jobId}`);
    }
    const storyMap: StoryMap = await fs.readJson(mapPath);
    const bank = await this.load();
    const storyById = new Map(bank.stories.map(s => [s.id, s]));

    const role    = evalRun.blockA_roleSummary;
    const lines: string[] = [
      `# Story Export — ${role?.title ?? 'Role'} at ${role?.company ?? 'Company'}`,
      ``,
      `**Generated:** ${new Date().toLocaleDateString()}  `,
      `**Job ID:** \`${jobId}\``,
      ``,
      `---`,
      ``,
    ];

    for (const mapping of storyMap.mappedStories) {
      const story = storyById.get(mapping.storyId);
      lines.push(`## ${mapping.storyTitle}`);
      lines.push(``);
      lines.push(`**Requirement:** ${mapping.requirement}  `);
      lines.push(`**Fit reason:** ${mapping.fitReason}  `);
      lines.push(`**Confidence:** ${Math.round(mapping.confidence * 100)}%`);
      if (mapping.suggestedOpeningLine) lines.push(`**Opening:** ${mapping.suggestedOpeningLine}`);
      lines.push(``);

      if (story) {
        if (story.shortVersion) {
          lines.push(`### Short Version (Phone Screen)`);
          lines.push(story.shortVersion);
          lines.push(``);
        }
        if (story.longVersion) {
          lines.push(`### Long Version (Panel)`);
          lines.push(story.longVersion);
          lines.push(``);
        }
        lines.push(`### STAR+R Breakdown`);
        lines.push(`**Situation:** ${story.situation}`);
        lines.push(`**Task:** ${story.task}`);
        lines.push(`**Action:** ${story.action}`);
        lines.push(`**Result:** ${story.result}`);
        if (story.reflection) lines.push(`**Reflection:** ${story.reflection}`);
        lines.push(``);
        if (story.talkingPoints?.length) {
          lines.push(`### How to Tell It`);
          story.talkingPoints.forEach(tp => lines.push(`- ${tp}`));
          lines.push(``);
        }
        if (story.pitfallsToAvoid?.length) {
          lines.push(`### Pitfalls to Avoid`);
          story.pitfallsToAvoid.forEach(p => lines.push(`- ${p}`));
          lines.push(``);
        }
      }

      if (mapping.risk) {
        lines.push(`> ⚠️ **Risk:** ${mapping.risk}`);
        lines.push(``);
      }
      lines.push(`---`);
      lines.push(``);
    }

    if (storyMap.gaps.length > 0) {
      lines.push(`## Coverage Gaps`);
      lines.push(``);
      for (const gap of storyMap.gaps) {
        lines.push(`**Requirement:** ${gap.requirement}  `);
        lines.push(`**Reason:** ${gap.reason}  `);
        lines.push(`**Mitigation:** ${gap.mitigation}`);
        lines.push(``);
      }
    }

    const md = lines.join('\n');
    const exportPath = this.workspace.getPath(`jobs/interview/${jobId}/story-export.md`);
    await fs.ensureDir(path.dirname(exportPath));
    await fs.writeFile(exportPath, md, 'utf8');
    return exportPath;
  }

  // ─── Seed from evaluation (unchanged) ────────────────────────────────────

  async seedFromEvaluation(run: EvaluationRun): Promise<{ added: number; skipped: number }> {
    const stories = run.blockF_interviewPrep?.stories ?? [];
    if (stories.length === 0) return { added: 0, skipped: 0 };

    const bank = await this.load();
    let added   = 0;
    let skipped = 0;
    const now   = new Date().toISOString();

    for (const s of stories) {
      const fingerprint = computeStoryFingerprint(s.title, s.situation);
      const existing    = bank.stories.find(b => b.id === fingerprint);

      if (existing) {
        existing.lastUsedAt = now;
        if (!existing.jobIds.includes(run.jobId)) existing.jobIds.push(run.jobId);
        if (!existing.sourceEvaluationIds.includes(run.jobId)) existing.sourceEvaluationIds.push(run.jobId);
        skipped++;
      } else {
        const conf = s.confidenceLevel ? confidenceLevelToNumeric(s.confidenceLevel) : 0.7;
        bank.stories.push(StorySchema.parse({
          id:              fingerprint,
          title:           s.title,
          situation:       s.situation,
          task:            s.task,
          action:          s.action,
          result:          s.result,
          tags:            s.tags ?? [],
          jobIds:          [run.jobId],
          sourceEvaluationIds: [run.jobId],
          createdAt:       now,
          lastUsedAt:      now,
          confidence:      conf,
          confidenceLevel: s.confidenceLevel,
          evidenceSource:  'evaluation',
        }));
        added++;
      }
    }

    await this.save(bank);
    return { added, skipped };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async writeStoryMap(jobId: string, storyMap: StoryMap): Promise<void> {
    const outPath = this.workspace.getPath(`jobs/interview/${jobId}/story-map.json`);
    await fs.ensureDir(path.dirname(outPath));
    await fs.writeJson(outPath, storyMap, { spaces: 2 });
  }
}
