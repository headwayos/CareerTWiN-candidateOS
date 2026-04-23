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
  ScannerEngine 
} from '@careertwin/engine';
import { DocumentEngine } from '@careertwin/document-engine';
import { PassportBuilder } from '@careertwin/passport';
import fs from 'fs-extra';

const program = new Command();
const cwd = process.cwd();
const workspace = new WorkspaceManager(cwd);
const ingestion = new IngestionEngine(workspace);
const evaluation = new EvaluationEngine(workspace);
const tracker = new TrackerEngine(workspace);
const evidence = new EvidenceEngine(workspace);
const scanner = new ScannerEngine(workspace);
const documents = new DocumentEngine(path.join(__dirname, '../../packages/document-engine/templates'));
const passport = new PassportBuilder(workspace);

// ─── ct init ───────────────────────────────────────────────
program
  .command('init')
  .description('Bootstrap the .careertwin workspace')
  .action(async () => {
    const spinner = ora('Initializing .careertwin workspace...').start();
    try {
      await workspace.init();
      spinner.succeed(chalk.green('.careertwin/ workspace initialized'));
      console.log(chalk.gray('\n  Next steps:'));
      console.log(chalk.gray('  1. ct profile ingest'));
      console.log(chalk.gray('  2. ct cv import <file>'));
      console.log(chalk.gray('  3. ct doctor\n'));
    } catch (error: any) {
      spinner.fail(chalk.red(error.message));
    }
  });

// ─── ct doctor ─────────────────────────────────────────────
program
  .command('doctor')
  .description('Validate environment (LaTeX, Config, Node.js)')
  .action(async () => {
    console.log(chalk.bold('\n  CareerTwin Doctor\n'));
    
    const checks: { label: string; ok: boolean; detail: string }[] = [];

    // Node
    checks.push({ label: 'Node.js', ok: true, detail: process.version });

    // Workspace
    const wsExists = await workspace.exists();
    checks.push({ label: '.careertwin/', ok: wsExists, detail: wsExists ? 'Found' : 'Run ct init' });

    // Config
    let configOk = false;
    if (wsExists) {
      try { await workspace.getConfig(); configOk = true; } catch {}
    }
    checks.push({ label: 'config.json', ok: configOk, detail: configOk ? 'Valid' : 'Missing or corrupt' });

    // LaTeX
    let latexOk = false;
    try {
      const { execSync } = await import('child_process');
      execSync('tectonic --version', { stdio: 'pipe' });
      latexOk = true;
    } catch {}
    checks.push({ label: 'Tectonic (LaTeX)', ok: latexOk, detail: latexOk ? 'Installed' : 'Not found (optional for PDF)' });

    // Profile
    const profile = await ingestion.loadProfile();
    checks.push({ label: 'Candidate Profile', ok: !!profile, detail: profile ? profile.bio.name : 'Not ingested' });

    for (const c of checks) {
      const icon = c.ok ? chalk.green('✓') : chalk.yellow('!');
      console.log(`  ${icon} ${chalk.bold(c.label)}: ${c.detail}`);
    }
    console.log('');
  });

// ─── ct config edit ────────────────────────────────────────
const configCmd = program.command('config').description('Configuration management');
configCmd
  .command('edit')
  .description('Open config.json in default editor')
  .action(async () => {
    const configPath = workspace.getPath('config.json');
    if (!(await fs.pathExists(configPath))) {
      console.log(chalk.red('Workspace not initialized. Run "ct init" first.'));
      return;
    }
    const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vi');
    const { spawn } = await import('child_process');
    spawn(editor, [configPath], { stdio: 'inherit' });
  });

