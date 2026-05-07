#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { 
  WorkspaceManager, 
  IngestionEngine, 
  EvaluationEngine, 
  TrackerEngine, 
  EvidenceEngine, 
  ScannerEngine,
  ModelGateway,
  TailorEngine,
  StoryBankEngine,
  ScanEngine,
  BatchEngine,
  ApplyEngine,
  PipelineEngine,
  InterviewEngine,
  NegotiationEngine
} from '@careertwin/engine';
import { DocumentEngine } from '@careertwin/document-engine';
import { PassportBuilder } from '@careertwin/passport';
import fs from 'fs-extra';
import { renderDash } from './dash';

// ─── UX Helpers ──────────────────────────────────────────────
let boxen: any;
let Table: any;
let logSymbols: any;
let figures: any;

try { boxen = require('boxen'); } catch { boxen = null; }
try { Table = require('cli-table3'); } catch { Table = null; }
try { logSymbols = require('log-symbols'); } catch { logSymbols = { success: '✓', error: '✗', warning: '!', info: 'i' }; }
try { figures = require('figures'); } catch { figures = { pointer: '›', bullet: '•', tick: '✓', cross: '✗', line: '─' }; }

// ─── Brand Colors ────────────────────────────────────────────
const brand = {
  primary: chalk.hex('#0EA5E9'),    // Sky blue
  accent:  chalk.hex('#06B6D4'),    // Cyan
  dim:     chalk.gray,
  success: chalk.hex('#22C55E'),
  warn:    chalk.hex('#F59E0B'),
  error:   chalk.hex('#EF4444'),
  bold:    chalk.bold,
  header:  chalk.hex('#0EA5E9').bold,
};

function renderBox(content: string, title?: string): string {
  if (boxen) {
    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 2, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
      title: title || undefined,
      titleAlignment: 'left',
    });
  }
  // Fallback: simple indented block
  const border = brand.accent('─'.repeat(50));
  const lines = content.split('\n').map(l => `  ${l}`).join('\n');
  return `\n  ${title ? brand.header(title) + '\n' : ''}${border}\n${lines}\n${border}\n`;
}

function statusLine(ok: boolean, label: string, detail: string): string {
  const icon = ok ? brand.success(logSymbols.success || '✓') : brand.warn(logSymbols.warning || '!');
  return `  ${icon}  ${brand.bold(label.padEnd(22))} ${ok ? brand.dim(detail) : brand.warn(detail)}`;
}

// ─── Bootstrap ───────────────────────────────────────────────
const program = new Command();
const cwd = process.cwd();
const workspace = new WorkspaceManager(cwd);
const gateway = new ModelGateway(workspace);
const ingestion = new IngestionEngine(workspace, gateway);
const evaluation = new EvaluationEngine(workspace, gateway);
const tracker = new TrackerEngine(workspace);
const tailor = new TailorEngine(workspace, gateway);
const storyBank = new StoryBankEngine(workspace);
const evidence = new EvidenceEngine(workspace);
const scanner = new ScannerEngine(workspace);
const documents = new DocumentEngine(
  fs.existsSync(path.join(cwd, 'packages/document-engine/templates'))
    ? path.join(cwd, 'packages/document-engine/templates')
    : path.join(__dirname, '../../packages/document-engine/templates')
);
const passport = new PassportBuilder(workspace);

// ─── Root Config ─────────────────────────────────────────────
program
  .name('ct')
  .description('CareerTwin Candidate OS — Local-first career operating system')
  .version('0.1.0', '-V, --version', 'Show the current CLI version');

