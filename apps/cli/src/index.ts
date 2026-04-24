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
  TailorEngine
} from '@careertwin/engine';
import { DocumentEngine } from '@careertwin/document-engine';
import { PassportBuilder } from '@careertwin/passport';
import fs from 'fs-extra';

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
      const content: string | Buffer = await fs.readFile(filePath);

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
        notes: [{ date: new Date().toISOString(), content: `Initial evaluation: Overall score ${result.scores.overall}/100` }],
      } as any);

      // Score table
      if (Table) {
        const table = new Table({
          head: ['Metric', 'Score'].map(h => brand.accent(h)),
          chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          style: { head: [], border: ['cyan'] },
        });
        table.push(
          ['Overall', `${result.scores.overall}/100`],
          ['Skills', `${result.scores.skills}/100`],
          ['Experience', `${result.scores.experience}/100`],
          ['Startup Fit', `${result.scores.startupFit}/100`],
          ['Seniority', result.senioritySignal],
        );
        console.log('\n' + table.toString());
      } else {
        console.log(`\n  ${brand.accent('Overall:')} ${result.scores.overall}/100`);
      }

      // Analysis
      const analysis = [
        brand.success('Matches:'),
        ...result.analysis.matches.map((m: string) => `  ${brand.success('✓')} ${brand.dim(m)}`),
        '',
        brand.error('Gaps:'),
        ...result.analysis.gaps.map((g: string) => `  ${brand.error('✗')} ${brand.dim(g)}`),
        '',
        brand.warn('Fixes:'),
        ...result.analysis.actionableFixes.map((f: string) => `  ${brand.accent('→')} ${brand.dim(f)}`),
        '',
        `${brand.accent('Recommendation:')} ${result.analysis.recommendation}`,
      ].join('\n');

      console.log(renderBox(analysis, 'Gap Analysis'));
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
  .description('Search for opportunities based on preferences')
  .action(async () => {
    const spinner = ora({ text: brand.dim('Scanning for opportunities...'), spinner: 'dots' }).start();
    try {
      const prefsPath = workspace.getPath('profile/preferences.json');
      let prefs;
      if (await fs.pathExists(prefsPath)) {
        prefs = await fs.readJson(prefsPath);
      } else {
        prefs = { roles: ['Software Engineer'], stack: { primary: ['TypeScript'] }, remote: 'any' };
      }
      const filters = await scanner.buildFilters(prefs);
      const results = await scanner.scan(filters);
      spinner.succeed(brand.success(`Found ${results.length} opportunities`));

      for (const r of results) {
        console.log(`\n  ${brand.bold(r.title)} at ${r.company}`);
        console.log(`  ${brand.dim(r.location)} | Match: ${brand.accent(r.matchScore + '/100')}`);
        console.log(`  ${brand.dim(r.url)}`);
      }
      console.log('');
    } catch (error: any) {
      spinner.fail(brand.error(error.message));
    }
  });

// ─── ct apply draft ─────────────────────────────────────────
program
  .command('apply')
  .description('Application automation')
  .command('draft <jobId>')
  .description('Generate a browser automation script for human review')
  .action(async (jobId: string) => {
    console.log(renderBox(
      `${brand.accent('Job')}  ${jobId.slice(0, 8)}...\n\n` +
      `${brand.warn('This generates a DRAFT for your review.')}\n` +
      `${brand.dim('No data is submitted without your explicit approval.')}`,
      'Apply Draft'
    ));
  });

// ─── Parse ──────────────────────────────────────────────────
program.parse(process.argv);