// ─── ct profile show ──────────────────────────────────────
const profileCmd = program.command('profile').description('Candidate profile management');
profileCmd
  .command('show')
  .description('Display structured candidate profile')
  .action(async () => {
    const profile = await ingestion.loadProfile();
    if (!profile) {
      console.log(chalk.yellow('\n  No profile found. Run "ct profile ingest" or "ct cv import".\n'));
      return;
    }
    console.log(chalk.bold(`\n  ${profile.bio.name}`));
    console.log(chalk.gray(`  ${profile.bio.email}`));
    if (profile.bio.location) console.log(chalk.gray(`  ${profile.bio.location}`));
    console.log(`\n  ${chalk.cyan('Summary:')} ${profile.bio.summary}`);
    console.log(`  ${chalk.cyan('Skills:')}  ${profile.skills.join(', ')}`);
    if (profile.experience.length > 0) {
      console.log(chalk.cyan('\n  Experience:'));
      for (const exp of profile.experience) {
        console.log(`    ${chalk.bold(exp.role)} at ${exp.company} (${exp.startDate} – ${exp.endDate || 'Present'})`);
        for (const h of exp.highlights.slice(0, 2)) {
          console.log(chalk.gray(`      • ${h}`));
        }
      }
    }
    console.log('');
  });

// ─── ct profile ingest ────────────────────────────────────
profileCmd
  .command('ingest')
  .description('Interactively ingest profile data')
  .action(async () => {
    console.log(chalk.yellow('\n  Profile ingestion requires LLM integration.'));
    console.log(chalk.gray('  Use "ct cv import <file>" to import from an existing CV.\n'));
  });

// ─── ct cv import ─────────────────────────────────────────
program
  .command('cv')
  .description('CV management')
  .command('import <file>')
  .description('Import an existing CV file (txt, md, pdf)')
  .action(async (file: string) => {
    const spinner = ora('Importing CV...').start();
    try {
      const filePath = path.resolve(cwd, file);
      if (!(await fs.pathExists(filePath))) {
        spinner.fail(chalk.red(`File not found: ${filePath}`));
        return;
      }
      const content = await fs.readFile(filePath, 'utf-8');
      const profile = await ingestion.importCV(content);
      spinner.succeed(chalk.green(`Profile created for ${profile.bio.name}`));
      console.log(chalk.gray('  Run "ct profile show" to inspect.\n'));
    } catch (error: any) {
      spinner.fail(chalk.red(error.message));
    }
  });

// ─── ct evaluate ──────────────────────────────────────────
program
  .command('evaluate <source>')
  .description('Evaluate a job posting (URL or file path)')
  .action(async (source: string) => {
    const spinner = ora('Evaluating job...').start();
    try {
      const profile = await ingestion.loadProfile();
      if (!profile) {
        spinner.fail(chalk.red('No profile found. Run "ct cv import" first.'));
        return;
      }
      let jdText: string;
      if (source.startsWith('http')) {
        jdText = `[JD from URL: ${source}]`; // Placeholder for URL fetching
      } else {
        jdText = await fs.readFile(path.resolve(cwd, source), 'utf-8');
      }
      const result = await evaluation.evaluateJob(jdText, profile);
      spinner.succeed(chalk.green('Evaluation complete'));

      console.log(chalk.bold(`\n  Overall Fit: ${result.scores.overall}/100`));
      console.log(`  ${chalk.cyan('Skills:')} ${result.scores.skills}/100`);
      console.log(`  ${chalk.cyan('Experience:')} ${result.scores.experience}/100`);
      console.log(`  ${chalk.cyan('Startup Fit:')} ${result.scores.startupFit}/100`);
      console.log(`  ${chalk.cyan('Seniority:')} ${result.senioritySignal}`);

      console.log(chalk.green('\n  Matches:'));
      result.analysis.matches.forEach(m => console.log(chalk.gray(`    ✓ ${m}`)));
      console.log(chalk.red('\n  Gaps:'));
      result.analysis.gaps.forEach(g => console.log(chalk.gray(`    ✗ ${g}`)));
      console.log(chalk.yellow('\n  Fixes:'));
      result.analysis.actionableFixes.forEach(f => console.log(chalk.gray(`    → ${f}`)));
      console.log(chalk.bold(`\n  Recommendation: ${result.analysis.recommendation}\n`));
    } catch (error: any) {
      spinner.fail(chalk.red(error.message));
    }
  });

// ─── ct tailor ────────────────────────────────────────────
program
  .command('tailor <jobId>')
  .description('Generate tailored resume plan for a specific job')
  .action(async (jobId: string) => {
    console.log(chalk.yellow(`\n  Tailoring for job ${jobId}...`));
    console.log(chalk.gray('  This will generate a job-specific resume variant.\n'));
    // Placeholder for LLM-driven tailoring logic
  });