// ─── ct init ─────────────────────────────────────────────────
program
  .command('init')
  .description('Bootstrap the .careertwin workspace')
  .action(async () => {
    const spinner = ora({ text: brand.dim('Initializing .careertwin workspace...'), spinner: 'dots' }).start();
    try {
      await workspace.init();
      spinner.succeed(brand.success('.careertwin/ workspace initialized'));

      const nextSteps = [
        `${brand.accent('1.')} ${brand.dim('npm run ct -- cv import <file>')}   Import your resume`,
        `${brand.accent('2.')} ${brand.dim('npm run ct -- doctor')}             Check environment`,
        `${brand.accent('3.')} ${brand.dim('npm run ct -- profile show')}       View your profile`,
      ].join('\n');

      console.log(renderBox(nextSteps, 'Next Steps'));
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct doctor ───────────────────────────────────────────────
program
  .command('doctor')
  .description('Validate environment, provider readiness, and workspace health')
  .action(async () => {
    const lines: string[] = [];

    // Node
    lines.push(statusLine(true, 'Node.js', process.version));

    // Workspace
    const wsExists = await workspace.exists();
    lines.push(statusLine(wsExists, '.careertwin/', wsExists ? 'Found' : 'Run "npm run ct -- init"'));

    // Writable
    if (wsExists) {
      let writable = false;
      try { await fs.access(workspace.getPath('.'), fs.constants.W_OK); writable = true; } catch {}
      lines.push(statusLine(writable, 'Workspace writable', writable ? 'Yes' : 'Permission denied'));
    }

    // Config
    let configOk = false;
    if (wsExists) {
      try { await workspace.getConfig(); configOk = true; } catch {}
    }
    lines.push(statusLine(configOk, 'config.json', configOk ? 'Valid' : 'Missing or corrupt'));

    // Provider Readiness (generic)
    const readiness = await gateway.checkReadiness();
    lines.push(statusLine(readiness.hasCredentials, `Provider (${readiness.provider})`, readiness.hasCredentials ? 'Credentials present' : 'Not configured'));
    if (readiness.baseUrl) {
      lines.push(statusLine(true, 'Base URL', readiness.baseUrl));
    }
    lines.push(statusLine(readiness.ready, 'Model', readiness.configuredModel));
    lines.push(statusLine(readiness.supportsStructuredOutput, 'Structured output', readiness.supportsStructuredOutput ? 'Supported' : 'Not available'));
    if (readiness.errors.length > 0) {
      for (const err of readiness.errors) {
        lines.push(`  ${brand.error('✗')}  ${brand.error(err)}`);
      }
    }

    // LaTeX
    let latexOk = false;
    let latexVersion = 'Not found (optional)';
    try {
      const { execSync } = await import('child_process');
      const ver = execSync('tectonic --version', { stdio: 'pipe' }).toString().trim();
      latexOk = true;
      latexVersion = ver;
    } catch {}
    lines.push(statusLine(latexOk, 'Tectonic (LaTeX)', latexVersion));

    // Profile
    const profile = await ingestion.loadProfile();
    lines.push(statusLine(!!profile, 'Candidate Profile', profile ? profile.bio.name : 'Not ingested'));

    console.log(renderBox(lines.join('\n'), 'CareerTwin Doctor'));
  });

// ─── ct config edit ──────────────────────────────────────────
const configCmd = program.command('config').description('Configuration management');
configCmd
  .command('edit')
  .description('Open config.json in default editor')
  .action(async () => {
    const configPath = workspace.getPath('config.json');
    if (!(await fs.pathExists(configPath))) {
      console.log(brand.error('\n  Workspace not initialized. Run "npm run ct -- init" first.\n'));
      return;
    }
    const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vi');
    const { spawn } = await import('child_process');
    spawn(editor, [configPath], { stdio: 'inherit' });
  });

// ─── ct profile show ────────────────────────────────────────
const profileCmd = program.command('profile').description('Candidate profile management');
profileCmd
  .command('show')
  .description('Display structured candidate profile')
  .action(async () => {
    const profile = await ingestion.loadProfile();
    if (!profile) {
      console.log(brand.warn('\n  No profile found. Run "npm run ct -- cv import <file>".\n'));
      return;
    }

    const header = `${brand.header(profile.bio.name)}\n${brand.dim(profile.bio.email || '')}`;
    const summary = `${brand.accent('Summary')}  ${profile.bio.summary}`;
    const skills = `${brand.accent('Skills')}   ${profile.skills.join(', ')}`;
    
    let expBlock = '';
    if (profile.experience && profile.experience.length > 0) {
      expBlock = '\n' + brand.accent('Experience') + '\n';
      for (const exp of profile.experience) {
        expBlock += `  ${brand.bold(exp.role)} at ${exp.company}\n`;
        expBlock += `  ${brand.dim(`${exp.startDate} – ${exp.endDate || 'Present'}`)}\n`;
        for (const h of exp.highlights.slice(0, 2)) {
          expBlock += brand.dim(`    ${figures.bullet || '•'} ${h}`) + '\n';
        }
      }
    }

    console.log(renderBox(`${header}\n\n${summary}\n${skills}${expBlock}`, 'Candidate Profile'));
  });

// ─── ct profile ingest ──────────────────────────────────────
profileCmd
  .command('ingest')
  .description('Interactively ingest profile data')
  .action(async () => {
    console.log(brand.warn('\n  Profile ingestion requires a configured provider.'));
    console.log(brand.dim('  Use "npm run ct -- cv import <file>" to import from an existing CV.'));
    console.log(brand.dim('  Run "npm run ct -- doctor" to check provider readiness.\n'));
  });

// ─── ct cv import ───────────────────────────────────────────
program
  .command('cv')
  .description('CV management')
  .command('import <file>')
  .description('Import a CV file and parse it into a structured profile')
  .option('--mock', 'Create a demo profile without a provider')
  .action(async (file: string, opts: { mock?: boolean }) => {
    const spinner = ora({ text: brand.dim('Importing CV...'), spinner: 'dots' }).start();
    try {
      const filePath = path.resolve(cwd, file);
      if (!(await fs.pathExists(filePath))) {
        spinner.fail(brand.error(`File not found: ${filePath}`));
        return;
      }

      spinner.text = brand.dim('Reading file...');
      let content: string | Buffer;
      if (filePath.toLowerCase().endsWith('.pdf')) {
        content = await fs.readFile(filePath);
      } else {
        content = await fs.readFile(filePath, 'utf-8');
      }

      if (opts.mock) {
        spinner.text = brand.dim('Creating demo profile (--mock)...');
      } else {
        spinner.text = brand.dim('Parsing with provider...');
      }

      const profile = await ingestion.importCV(content, { mock: opts.mock });
      const savedPath = workspace.getPath('profile/candidate.json');

      spinner.succeed(brand.success(`Profile created for ${profile.bio.name}`));

      const summary = [
        `${brand.accent('Name')}     ${profile.bio.name}`,
        `${brand.accent('Skills')}   ${profile.skills.slice(0, 8).join(', ')}${profile.skills.length > 8 ? '...' : ''}`,
        `${brand.accent('Saved')}    ${brand.dim(savedPath)}`,
        '',
        `${brand.dim('Next:')} npm run ct -- profile show`,
      ].join('\n');

      console.log(renderBox(summary, 'Import Complete'));
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct evaluate ────────────────────────────────────────────
program
  .command('evaluate <source>')
  .description('Evaluate a job posting against your profile')
  .option('--mock', 'Run a demo evaluation without a provider')
  .action(async (source: string, opts: { mock?: boolean }) => {
    const spinner = ora({ text: brand.dim('Evaluating job...'), spinner: 'dots' }).start();
    try {
      const profile = await ingestion.loadProfile();
      if (!profile) {
        spinner.fail(brand.error('No profile found. Run "npm run ct -- cv import <file>" first.'));
        return;
      }

      let jdText: string;
      if (source.startsWith('http')) {
        jdText = `[JD from URL: ${source}]`;
      } else {
        jdText = await fs.readFile(path.resolve(cwd, source), 'utf-8');
      }

      spinner.text = brand.dim('Running evaluation...');
      const result = await evaluation.evaluateJob(jdText, profile, { mock: opts.mock });

      spinner.succeed(brand.success('Evaluation complete'));

      // Add to tracker
      await tracker.add({
        id: require('crypto').randomUUID(),
        jobId: result.jobId,
        status: 'evaluated',
        lastUpdatedAt: new Date().toISOString(),
        notes: [{ date: new Date().toISOString(), content: `Score ${result.scores.overall}/100 · ${result.recommendationBand}` }],
      } as any);

      // ── Block A: Role Summary ─────────────────────────────────
      const A = result.blockA_roleSummary;
      if (A) {
        const aContent = [
          `${brand.bold('Title')}    ${A.title} @ ${A.company}`,
          `${brand.bold('Level')}    ${A.level}  ·  ${A.workMode}  ·  ${A.location || 'N/A'}`,
          `${brand.bold('Archetype')} ${A.archetype}`,
          `${brand.bold('Domain')}   ${A.domain}  ·  ${A.function}`,
          `${brand.bold('Comp')}     ${A.compensationRange || 'Not specified'}`,
          '',
          `${brand.accent('TL;DR')}   ${brand.dim(A.tldr)}`,
          `${brand.accent('Why it matters')} ${brand.dim(A.whyThisMatters)}`,
        ].join('\n');
        console.log(renderBox(aContent, 'A · Role Summary'));
      }

      // ── Block B: CV Match ─────────────────────────────────────
      const B = result.blockB_cvMatch;
      if (B) {
        const strengthIcon = (s: string) =>
          s === 'strong' ? brand.success('●') : s === 'partial' ? brand.warn('◐') : s === 'weak' ? brand.warn('○') : brand.error('✗');

        const reqLines = (B.requirements || []).slice(0, 6).map(r =>
          `  ${strengthIcon(r.strength)} ${r.requirement.padEnd(30)} ${brand.dim(r.evidence.slice(0, 40))}`
        );
        const gapLines = (B.gaps || []).map(g =>
          `  ${brand.error('▲')} [${g.severity}] ${g.gap} — ${brand.dim(g.mitigation)}`
        );
        const bContent = [
          `${brand.bold('Match')}  ${B.overallMatchPct}%`,
          '',
          brand.accent('Requirements:'),
          ...reqLines,
          '',
          brand.accent('Gaps:'),
          ...gapLines,
          '',
          brand.accent('Risks:'),
          ...(B.risks || []).map(r => `  ${brand.warn('!')} ${r}`),
        ].join('\n');
        console.log(renderBox(bContent, 'B · CV Match'));
      }

      // ── Block C: Level & Strategy ─────────────────────────────
      const C = result.blockC_levelStrategy;
      if (C) {
        const alignIcon = C.levelAlignment === 'match' ? brand.success('✓ match') :
          C.levelAlignment === 'above' ? brand.warn('↑ above') :
          C.levelAlignment === 'below' ? brand.error('↓ below') : brand.dim('? unclear');
        const cContent = [
          `${brand.bold('JD Level')}         ${C.jdLevel}`,
          `${brand.bold('Candidate Level')} ${C.candidateLevel}`,
          `${brand.bold('Alignment')}       ${alignIcon}`,
          '',
          `${brand.accent('Strategy:')} ${C.strategyName}`,
          '',
          brand.accent('Talking Points:'),
          ...(C.talkingPoints || []).map(tp => `  ${brand.dim('›')} ${tp}`),
          ...(C.downlevelGuidance ? ['', brand.warn('Downlevel Guidance:'), `  ${brand.dim(C.downlevelGuidance)}`] : []),
        ].join('\n');
        console.log(renderBox(cContent, 'C · Level & Strategy'));
      }

      // ── Block D: Compensation & Demand ────────────────────────
      const D = result.blockD_compensationDemand;
      if (D) {
        const dLines: string[] = [
          `${brand.bold('Comp Score')}  ${D.compScore}/100`,
          '',
          brand.accent('Benchmark Table:'),
        ];
        if (Table && D.benchmarkTable?.length) {
          const bt = new Table({
            head: ['Level', 'Geo', 'Type', 'P25', 'P50', 'P75', 'Source'].map(h => brand.accent(h)),
            chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
            style: { head: [], border: ['cyan'] },
          });
          for (const row of D.benchmarkTable) {
            bt.push([row.level, row.geography, row.companyType, row.p25 || '—', row.p50 || '—', row.p75 || '—', brand.dim(row.source)]);
          }
          console.log(renderBox([
            `${brand.bold('Comp Score')}  ${D.compScore}/100`,
            brand.dim(D.attractivenessCommentary),
          ].join('\n'), 'D · Compensation & Demand'));
          console.log(bt.toString());
          console.log(brand.dim(`  ${D.demandContext}\n`));
        } else {
          dLines.push(brand.dim(D.attractivenessCommentary));
          dLines.push(brand.dim(D.demandContext));
          console.log(renderBox(dLines.join('\n'), 'D · Compensation & Demand'));
        }
      }

      // ── Block E: Personalization Plan ────────────────────────
      const E = result.blockE_personalizationPlan;
      if (E) {
        const priorityIcon = (p: string) => p === 'high' ? brand.error('↑') : p === 'medium' ? brand.warn('→') : brand.dim('↓');
        const cvLines = (E.cvChanges || []).map(c =>
          `  ${priorityIcon(c.priority)} [${c.section}] ${c.change}\n     ${brand.dim(c.rationale)}`
        );
        const liLines = (E.linkedInChanges || []).map(c =>
          `  ${priorityIcon(c.priority)} [${c.section}] ${c.change}\n     ${brand.dim(c.rationale)}`
        );
        const eContent = [
          brand.accent('CV Changes:'),
          ...cvLines,
          '',
          brand.accent('LinkedIn Changes:'),
          ...liLines,
        ].join('\n');
        console.log(renderBox(eContent, 'E · Personalization Plan'));
      }

      // ── Block F: Interview Prep ───────────────────────────────
      const F = result.blockF_interviewPrep;
      if (F) {
        const confIcon = (c: string) => c === 'high' ? brand.success('●') : c === 'medium' ? brand.warn('◐') : brand.error('○');
        const storyLines = (F.stories || []).map(s =>
          [
            `  ${confIcon(s.confidenceLevel)} ${brand.bold(s.title)} ${brand.dim('→')} ${brand.dim(s.requirementMapped)}`,
            `     ${brand.accent('S:')} ${s.situation.slice(0, 80)}`,
            `     ${brand.accent('T:')} ${s.task.slice(0, 80)}`,
            `     ${brand.accent('A:')} ${s.action.slice(0, 80)}`,
            `     ${brand.accent('R:')} ${s.result.slice(0, 80)}`,
            `     ${brand.dim('tags: ' + s.tags.join(', '))}`,
          ].join('\n')
        );
        const fContent = [
          `${brand.bold('Readiness')} ${F.readinessScore}/100`,
          '',
          brand.accent('STAR Stories:'),
          ...storyLines,
        ].join('\n');
        console.log(renderBox(fContent, 'F · Interview Prep'));
      }

      // ── Fallback: legacy flat analysis (v1.x artifacts) ──────
      if (!A && !B && result.analysis) {
        const analysis = [
          brand.success('Matches:'),
          ...(result.analysis.matches || []).map((m: string) => `  ${brand.success('✓')} ${brand.dim(m)}`),
          '', brand.error('Gaps:'),
          ...(result.analysis.gaps || []).map((g: string) => `  ${brand.error('✗')} ${brand.dim(g)}`),
          '', brand.warn('Fixes:'),
          ...(result.analysis.actionableFixes || []).map((f: string) => `  ${brand.accent('→')} ${brand.dim(f)}`),
          '', `${brand.accent('Recommendation:')} ${result.analysis.recommendation || ''}`,
        ].join('\n');
        console.log(renderBox(analysis, 'Gap Analysis'));
      }

      // ── Recommendation Band ───────────────────────────────────
      const bandColor = result.recommendationBand === 'top-target' ? brand.success :
        result.recommendationBand === 'strong-apply' ? brand.primary :
        result.recommendationBand === 'conditional-apply' ? brand.warn : brand.error;
      console.log(renderBox(
        `${brand.bold('Band')}    ${bandColor((result.recommendationBand || 'N/A').toUpperCase())}\n` +
        `${brand.bold('Score')}   ${result.scores.overall}/100  ·  ${result.senioritySignal || ''}\n` +
        `${brand.dim('Saved to: ')}${workspace.getPath(`jobs/evaluations/${result.jobId}.json`)}`,
        'Decision'
      ));

      // ── Auto-seed story bank ──────────────────────────────────
      const seed = await storyBank.seedFromEvaluation(result);
      if (seed.added > 0 || seed.skipped > 0) {
        console.log(brand.dim(`  Story bank: +${seed.added} new, ${seed.skipped} already present\n`));
      }

    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct tailor ──────────────────────────────────────────────
program
  .command('tailor <jobId>')
  .description('Generate tailored resume bullets using STAR methodology')
  .action(async (jobId: string) => {
    const spinner = ora({ text: brand.dim('Tailoring resume bullets...'), spinner: 'dots' }).start();
    try {
      const profile = await ingestion.loadProfile();
      if (!profile) {
        spinner.fail(brand.error('No profile found.'));
        return;
      }

      // Load evaluation
      const evalPath = workspace.getPath(`jobs/evaluations/${jobId}.json`);
      if (!(await fs.pathExists(evalPath))) {
        spinner.fail(brand.error(`No evaluation found for jobId: ${jobId}. Run evaluate first.`));
        return;
      }
      const evaluationData = await fs.readJson(evalPath);

      spinner.text = brand.dim('Rewriting bullets with STAR methodology...');
      const tailoredProfile = await tailor.tailorProfile(profile, evaluationData);
      const savedPath = await tailor.saveTailoredArtifact(tailoredProfile, jobId);

      spinner.succeed(brand.success('Tailoring complete'));
      console.log(renderBox(
        `${brand.accent('Job ID')}  ${jobId.slice(0, 8)}...\n${brand.accent('Saved')}   ${brand.dim(savedPath)}`,
        'Tailored Profile Generated'
      ));
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct resume build ────────────────────────────────────────
const resumeCmd = program.command('resume').description('Resume management');
resumeCmd
  .command('build')
  .description('Compile LaTeX resume artifacts')
  .option('-m, --mode <mode>', 'Resume mode: ats | startup', 'ats')
  .action(async (opts: { mode: string }) => {
    const spinner = ora({ text: brand.dim(`Building ${opts.mode} resume...`), spinner: 'dots' }).start();
    try {
      const profile = await ingestion.loadProfile();
      if (!profile) {
        spinner.fail(brand.error('No profile found. Run "npm run ct -- cv import <file>" first.'));
        return;
      }
      const mode = opts.mode as 'ats' | 'startup';
      const outputPath = workspace.getPath(`artifacts/resumes/resume-${mode}-${Date.now()}.pdf`);
      const templateMode = mode === 'ats' ? 'ats-safe' : 'startup';
      await documents.generateResume(profile, templateMode, outputPath);
      spinner.succeed(brand.success('Resume built'));
      
      console.log(renderBox(
        `${brand.accent('Mode')}   ${mode}\n${brand.accent('Path')}   ${brand.dim(outputPath)}\n\n${brand.dim('Next:')} Open the PDF or run "npm run ct -- artifacts list"`,
        'Resume Generated'
      ));
    } catch (error: any) {
      spinner.warn(brand.warn('PDF compilation failed. .tex source persisted.'));
      console.log(brand.dim(`  ${error.message}\n`));
    }
  });

// ─── ct artifacts list ──────────────────────────────────────
const artifactsCmd = program.command('artifacts').description('Artifact management');
artifactsCmd
  .command('list')
  .description('List all generated artifacts')
  .action(async () => {
    try {
      const manifest = await workspace.getManifest();
      if (manifest.artifacts.length === 0) {
        console.log(brand.dim('\n  No artifacts generated yet.\n'));
        return;
      }
      if (Table) {
        const table = new Table({
          head: ['Type', 'Name', 'Created'].map(h => brand.accent(h)),
          chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          style: { head: [], border: ['cyan'] },
        });
        for (const art of manifest.artifacts) {
          table.push([art.type, art.name, brand.dim(art.createdAt)]);
        }
        console.log('\n' + table.toString() + '\n');
      } else {
        for (const art of manifest.artifacts) {
          console.log(`  ${brand.accent(art.type.padEnd(15))} ${art.name} ${brand.dim(art.createdAt)}`);
        }
      }
    } catch {
      console.log(brand.dim('\n  No manifest found. Run "npm run ct -- init" first.\n'));
    }
  });

// ─── ct passport build ──────────────────────────────────────
const passportCmd = program.command('passport').description('Passport & marketplace identity');
passportCmd
  .command('build')
  .description('Generate or update the structured Passport')
  .action(async () => {
    const spinner = ora({ text: brand.dim('Building Passport...'), spinner: 'dots' }).start();
    try {
      const profile = await ingestion.loadProfile();
      if (!profile) {
        spinner.fail(brand.error('No profile found. Run "npm run ct -- cv import <file>" first.'));
        return;
      }
      const p = await passport.buildPassport(profile);
      const readiness = await passport.checkReadiness(p);
      spinner.succeed(brand.success('Passport built'));

      if (Table) {
        const table = new Table({
          head: ['Check', 'Status', 'Impact'].map(h => brand.accent(h)),
          chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          style: { head: [], border: ['cyan'] },
        });
        for (const item of readiness.checklist) {
          const icon = item.completed ? brand.success('✓') : brand.error('✗');
          table.push([`${icon} ${item.task}`, item.completed ? 'Done' : 'Missing', brand.dim(item.impact)]);
        }
        console.log('\n' + table.toString());
      }

      const readinessLabel = readiness.isReady ? brand.success('READY') : brand.warn('NOT READY');
      console.log(renderBox(
        `${brand.accent('Score')}  ${readiness.score}/100 ${readinessLabel}\n${brand.accent('Saved')}  ${brand.dim(workspace.getPath('artifacts/passports/'))}`,
        'Passport Readiness'
      ));
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct passport preview ────────────────────────────────────
passportCmd
  .command('preview')
  .description('Preview the Passport with trust-boundary visibility grouping')
  .action(async () => {
    const passportPath = workspace.getPath('artifacts/passports/passport.json');
    if (!(await fs.pathExists(passportPath))) {
      console.log(brand.warn('\n  No passport found. Run "npm run ct -- passport build" first.\n'));
      return;
    }
    const data = await fs.readJson(passportPath);

    if (Table) {
      const table = new Table({
        head: ['Visibility', 'Field', 'Value'].map(h => brand.accent(h)),
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        style: { head: [], border: ['cyan'] },
      });
      table.push(
        [brand.success('Public'), 'Roles', (data.roleTags || []).join(', ')],
        [brand.success('Public'), 'Skills', (data.skillTags || []).join(', ')],
        [brand.success('Public'), 'Domains', (data.domainTags || []).join(', ')],
        [brand.success('Public'), 'Founder Intro', (data.founderIntro || '').slice(0, 60) + '...'],
        [brand.warn('Founder'), 'Startup Fit', (data.startupFitIndicators || []).join(', ')],
        [brand.error('Private'), 'Raw Profile', 'Local only'],
      );
      console.log('\n' + table.toString() + '\n');
    } else {
      console.log(`\n  ${brand.accent('Roles:')}       ${(data.roleTags || []).join(', ')}`);
      console.log(`  ${brand.accent('Skills:')}      ${(data.skillTags || []).join(', ')}`);
      console.log(`  ${brand.accent('Founder:')}     ${data.founderIntro}\n`);
    }
  });

// ─── ct passport publish ────────────────────────────────────
passportCmd
  .command('publish')
  .description('Sync Passport to CareerTwin marketplace')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (opts: { confirm?: boolean }) => {
    const spinner = ora({ text: brand.dim('Preparing to publish...'), spinner: 'dots' }).start();
    try {
      const state = await passport.getPublishState();
      const { publicPayload, founderPayload } = await passport.publish();
      spinner.succeed(brand.success('Passport published'));

      // Show what was sent
      if (Table) {
        const table = new Table({
          head: ['Boundary', 'Fields Sent'].map(h => brand.accent(h)),
          chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          style: { head: [], border: ['cyan'] },
        });
        table.push(
          [brand.success('Public'), Object.keys(publicPayload).join(', ')],
          [brand.warn('Founder'), Object.keys(founderPayload).join(', ')],
          [brand.error('Private'), 'NOT SENT — stays local'],
        );
        console.log('\n' + table.toString());
      }

      console.log(renderBox(
        `${brand.success('Passport is now LIVE on the marketplace.')}\n\n` +
        `${brand.dim('Run "npm run ct -- passport unpublish" to revoke visibility.')}`,
        'Published'
      ));
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct passport unpublish ──────────────────────────────────
passportCmd
  .command('unpublish')
  .description('Remove Passport from the marketplace')
  .action(async () => {
    const spinner = ora({ text: brand.dim('Unpublishing...'), spinner: 'dots' }).start();
    try {
      await passport.unpublish();
      spinner.succeed(brand.success('Passport unpublished'));
      console.log(renderBox(
        `${brand.success('Passport removed from marketplace.')}\n` +
        `${brand.dim('Your local data remains intact in .careertwin/.')}`,
        'Unpublished'
      ));
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct tracker list ────────────────────────────────────────
const trackerCmd = program.command('tracker').description('Application pipeline tracker');
trackerCmd
  .command('list')
  .description('Show current application pipeline')
  .action(async () => {
    const items = await tracker.list();
    if (items.length === 0) {
      console.log(brand.dim('\n  No applications tracked yet.\n'));
      return;
    }
    const summary = await tracker.summary();
    if (Table) {
      const table = new Table({
        head: ['Status', 'Count'].map(h => brand.accent(h)),
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        style: { head: [], border: ['cyan'] },
      });
      for (const [status, count] of Object.entries(summary)) {
        table.push([status, String(count)]);
      }
      console.log('\n' + table.toString());
    }
    console.log(brand.dim(`\n  Total: ${items.length}\n`));
  });

// ─── ct tracker update ──────────────────────────────────────
trackerCmd
  .command('update <id> <status>')
  .description('Update status of a tracked application')
  .action(async (id: string, status: string) => {
    try {
      await tracker.update(id, status as any);
      console.log(brand.success(`\n  Application ${id.slice(0, 8)}... updated to "${status}".\n`));
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

// ─── ct scan ────────────────────────────────────────────────
program
  .command('scan')
  .description('Discover jobs from configured portal sources')
  .option('--source <type>', 'filter by source type (greenhouse, lever, company-page)')
  .option('--company <name>', 'filter by company name')
  .option('--limit <n>', 'max postings per source', parseInt)
  .option('--dry-run', 'preview without persisting')
  .action(async (opts) => {
    const scanEngine = new ScanEngine(workspace);
    const spinner = ora({ text: brand.dim('Scanning configured sources...'), spinner: 'dots' }).start();
    try {
      const summary = await scanEngine.scan({
        sourceFilter:  opts.source,
        companyFilter: opts.company,
        limit:         opts.limit,
        dryRun:        opts.dryRun,
      });
      spinner.succeed(brand.success('Scan complete'));

      // ── Source table ──────────────────────────────────────────────────────
      if (summary.sources.length === 0) {
        console.log(brand.warn('\n  No enabled sources found.'));
        console.log(brand.dim('  Edit .careertwin/config/portals.yml and set enabled: true\n'));
        return;
      }

      console.log('');
      const colW = [22, 8, 8, 8];
      const header = [
        brand.dim('Source'.padEnd(colW[0])),
        brand.dim('Added'.padEnd(colW[1])),
        brand.dim('Deduped'.padEnd(colW[2])),
        brand.dim('Failed'.padEnd(colW[3])),
      ].join('  ');
      console.log('  ' + header);
      console.log('  ' + brand.dim('─'.repeat(52)));

      for (const r of summary.sources) {
        const label = `${r.company} (${r.sourceType})`.slice(0, colW[0] - 1).padEnd(colW[0]);
        const added   = (r.added > 0   ? brand.accent(String(r.added))   : brand.dim('0')).padEnd(colW[1]);
        const deduped = (r.deduped > 0 ? brand.warn(String(r.deduped))   : brand.dim('0')).padEnd(colW[2]);
        const failed  = (r.failed > 0  ? brand.error(String(r.failed))   : brand.dim('0')).padEnd(colW[3]);
        console.log(`  ${label}  ${added}  ${deduped}  ${failed}`);
        if ((r as any).error) console.log(`    ${brand.dim('↳ ' + (r as any).error)}`);
      }

      console.log('');
      console.log(`  ${brand.dim('Total:')} Discovered ${brand.bold(String(summary.totalAdded + summary.totalDeduped))}  ·  Added ${brand.accent(String(summary.totalAdded))}  ·  Deduped ${brand.warn(String(summary.totalDeduped))}  ·  Failed ${summary.totalFailed > 0 ? brand.error(String(summary.totalFailed)) : brand.dim('0')}\n`);

      if (summary.totalAdded > 0) {
        console.log(brand.dim(`  Run: npm run ct -- batch   to evaluate pending jobs\n`));
      }
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct batch ───────────────────────────────────────────────
program
  .command('batch')
  .description('Batch evaluate pending discovered jobs')
  .option('--limit <n>', 'max jobs to evaluate', parseInt)
  .option('--concurrency <n>', 'parallel worker count (default: 2)', parseInt)
  .action(async (opts) => {
    const scanEngine  = new ScanEngine(workspace);
    const batchEngine = new BatchEngine(workspace, evaluation);

    const pending = await scanEngine.loadPending();
    if (pending.length === 0) {
      console.log(brand.warn('\n  No pending jobs to evaluate.'));
      console.log(brand.dim('  Run: npm run ct -- scan   to discover jobs first\n'));
      return;
    }

    const spinner = ora({ text: brand.dim(`Evaluating ${Math.min(pending.length, opts.limit ?? pending.length)} jobs...`), spinner: 'dots' }).start();
    try {
      const summary = await batchEngine.run({
        limit:       opts.limit,
        concurrency: opts.concurrency ?? 2,
      });
      spinner.succeed(brand.success('Batch complete'));

      console.log('');
      console.log(`  Attempted: ${brand.bold(String(summary.attempted))}  ·  Succeeded: ${brand.accent(String(summary.succeeded))}  ·  Failed: ${summary.failed > 0 ? brand.error(String(summary.failed)) : brand.dim('0')}`);
      console.log('');

      if (Object.keys(summary.bandCounts).length > 0) {
        console.log(`  ${brand.dim('Band Distribution:')}`);
        const bandIcons: Record<string,string> = { 'top-target': '★', 'strong-apply': '●', 'conditional-apply': '◐', 'no-apply': '○' };
        for (const [band, count] of Object.entries(summary.bandCounts)) {
          const icon = bandIcons[band] ?? '–';
          console.log(`    ${brand.dim(icon)}  ${band.padEnd(20)} ${brand.bold(String(count))}`);
        }
        console.log('');
      }

      const failed = summary.jobs.filter(j => !j.success);
      if (failed.length > 0) {
        console.log(`  ${brand.error('Failed jobs:')}`);
        for (const j of failed) {
          console.log(`    › ${j.company} — ${j.title}`);
          if (j.error) console.log(`      ${brand.dim(j.error)}`);
        }
        console.log('');
      }
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct apply ───────────────────────────────────────────────
const applyCmd = program.command('apply').description('Application packet preparation (human-in-the-loop)');

applyCmd
  .command('draft <jobId>')
  .description('Generate an application packet for human review')
  .option('--mock', 'use mock LLM for cover letter generation')
  .action(async (jobId: string, opts: any) => {
    const applyEngine = new ApplyEngine(workspace, gateway);
    const spinner = ora({ text: brand.dim('Assembling application packet...'), spinner: 'dots' }).start();
    try {
      const packet = await applyEngine.createDraft(jobId, { mock: opts.mock ?? (!process.env.CT_LOCAL_URL && !process.env.OPENAI_API_KEY) });
      spinner.succeed(brand.success('Apply packet created'));

      console.log('');
      console.log(`  ${brand.bold(packet.title)} at ${brand.accent(packet.company)}`);
      console.log(`  Band: ${packet.evaluationBand ?? '—'}  ·  Score: ${packet.evaluationScore ?? '—'}/100`);
      console.log(`  Status: ${brand.warn('draft')}  ·  Tracker: → tailored`);
      console.log('');
      console.log(`  ${brand.dim('Artifacts:')}`);
      if (packet.artifacts.coverLetter)    console.log(`    ✔ Cover letter`);
      else                                 console.log(`    ○ Cover letter  ${brand.dim('(skipped)')}`);
      console.log(`    ✔ Application answers`);
      console.log(`    ✔ Review checklist`);
      if (packet.artifacts.tailoredResume) console.log(`    ✔ Tailored resume`);
      else                                 console.log(`    ○ Tailored resume  ${brand.dim('(not found)')}`);
      console.log('');
      console.log(`  ${brand.dim('Packet:')} .careertwin/jobs/applications/${jobId.slice(0, 8)}...`);
      console.log(`  ${brand.dim('Next:')}   Review packet, then: npm run ct -- apply review ${jobId}\n`);
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

applyCmd
  .command('list')
  .description('List all application packets')
  .action(async () => {
    const applyEngine = new ApplyEngine(workspace, gateway);
    const packets = await applyEngine.listPackets();
    if (packets.length === 0) {
      console.log(brand.warn('\n  No application packets found.'));
      console.log(brand.dim('  Run: npm run ct -- apply draft <jobId>\n'));
      return;
    }
    console.log('');
    const statusIcons: Record<string, string> = { draft: '○', reviewed: '●', submitted: '✔' };
    for (const p of packets) {
      const icon = statusIcons[p.status] ?? '–';
      const scoreStr = p.evaluationScore ? `${p.evaluationScore}/100` : '—';
      console.log(`  ${brand.dim(icon)}  ${brand.bold(p.title)} at ${p.company}  ${brand.dim('[' + p.jobId.slice(0, 8) + ']')}`);
      console.log(`     ${p.status.padEnd(14)} ${brand.dim(p.evaluationBand ?? '')}  ${brand.dim(scoreStr)}  ${brand.dim(p.createdAt.slice(0, 10))}`);
    }
    console.log(`\n  Total: ${packets.length}\n`);
  });

applyCmd
  .command('review <jobId>')
  .description('Mark an application packet as reviewed → ready-to-apply')
  .option('--notes <text>', 'add review notes')
  .action(async (jobId: string, opts: any) => {
    const applyEngine = new ApplyEngine(workspace, gateway);
    try {
      const packet = await applyEngine.reviewPacket(jobId, opts.notes);
      console.log('');
      console.log(`  ${brand.accent('✔')} Packet reviewed: ${brand.bold(packet.title)} at ${packet.company}`);
      console.log(`  Packet status: ${brand.accent('reviewed')}`);
      console.log(`  Tracker status: → ${brand.accent('ready-to-apply')}`);
      if (opts.notes) console.log(`  Notes: ${brand.dim(opts.notes)}`);
      console.log('');
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

// ─── ct pipeline ────────────────────────────────────────────
const pipelineCmd = program.command('pipeline').description('Pipeline integrity and statistics');

pipelineCmd
  .command('health')
  .description('Run pipeline integrity health check')
  .action(async () => {
    const pipelineEngine = new PipelineEngine(workspace);
    const spinner = ora({ text: brand.dim('Running health check...'), spinner: 'dots' }).start();
    const report = await pipelineEngine.health();
    spinner.succeed(brand.success('Pipeline Health Check'));

    console.log('');
    console.log(`  Tracker entries:       ${brand.bold(String(report.trackerCount))}`);
    console.log(`  Evaluation artifacts:  ${brand.bold(String(report.evalCount))}`);
    console.log(`  Discovered postings:   ${brand.bold(String(report.discoveredCount))}`);
    console.log(`  Apply packets:         ${brand.bold(String(report.packetCount))}`);
    console.log('');

    if (report.issues.length === 0) {
      console.log(`  ${brand.accent('✔')} No issues found. Pipeline is healthy.\n`);
    } else {
      console.log(`  ${brand.warn('Issues:')}`);
      const fixable = report.issues.filter(i => i.autoFixable);
      const manual  = report.issues.filter(i => !i.autoFixable);
      for (const issue of report.issues) {
        const icon = issue.autoFixable ? brand.warn('⚠') : brand.error('✗');
        console.log(`    ${icon}  ${issue.message}`);
      }
      console.log('');
      if (fixable.length > 0) {
        console.log(`  ${brand.dim(`${fixable.length} auto-fixable. Run: npm run ct -- pipeline fix`)}`);
      }
      if (manual.length > 0) {
        console.log(`  ${brand.dim(`${manual.length} require manual review.`)}`);
      }
      console.log('');
    }
  });

pipelineCmd
  .command('fix')
  .description('Auto-repair safe pipeline issues')
  .action(async () => {
    const pipelineEngine = new PipelineEngine(workspace);
    const spinner = ora({ text: brand.dim('Fixing pipeline issues...'), spinner: 'dots' }).start();
    const result = await pipelineEngine.fix();
    spinner.succeed(brand.success('Pipeline fix complete'));

    console.log('');
    if (result.fixed === 0) {
      console.log(`  ${brand.accent('✔')} Nothing to fix. Pipeline is clean.\n`);
    } else {
      for (const d of result.details) {
        console.log(`  ✔ ${d}`);
      }
      console.log(`\n  Fixed: ${brand.accent(String(result.fixed))}\n`);
    }
  });

pipelineCmd
  .command('stats')
  .description('Pipeline statistics summary')
  .action(async () => {
    const pipelineEngine = new PipelineEngine(workspace);
    const stats = await pipelineEngine.stats();

    console.log('');
    console.log(`  ${brand.dim('Pipeline Stats:')}`);
    console.log(`  Total tracked:  ${brand.bold(String(stats.total))}`);
    for (const [status, count] of Object.entries(stats.byStatus)) {
      console.log(`    ${status.padEnd(16)} ${brand.bold(String(count))}`);
    }
    console.log('');
    if (stats.strongest) {
      console.log(`  Strongest:  ${brand.bold(stats.strongest.title)} @ ${stats.strongest.company} (${stats.strongest.score}/100, ${stats.strongest.band})`);
    }
    if (stats.mostRecent) {
      console.log(`  Recent:     ${brand.bold(stats.mostRecent.title)} @ ${stats.mostRecent.company} (${stats.mostRecent.evaluatedAt?.slice(0, 10) ?? '—'})`);
    }
    console.log('');
  });

// ─── ct tui ────────────────────────────────────────────────
program
  .command('tui')
  .description('Full interactive Dashboard TUI (Phase 2B)')
  .action(async () => {
    const { spawnSync } = require('child_process');
    const tuiBin = path.resolve(__dirname, '../../../dist/ct-tui');
    const tuiSrc = path.resolve(__dirname, '../../../apps/tui');
    const workspacePath = workspace.getPath('');

    // ── Binary lifecycle: auto-build if missing or stale ──────────────────
    const needsBuild = (() => {
      if (!fs.existsSync(tuiBin)) return true;
      // Stale check: rebuild if go.mod is newer than binary
      const binStat  = fs.statSync(tuiBin);
      const goModPath = path.join(tuiSrc, 'go.mod');
      if (fs.existsSync(goModPath)) {
        const modStat = fs.statSync(goModPath);
        if (modStat.mtimeMs > binStat.mtimeMs) return true;
      }
      return false;
    })();

    if (needsBuild) {
      console.log(brand.dim('\n  Building ct-tui binary...\n'));
      const buildResult = spawnSync('go', ['build', '-o', tuiBin, '.'], {
        cwd: tuiSrc,
        stdio: 'inherit',
        env: process.env,
      });
      if (buildResult.status !== 0) {
        console.error(brand.error('\n  ct-tui build failed.'));
        console.error(brand.dim('  Root cause: go build exited non-zero in apps/tui/'));
        console.error(brand.dim('  Fix: cd apps/tui && go mod tidy && go build -o ../../dist/ct-tui .\n'));
        process.exit(1);
      }
      if (buildResult.error) {
        console.error(brand.error('\n  go not found in PATH.'));
        console.error(brand.dim('  Install Go: https://go.dev/doc/install'));
        console.error(brand.dim('  Then retry: npm run ct -- tui\n'));
        process.exit(1);
      }
      console.log(brand.success('  Built dist/ct-tui\n'));
    }

    // ── Launch via canonical path ──────────────────────────────────────────
    const result = spawnSync(tuiBin, ['--workspace', workspacePath], {
      stdio: 'inherit',
      env: process.env,
    });
    process.exit(result.status ?? 0);
  });


// ─── ct dash ───────────────────────────────────────────────

program
  .command('dash')
  .description('Live terminal dashboard — pipeline, evaluations, stories, passport')
  .option('--watch [seconds]', 'Refresh every N seconds (default 5)')
  .action(async (opts: { watch?: string | boolean }) => {
    let logUpdate: any;
    try { logUpdate = require('log-update'); } catch { logUpdate = null; }

    const render = async () => {
      try {
        return await renderDash(workspace, tracker, storyBank);
      } catch (err: any) {
        return brand.error(`\n  Dashboard error: ${err.message}\n`);
      }
    };

    if (opts.watch !== undefined) {
      const interval = typeof opts.watch === 'string' ? parseInt(opts.watch, 10) : 5;
      const refreshMs = (isNaN(interval) || interval < 1 ? 5 : interval) * 1000;

      if (logUpdate) {
        // Use log-update for clean in-place refresh
        const draw = async () => {
          const out = await render();
          logUpdate(out);
        };
        await draw();
        const timer = setInterval(draw, refreshMs);
        process.on('SIGINT', () => {
          clearInterval(timer);
          logUpdate.done();
          console.log(brand.dim('\n  Dashboard closed.\n'));
          process.exit(0);
        });
      } else {
        // Fallback: clear + reprint
        const draw = async () => {
          process.stdout.write('\x1Bc');
          console.log(await render());
        };
        await draw();
        const timer = setInterval(draw, refreshMs);
        process.on('SIGINT', () => {
          clearInterval(timer);
          console.log(brand.dim('\n  Dashboard closed.\n'));
          process.exit(0);
        });
      }
    } else {
      // Single-shot
      console.log(await render());
    }
  });

// ─── ct stories ─────────────────────────────────────────────
const storiesCmd = program.command('stories').description('Interview story bank');

storiesCmd
  .command('list')
  .description('List all stories in the story bank')
  .option('--tag <tag>', 'Filter by tag')
  .option('--job <jobId>', 'Filter by jobId')
  .action(async (opts: { tag?: string; job?: string }) => {
    try {
      let stories;
      if (opts.tag) {
        stories = await storyBank.findByTag(opts.tag);
      } else if (opts.job) {
        stories = await storyBank.findByJob(opts.job);
      } else {
        stories = await storyBank.list();
      }

      if (stories.length === 0) {
        console.log(brand.dim('\n  No stories found. Run "npm run ct -- evaluate <jd>" to seed.\n'));
        return;
      }

      if (Table) {
        const table = new Table({
          head: ['ID', 'Title', 'Confidence', 'Tags', 'Jobs'].map(h => brand.accent(h)),
          chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          style: { head: [], border: ['cyan'] },
        });
        for (const s of stories) {
          const confColor = s.confidenceLevel === 'high' ? brand.success : s.confidenceLevel === 'medium' ? brand.warn : brand.error;
          table.push([
            brand.dim(s.id.slice(0, 8)),
            s.title.slice(0, 35),
            confColor(s.confidenceLevel),
            s.tags.slice(0, 3).join(', '),
            String(s.jobIds.length),
          ]);
        }
        console.log('\n' + table.toString());
      } else {
        for (const s of stories) {
          console.log(`  ${brand.accent(s.id.slice(0, 8))}  ${s.title}  ${brand.dim(s.confidenceLevel)}`);
        }
      }
      console.log(brand.dim(`\n  Total: ${stories.length} · Run "npm run ct -- stories show <id>" to view\n`));
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

storiesCmd
  .command('show <id>')
  .description('Show a full STAR story by ID')
  .action(async (id: string) => {
    try {
      const story = await storyBank.findById(id);
      if (!story) {
        console.log(brand.warn(`\n  Story "${id}" not found. Run "npm run ct -- stories list".\n`));
        return;
      }
      const confColor = story.confidenceLevel === 'high' ? brand.success : story.confidenceLevel === 'medium' ? brand.warn : brand.error;
      const content = [
        `${brand.bold('Title')}       ${story.title}`,
        `${brand.bold('Confidence')} ${confColor(story.confidenceLevel)}`,
        `${brand.bold('Tags')}       ${story.tags.join(', ')}`,
        `${brand.bold('Used for')}   ${story.jobIds.length} job(s)`,
        `${brand.bold('Created')}    ${story.createdAt.slice(0, 10)}`,
        '',
        `${brand.accent('S — Situation')}`,
        `  ${story.situation}`,
        '',
        `${brand.accent('T — Task')}`,
        `  ${story.task}`,
        '',
        `${brand.accent('A — Action')}`,
        `  ${story.action}`,
        '',
        `${brand.accent('R — Result')}`,
        `  ${story.result}`,
      ].join('\n');
      console.log(renderBox(content, `Story · ${story.id.slice(0, 8)}`));
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

// ─── ct stories polish ──────────────────────────────────────
storiesCmd
  .command('polish <id>')
  .description('Polish a story: add reflection, short/long versions, talking points')
  .option('--mock', 'use mock LLM output')
  .action(async (id: string, opts: { mock?: boolean }) => {
    const spinner = ora({ text: brand.dim('Polishing story...'), spinner: 'dots' }).start();
    try {
      const polished = await storyBank.polishStory(id, gateway, { mock: opts.mock });
      if (!polished) {
        spinner.fail(brand.warn(`Story "${id}" not found.`));
        return;
      }
      spinner.succeed(brand.success('Story polished'));
      console.log('');
      console.log(`  ${brand.bold(polished.title)}`);
      console.log(`  Status: ${brand.accent(polished.status)}  ·  Updated: ${polished.updatedAt?.slice(0, 10)}`);
      if (polished.shortVersion) console.log(`\n  ${brand.dim('Short:')} ${polished.shortVersion.slice(0, 120)}`);
      if (polished.reflection)   console.log(`  ${brand.dim('Reflection:')} ${polished.reflection.slice(0, 100)}`);
      if (polished.competencies?.length) console.log(`  ${brand.dim('Competencies:')} ${polished.competencies.join(', ')}`);
      console.log('');
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct stories map ──────────────────────────────────────────
storiesCmd
  .command('map <jobId>')
  .description("Map best stories to a job's requirements")
  .option('--mock', 'use mock LLM output')
  .action(async (jobId: string, opts: { mock?: boolean }) => {
    const spinner = ora({ text: brand.dim('Mapping stories to job...'), spinner: 'dots' }).start();
    try {
      const evalPath = workspace.getPath(`jobs/evaluations/${jobId}.json`);
      if (!(await fs.pathExists(evalPath))) {
        spinner.fail(brand.error(`No evaluation artifact for job ${jobId}.\n  Run: npm run ct -- batch --mock`));
        return;
      }
      const evalRun = await fs.readJson(evalPath);
      const storyMap = await storyBank.mapStoriesToJob(jobId, evalRun, gateway, { mock: opts.mock });
      spinner.succeed(brand.success('Story map created'));
      console.log('');
      console.log(`  ${brand.bold(String(storyMap.mappedStories.length))} stories mapped  ·  ${brand.warn(String(storyMap.gaps.length))} gaps`);
      for (const m of storyMap.mappedStories) {
        console.log(`  ${brand.accent('→')} ${m.requirement.slice(0, 40).padEnd(42)} ${brand.dim(m.storyTitle.slice(0, 35))}  (${Math.round(m.confidence * 100)}%)`);
      }
      if (storyMap.gaps.length > 0) {
        console.log('');
        console.log(`  ${brand.warn('Gaps:')}`);
        for (const g of storyMap.gaps) console.log(`    ${brand.dim('○')} ${g.requirement}`);
      }
      console.log(`\n  Written: .careertwin/jobs/interview/${jobId}/story-map.json\n`);
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct stories export ───────────────────────────────────────
storiesCmd
  .command('export <jobId>')
  .description('Export mapped stories for a job as a markdown document')
  .action(async (jobId: string) => {
    const spinner = ora({ text: brand.dim('Exporting stories...'), spinner: 'dots' }).start();
    try {
      const evalPath = workspace.getPath(`jobs/evaluations/${jobId}.json`);
      if (!(await fs.pathExists(evalPath))) {
        spinner.fail(brand.error(`No evaluation artifact for job ${jobId}.`));
        return;
      }
      const evalRun = await fs.readJson(evalPath);
      const outPath = await storyBank.exportStoriesForJob(jobId, evalRun);
      spinner.succeed(brand.success('Story export written'));
      console.log(`\n  ${brand.dim('File:')} ${outPath}\n`);
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct stories archive ──────────────────────────────────────
storiesCmd
  .command('archive <id>')
  .description('Archive a story (hide from future maps/exports)')
  .action(async (id: string) => {
    try {
      const ok = await storyBank.archiveStory(id);
      if (!ok) { console.log(brand.warn(`\n  Story "${id}" not found.\n`)); return; }
      console.log(brand.success(`\n  Story ${id.slice(0, 8)}... archived.\n`));
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

// ─── ct stories dedupe ───────────────────────────────────────
storiesCmd
  .command('dedupe')
  .description('Remove exact duplicate stories, keeping the polished version')
  .action(async () => {
    const spinner = ora({ text: brand.dim('Deduplicating stories...'), spinner: 'dots' }).start();
    try {
      const result = await storyBank.dedupeStories();
      spinner.succeed(brand.success('Dedupe complete'));
      console.log(`\n  Duplicates removed: ${brand.bold(String(result.removed))}\n`);
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct interview ─────────────────────────────────────────────
const interviewCmd = program
  .command('interview')
  .description('Interview prep pack generation');

interviewCmd
  .command('prep <jobId>')
  .description('Generate a full interview prep pack for a job')
  .option('--mock', 'use mock LLM output')
  .action(async (jobId: string, opts: { mock?: boolean }) => {
    const interview = new InterviewEngine(workspace);
    const spinner = ora({ text: brand.dim('Generating interview prep pack...'), spinner: 'dots' }).start();
    try {
      const result = await interview.generatePrepPack(jobId, gateway, { mock: opts.mock });
      spinner.succeed(brand.success('Interview prep pack created'));
      console.log('');
      console.log(`  ${brand.dim('Location:')} .careertwin/jobs/interview/${jobId}/`);
      console.log('');
      console.log(`  ${brand.bold('Files created:')}`);
      for (const f of result.files) console.log(`    ${brand.accent('✔')} ${f}`);
      if (result.missingOptional.length > 0) {
        console.log('');
        console.log(`  ${brand.warn('Reduced pack')} — missing optional artifacts:`);
        for (const m of result.missingOptional) console.log(`    ${brand.dim('○')} ${m}`);
      }
      console.log('');
      console.log(`  Next: ${brand.dim('npm run ct -- interview questions ' + jobId)}`);
      console.log('');
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

interviewCmd
  .command('questions <jobId>')
  .description('Display likely interview questions by category')
  .action(async (jobId: string) => {
    const interview = new InterviewEngine(workspace);
    try {
      const qFile = await interview.loadQuestions(jobId);
      if (!qFile) {
        console.log(brand.warn(`\n  No questions found. Run: npm run ct -- interview prep ${jobId} --mock\n`));
        return;
      }
      console.log('');
      const categories = ['recruiter','hiring-manager','behavioral','technical','system-design','founder'] as const;
      for (const cat of categories) {
        const qs = qFile.questions.filter(q => q.category === cat);
        if (qs.length === 0) continue;
        console.log(`  ${brand.bold(cat.toUpperCase())}`);
        for (const q of qs) {
          const risk = q.riskLevel === 'high' ? brand.error('●') : q.riskLevel === 'medium' ? brand.warn('●') : brand.dim('●');
          console.log(`  ${risk} ${q.question}`);
          console.log(`    ${brand.dim('Strategy:')} ${q.answerStrategy.slice(0, 100)}`);
        }
        console.log('');
      }
      console.log(`  Total: ${brand.bold(String(qFile.questions.length))} questions\n`);
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

interviewCmd
  .command('checklist <jobId>')
  .description('Show the final prep checklist for a job')
  .action(async (jobId: string) => {
    const interview = new InterviewEngine(workspace);
    try {
      const items = await interview.loadChecklist(jobId);
      if (items.length === 0) {
        console.log(brand.warn(`\n  No checklist found. Run: npm run ct -- interview prep ${jobId} --mock\n`));
        return;
      }
      console.log('');
      console.log(`  ${brand.bold('Interview Prep Checklist')}`);
      console.log('');
      for (const item of items) console.log(`  ${brand.dim('○')} ${item}`);
      console.log('');
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

// ─── Parse ──────────────────────────────────────────────────

const negotiationCmd = program
  .command('negotiation')
  .description('Manage local negotiation prep and scripts');

negotiationCmd
  .command('draft <jobId>')
  .description('Draft a negotiation plan and scripts for a job')
  .option('-m, --mock', 'Use mock local provider')
  .action(async (jobId: string, options: any) => {
    console.log(brand.dim(`\n- Drafting negotiation plan...`));
    const negotiation = new NegotiationEngine(workspace, gateway, tracker);
    try {
      const packet = await negotiation.generateNegotiationPack(jobId, !!options.mock);
      console.log(brand.success(`Negotiation pack created\n`));
      console.log(`  ${brand.bold(packet.title)} at ${brand.bold(packet.company)}`);
      console.log(`  Confidence: ${packet.compensation.confidence}  ·  Review Required: ${packet.manualReviewRequired}`);
      console.log('');
      console.log(`  Artifacts:`);
      console.log(`    ${brand.success('✔')} negotiation-plan.md`);
      console.log(`    ${brand.success('✔')} recruiter-script.md`);
      console.log(`    ${brand.success('✔')} founder-script.md`);
      console.log(`    ${brand.success('✔')} downlevel-response.md`);
      console.log(`    ${brand.success('✔')} tradeoff-matrix.md`);
      console.log(`    ${brand.success('✔')} negotiation-checklist.md`);
      console.log(`    ${brand.success('✔')} compensation-boundaries.json`);
      console.log('');
      console.log(`  Run "npm run ct -- negotiation show ${jobId}" to review.`);
      console.log('');
    } catch (error: any) {
      console.log(brand.error(`\n  ${error.message}\n`));
    }
  });

negotiationCmd
  .command('show <jobId>')
  .description('Show negotiation plan summary')
  .action(async (jobId: string) => {
    const packPath = workspace.getPath(`jobs/negotiation/${jobId}/negotiation-packet.json`);
    const planPath = workspace.getPath(`jobs/negotiation/${jobId}/negotiation-plan.md`);
    if (!require('fs').existsSync(packPath)) {
      console.log(brand.error(`\n  No negotiation pack found for ${jobId}\n`));
      return;
    }
    const packet = require(packPath);
    console.log(`\n  ${brand.bold(packet.title)} at ${brand.bold(packet.company)}`);
    console.log(`  Status: ${packet.status}  ·  Confidence: ${packet.compensation.confidence}  ·  Manual Review: ${packet.manualReviewRequired}`);
    console.log(`\n  Target Base:  ${packet.compensation.targetBase || 'TBD'}`);
    console.log(`  Walk-away:    ${packet.compensation.minimumBase || 'TBD'}`);
    console.log('');
    console.log(`  Optional Artifacts:`);
    console.log(`    Apply Packet:    ${packet.applyPacketPath ? brand.success('✔ present') : brand.warn('○ missing')}`);
    console.log(`    Interview Pack:  ${packet.interviewPackPath ? brand.success('✔ present') : brand.warn('○ missing')}`);
    console.log('');
    console.log(`  See ${planPath} for full details.\n`);
  });

negotiationCmd
  .command('list')
  .description('List all negotiation packs')
  .action(async () => {
    try {
      const p = workspace.getPath('jobs/negotiation');
      if (!require('fs').existsSync(p)) {
        console.log(`\n  No negotiation packs found.\n`);
        return;
      }
      const dirs = require('fs').readdirSync(p);
      console.log('');
      let count = 0;
      for (const d of dirs) {
        const packPath = require('path').join(p, d, 'negotiation-packet.json');
        if (require('fs').existsSync(packPath)) {
          const packet = require(packPath);
          console.log(`  ○  ${brand.bold(packet.title)} at ${brand.bold(packet.company)}  ${brand.dim('[' + d.slice(0, 8) + ']')}`);
          console.log(`     ${brand.dim(packet.status)}  ·  Confidence: ${packet.compensation?.confidence || 'low'}  ·  Walk-away: ${packet.compensation?.minimumBase || 'TBD'}`);
          count++;
        }
      }
      console.log(`\n  Total: ${count}\n`);
    } catch (e: any) {
      console.log(brand.error(`\n  ${e.message}\n`));
    }
  });

negotiationCmd
  .command('boundaries <jobId>')
  .description('Show compensation boundaries')
  .action(async (jobId: string) => {
    const packPath = workspace.getPath(`jobs/negotiation/${jobId}/compensation-boundaries.json`);
    if (!require('fs').existsSync(packPath)) {
      console.log(brand.error(`\n  No boundaries found for ${jobId}\n`));
      return;
    }
    const bounds = require(packPath);
    console.log('');
    console.log(`  ${brand.bold('Compensation Boundaries')}`);
    console.log('');
    console.log(`  Target:        ${bounds.targetBase || 'TBD'}`);
    console.log(`  Minimum:       ${bounds.minimumBase || 'TBD'}`);
    console.log(`  Expected:      ${bounds.expectedRange || 'TBD'}`);
    console.log(`  Market:        ${bounds.marketRange || 'TBD'}`);
    console.log(`  Confidence:    ${bounds.confidence}`);
    console.log(`  Source Notes:  ${bounds.sourceNotes?.join(', ') || 'None'}`);
    console.log(`  Manual Review: ${bounds.manualReviewRequired}`);
    console.log('');
  });

program.parse(process.argv);
