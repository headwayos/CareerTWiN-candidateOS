import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {
  WorkspaceManager,
  TrackerEngine,
  StoryBankEngine,
} from '@careertwin/engine';

let boxen: any;
try { boxen = require('boxen'); } catch { boxen = null; }

// ─── Brand Colors ──────────────────────────────────────────────────────────────
const brand = {
  primary:  chalk.hex('#0EA5E9'),
  accent:   chalk.hex('#06B6D4'),
  dim:      chalk.gray,
  success:  chalk.hex('#22C55E'),
  warn:     chalk.hex('#F59E0B'),
  error:    chalk.hex('#EF4444'),
  bold:     chalk.bold,
  header:   chalk.hex('#0EA5E9').bold,
  muted:    chalk.hex('#6B7280'),
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function bandIcon(band: string | undefined): string {
  switch (band) {
    case 'top-target':        return brand.success('★');
    case 'strong-apply':      return brand.primary('●');
    case 'conditional-apply': return brand.warn('◐');
    case 'no-apply':          return brand.error('○');
    default:                  return brand.muted('–');
  }
}

function bandLabel(band: string | undefined): string {
  const b = band ?? 'unknown';
  switch (band) {
    case 'top-target':        return brand.success(b.padEnd(18));
    case 'strong-apply':      return brand.primary(b.padEnd(18));
    case 'conditional-apply': return brand.warn(b.padEnd(18));
    case 'no-apply':          return brand.error(b.padEnd(18));
    default:                  return brand.muted(b.padEnd(18));
  }
}

function renderPanel(title: string, content: string): string {
  if (boxen) {
    return boxen(content, {
      padding:      { top: 0, bottom: 0, left: 1, right: 1 },
      margin:       { top: 0, bottom: 0, left: 2, right: 0 },
      borderStyle:  'round',
      borderColor:  'cyan',
      title:        brand.accent(title),
      titleAlignment: 'left',
    });
  }
  const border  = brand.accent('─'.repeat(68));
  return `\n  ${brand.header(title)}\n  ${border}\n${content}\n  ${border}\n`;
}

// ─── Header ────────────────────────────────────────────────────────────────────

function renderHeader(): string {
  const now  = new Date().toLocaleTimeString();
  const line = brand.accent('─'.repeat(70));
  return [
    '',
    `  ${brand.header('CareerTwin OS')}  ${brand.muted('·')}  ${brand.dim('ct@0.2.0')}  ${brand.muted('·')}  ${brand.dim(now)}`,
    `  ${line}`,
  ].join('\n');
}

// ─── Panel A: Pipeline Summary ─────────────────────────────────────────────────

async function panelPipeline(
  tracker: TrackerEngine,
  workspace: WorkspaceManager,
): Promise<string> {
  const items   = await tracker.list();
  const summary: Record<string, number> = await tracker.summary();

  if (items.length === 0) {
    return renderPanel(
      'A · Pipeline',
      brand.dim('  No applications tracked yet.\n  Run: npm run ct -- evaluate <jd>'),
    );
  }

  const statusOrder = ['offer', 'interview', 'applied', 'evaluated', 'rejected'];
  const statusIcon  = (s: string) =>
    s === 'offer'      ? brand.success('●') :
    s === 'interview'  ? brand.primary('●') :
    s === 'applied'    ? brand.accent('●')  :
    s === 'evaluated'  ? brand.warn('●')    :
    brand.muted('●');

  const lines: string[] = [];
  for (const status of statusOrder) {
    const count = summary[status] ?? 0;
    if (count === 0) continue;
    lines.push(`  ${statusIcon(status)}  ${status.padEnd(12)} ${brand.bold(String(count))}`);
  }
  lines.push('');
  lines.push(`  ${brand.muted('Total:')} ${brand.bold(String(items.length))}`);

  // Band distribution — read the latest evaluation per tracker entry
  const evalDir = workspace.getPath('jobs/evaluations');
  if (await fs.pathExists(evalDir)) {
    const bandCounts: Record<string, number> = {};
    const jobIds = [...new Set(items.map((i: any) => i.jobId))];
    for (const jobId of jobIds) {
      const evalFile = path.join(evalDir, `${jobId}.json`);
      if (await fs.pathExists(evalFile)) {
        try {
          const ev = await fs.readJson(evalFile);
          const band = ev.recommendationBand ?? 'unknown';
          bandCounts[band] = (bandCounts[band] ?? 0) + 1;
        } catch { /* skip unreadable */ }
      }
    }
    if (Object.keys(bandCounts).length > 0) {
      lines.push('');
      lines.push(`  ${brand.dim('Bands:')}`);
      for (const [band, count] of Object.entries(bandCounts)) {
        lines.push(`    ${bandIcon(band)}  ${band.padEnd(20)} ${brand.bold(String(count))}`);
      }
    }
  }

  return renderPanel('A · Pipeline', lines.join('\n'));
}

// ─── Panel B: Recent Evaluations ──────────────────────────────────────────────

async function panelEvaluations(workspace: WorkspaceManager): Promise<string> {
  const evalDir = workspace.getPath('jobs/evaluations');
  if (!(await fs.pathExists(evalDir))) {
    return renderPanel('B · Recent Evaluations', brand.dim('  No evaluations yet.'));
  }

  const files     = await fs.readdir(evalDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    return renderPanel('B · Recent Evaluations', brand.dim('  No evaluations yet.'));
  }

  // Sort by mtime descending, skip legacy placeholder files
  const withMtime = await Promise.all(
    jsonFiles.map(async f => {
      const stat = await fs.stat(path.join(evalDir, f));
      return { f, mtime: stat.mtimeMs };
    }),
  );
  withMtime.sort((a, b) => b.mtime - a.mtime);
  const recent = withMtime.slice(0, 5);

  const lines: string[] = [];
  for (const { f } of recent) {
    try {
      const data  = await fs.readJson(path.join(evalDir, f));
      const band  = data.recommendationBand;
      const score = String(data.scores?.overall ?? '–').padStart(3);
      const blockA = data.blockA_roleSummary;

      if (blockA) {
        // v2.0 artifact
        const level   = blockA.level ? `[${blockA.level}]` : '';
        const label   = `${blockA.title} @ ${blockA.company} ${level}`.slice(0, 48);
        lines.push(`  ${bandIcon(band)}  ${bandLabel(band)} ${score}/100  ${brand.dim(label)}`);
      } else {
        // legacy v1.x — degrade gracefully
        const rec   = (data.analysis?.recommendation ?? 'no blockA').slice(0, 40);
        lines.push(`  ${bandIcon(band)}  ${brand.muted('legacy v1.x'.padEnd(18))} ${score}/100  ${brand.dim(rec)}`);
      }
    } catch {
      lines.push(`  ${brand.error('!')}  ${brand.dim(f.slice(0, 14))}  ${brand.muted('(unreadable)')}`);
    }
  }

  return renderPanel('B · Recent Evaluations', lines.join('\n'));
}

// ─── Panel C: Story Bank ───────────────────────────────────────────────────────

async function panelStories(storyBank: StoryBankEngine): Promise<string> {
  const stories = await storyBank.list();

  if (stories.length === 0) {
    return renderPanel('C · Story Bank', brand.dim('  No stories yet. Run ct evaluate to seed.'));
  }

  const high = stories.filter(s => s.confidenceLevel === 'high').length;
  const med  = stories.filter(s => s.confidenceLevel === 'medium').length;
  const low  = stories.filter(s => s.confidenceLevel === 'low').length;

  // Top tags
  const tagCounts: Record<string, number> = {};
  for (const s of stories) {
    for (const t of s.tags) { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t)
    .join(', ');

  // Newest story
  const newest = stories.reduce((a, b) =>
    (a.createdAt ?? '') > (b.createdAt ?? '') ? a : b,
  );
  const newestDate = newest.createdAt?.slice(0, 10) ?? 'unknown';

  const lines = [
    `  ${brand.bold(String(stories.length))} stor${stories.length === 1 ? 'y' : 'ies'}` +
    `  ${brand.muted('·')}  ${brand.success(String(high))} high  ${brand.warn(String(med))} med  ${brand.error(String(low))} low`,
    `  ${brand.dim('Top tags:')} ${brand.accent(topTags || 'none')}`,
    `  ${brand.dim('Newest:')}   ${brand.muted(newestDate)}`,
  ];

  return renderPanel('C · Story Bank', lines.join('\n'));
}

// ─── Panel D: Passport ────────────────────────────────────────────────────────

async function panelPassport(workspace: WorkspaceManager): Promise<string> {
  const readinessPath    = workspace.getPath('artifacts/passports/readiness.json');
  const publishStatePath = workspace.getPath('artifacts/passports/publish-state.json');

  if (!(await fs.pathExists(readinessPath))) {
    return renderPanel('D · Passport', brand.dim('  No passport. Run: ct passport build'));
  }

  const data      = await fs.readJson(readinessPath);
  const score     = data.score ?? 0;
  const isReady   = data.isReady ?? false;
  const readyStr  = isReady ? brand.success('READY') : brand.warn('NOT READY');

  const missing = (data.checklist ?? [])
    .filter((c: any) => !c.completed)
    .slice(0, 3)
    .map((c: any) => `    ${brand.warn('·')} ${brand.dim(c.task)}`)
    .join('\n');

  // Publish state
  let publishLine = '';
  if (await fs.pathExists(publishStatePath)) {
    try {
      const ps = await fs.readJson(publishStatePath);
      const published = ps.published ?? false;
      publishLine = `\n  ${brand.dim('Publish:')} ${published ? brand.success('Live on marketplace') : brand.muted('Not published')}`;
    } catch { /* skip */ }
  }

  const lines = [
    `  ${brand.bold('Score')}   ${score}/100  ${readyStr}${publishLine}`,
    ...(missing ? ['', `  ${brand.dim('Missing:')}`, missing] : []),
  ];

  return renderPanel('D · Passport', lines.join('\n'));
}

// ─── Panel E: Quick Actions ───────────────────────────────────────────────────

function panelActions(): string {
  const cmds = [
    ['ct evaluate <jd>',   'evaluate a job posting'],
    ['ct stories list',    'view story bank'],
    ['ct tracker list',    'view pipeline'],
    ['ct passport build',  'build passport'],
    ['ct doctor',          'check environment'],
  ];
  const lines = cmds.map(([cmd, desc]) =>
    `  ${brand.accent(cmd.padEnd(22))} ${brand.muted(desc)}`,
  );
  return renderPanel('E · Quick Actions', lines.join('\n'));
}

// ─── Main renderDash ───────────────────────────────────────────────────────────

export async function renderDash(
  workspace: WorkspaceManager,
  tracker: TrackerEngine,
  storyBank: StoryBankEngine,
): Promise<string> {
  const [pA, pB, pC, pD, pE] = await Promise.all([
    panelPipeline(tracker, workspace),
    panelEvaluations(workspace),
    panelStories(storyBank),
    panelPassport(workspace),
    Promise.resolve(panelActions()),
  ]);

  return [
    renderHeader(),
    '',
    pA,
    pB,
    pC,
    pD,
    pE,
    '',
  ].join('\n');
}