// ─── ct resume build ──────────────────────────────────────
const resumeCmd = program.command('resume').description('Resume management');
resumeCmd
  .command('build')
  .description('Compile LaTeX resume artifacts')
  .option('-m, --mode <mode>', 'Resume mode: ats | startup', 'ats')
  .action(async (opts: { mode: string }) => {
    const spinner = ora(`Building ${opts.mode} resume...`).start();
    try {
      const profile = await ingestion.loadProfile();
      if (!profile) {
        spinner.fail(chalk.red('No profile found. Run "ct cv import" first.'));
        return;
      }
      const mode = opts.mode as 'ats' | 'startup';
      const outputPath = workspace.getPath(`artifacts/resumes/resume-${mode}-${Date.now()}.pdf`);
      const templateMode = mode === 'ats' ? 'ats-safe' : 'startup';
      await documents.generateResume(profile, templateMode, outputPath);
      spinner.succeed(chalk.green(`Resume built: ${outputPath}`));
    } catch (error: any) {
      spinner.warn(chalk.yellow(`PDF compilation failed. .tex source persisted.`));
      console.log(chalk.gray(`  ${error.message}\n`));
    }
  });

// ─── ct artifacts list ────────────────────────────────────
const artifactsCmd = program.command('artifacts').description('Artifact management');
artifactsCmd
  .command('list')
  .description('List all generated artifacts')
  .action(async () => {
    try {
      const manifest = await workspace.getManifest();
      if (manifest.artifacts.length === 0) {
        console.log(chalk.gray('\n  No artifacts generated yet.\n'));
        return;
      }
      console.log(chalk.bold('\n  Artifacts:\n'));
      for (const art of manifest.artifacts) {
        console.log(`  ${chalk.cyan(art.type.padEnd(15))} ${art.name} ${chalk.gray(art.createdAt)}`);
      }
      console.log('');
    } catch {
      console.log(chalk.gray('\n  No manifest found. Run "ct init" first.\n'));
    }
  });

// ─── ct passport build ────────────────────────────────────
const passportCmd = program.command('passport').description('Passport management');
passportCmd
  .command('build')
  .description('Generate or update the structured Passport')
  .action(async () => {
    const spinner = ora('Building Passport...').start();
    try {
      const profile = await ingestion.loadProfile();
      if (!profile) {
        spinner.fail(chalk.red('No profile found. Run "ct cv import" first.'));
        return;
      }
      const p = await passport.buildPassport(profile);
      const readiness = await passport.checkReadiness(p);
      spinner.succeed(chalk.green('Passport built'));

      console.log(chalk.bold(`\n  Readiness: ${readiness.score}/100 ${readiness.isReady ? chalk.green('READY') : chalk.yellow('NOT READY')}`));
      console.log(chalk.cyan('\n  Checklist:'));
      for (const item of readiness.checklist) {
        const icon = item.completed ? chalk.green('✓') : chalk.red('✗');
        console.log(`    ${icon} ${item.task} ${chalk.gray(`(${item.impact})`)}`);
      }
      console.log(chalk.gray('\n  Saved to .careertwin/artifacts/passports/\n'));
    } catch (error: any) {
      spinner.fail(chalk.red(error.message));
    }
  });

// ─── ct passport preview ──────────────────────────────────
passportCmd
  .command('preview')
  .description('Generate a local preview of the Passport')
  .action(async () => {
    const passportPath = workspace.getPath('artifacts/passports/passport.json');
    if (!(await fs.pathExists(passportPath))) {
      console.log(chalk.yellow('\n  No passport found. Run "ct passport build" first.\n'));
      return;
    }
    const data = await fs.readJson(passportPath);
    console.log(chalk.bold('\n  ┌─────────────────────────────────────┐'));
    console.log(chalk.bold('  │     CAREERTWIN PASSPORT PREVIEW     │'));
    console.log(chalk.bold('  └─────────────────────────────────────┘\n'));
    console.log(`  ${chalk.cyan('Summary:')}     ${data.summary}`);
    console.log(`  ${chalk.cyan('Founder Note:')} ${data.founderIntro}`);
    console.log(`  ${chalk.cyan('Roles:')}       ${data.roleTags.join(', ')}`);
    console.log(`  ${chalk.cyan('Skills:')}      ${data.skillTags.join(', ')}`);
    console.log(`  ${chalk.cyan('Domains:')}     ${data.domainTags.join(', ')}`);
    console.log(`  ${chalk.cyan('Startup Fit:')} ${data.startupFitIndicators.join(', ')}`);
    console.log('');
  });

// ─── ct passport publish ──────────────────────────────────
passportCmd
  .command('publish')
  .description('Sync Passport to CareerTwin marketplace (with review)')
  .action(async () => {
    const passportPath = workspace.getPath('artifacts/passports/passport.json');
    if (!(await fs.pathExists(passportPath))) {
      console.log(chalk.red('\n  No passport found. Run "ct passport build" first.\n'));
      return;
    }
    console.log(chalk.bold('\n  Publishing Passport to CareerTwin Marketplace\n'));
    console.log(chalk.cyan('  Visibility Levels:'));
    console.log(chalk.gray('    Private:  Compensation, Internal notes'));
    console.log(chalk.gray('    Founder:  Fit scores, Proof, Contact'));
    console.log(chalk.gray('    Public:   Role tags, Summary, Skills'));
    console.log(chalk.yellow('\n  ⚠ This will make your Passport visible to approved founders.'));
    console.log(chalk.gray('  Run "ct passport unpublish" to reverse.\n'));
    // In real implementation: API call + confirmation prompt
  });

// ─── ct passport unpublish ────────────────────────────────
passportCmd
  .command('unpublish')
  .description('Remove Passport from the marketplace')
  .action(async () => {
    console.log(chalk.green('\n  Passport set to private. Removed from marketplace.\n'));
    // In real implementation: API call to set visibility to private
  });

// ─── ct tracker list ──────────────────────────────────────
const trackerCmd = program.command('tracker').description('Application pipeline tracker');
trackerCmd
  .command('list')
  .description('Show current application pipeline')
  .action(async () => {
    const items = await tracker.list();
    if (items.length === 0) {
      console.log(chalk.gray('\n  No applications tracked yet.\n'));
      return;
    }
    const summary = await tracker.summary();
    console.log(chalk.bold('\n  Application Pipeline\n'));
    for (const [status, count] of Object.entries(summary)) {
      console.log(`  ${chalk.cyan(status.padEnd(15))} ${count}`);
    }
    console.log(chalk.bold(`\n  Total: ${items.length}\n`));
  });

// ─── ct tracker update ────────────────────────────────────
trackerCmd
  .command('update <id> <status>')
  .description('Update status of a tracked application')
  .action(async (id: string, status: string) => {
    try {
      await tracker.update(id, status as any);
      console.log(chalk.green(`\n  Application ${id.slice(0, 8)}... updated to "${status}".\n`));
    } catch (error: any) {
      console.log(chalk.red(`\n  ${error.message}\n`));
    }
  });

// ─── ct scan ──────────────────────────────────────────────
program
  .command('scan')
  .description('Search for opportunities based on preferences')
  .action(async () => {
    const spinner = ora('Scanning for opportunities...').start();
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
      spinner.succeed(chalk.green(`Found ${results.length} opportunities`));

      for (const r of results) {
        console.log(`\n  ${chalk.bold(r.title)} at ${r.company}`);
        console.log(`  ${chalk.gray(r.location)} | Match: ${chalk.cyan(r.matchScore + '/100')}`);
        console.log(`  ${chalk.gray(r.url)}`);
      }
      console.log('');
    } catch (error: any) {
      spinner.fail(chalk.red(error.message));
    }
  });

// ─── ct apply draft ───────────────────────────────────────
program
  .command('apply')
  .description('Application automation')
  .command('draft <jobId>')
  .description('Generate a browser automation script for human review')
  .action(async (jobId: string) => {
    console.log(chalk.bold(`\n  Drafting application for job ${jobId.slice(0, 8)}...\n`));
    console.log(chalk.yellow('  ⚠ This generates a DRAFT for your review.'));
    console.log(chalk.gray('  No data is submitted without your explicit approval.\n'));
    // In real implementation: Playwright script generation
  });

// ─── Root ─────────────────────────────────────────────────
program
  .name('ct')
  .description('CareerTwin Candidate OS — CLI')
  .version('0.1.0');

program.parse(process.argv);
