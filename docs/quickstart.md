# Quickstart: Canonical Demo Flow

Welcome to the CareerTWiN Candidate Operating System (CTOSS). This guide walks you through the canonical public-alpha demo flow. 

By the end of this guide, you will have:
1. Built the local workspace.
2. Discovered jobs from a live job board.
3. Batch evaluated those jobs against a synthetic profile.
4. Reviewed your pipeline in the Terminal UI.
5. Generated a draft application packet.

## Prerequisites
- Node.js (v20+)
- Go (v1.21+) for the TUI
- An AI Provider API Key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or a local provider URL).

## Step 1: Install & Build
Clone the repository and build the TypeScript packages.
```bash
npm install
npm run build
```

## Step 2: Initialize Workspace
The `init` command scaffolds the `.careertwin/` local database directory.
```bash
npm run ct -- init
```

## Step 2.5: Import CV (Profile Setup)
Import your existing CV (PDF or text) to create your structured candidate profile. This profile is stored locally in `.careertwin/profile/candidate.json`.
```bash
# Replace with the path to your actual resume
npm run ct -- cv import ./path/to/resume.pdf --mock
```
> **Note:** The `--mock` flag allows you to parse the CV without a live AI provider for this demo. The generated profile stays on your machine and is ignored by git.

## Step 3: Check System Health
Run the doctor command to ensure your workspace is valid and your profile is loaded.
```bash
npm run ct -- doctor
```
> **Note:** If you do not have an API key configured, you can append `--mock` to evaluation commands to bypass live LLM inference.

## Step 4: Discover Postings
Use the scanner to find jobs on an external board (e.g., Remotive). This will download postings into your local database.
```bash
npm run ct -- scan --source remotive --limit 5
```

## Step 5: Batch Evaluate
Evaluate the newly discovered jobs against the candidate profile. This generates rich 6-block JSON artifacts in `.careertwin/jobs/evaluations/`.
```bash
npm run ct -- batch --limit 2
```
*(If you are testing without an API key, use `npm run ct -- batch --limit 2 --mock`)*

## Step 6: Interactive TUI
Launch the full-screen Terminal UI to review the evaluation results.
```bash
npm run ct -- tui
```
- Use `j`/`k` or arrows to navigate.
- Press `Tab` to cycle through pipeline statuses.
- Press `Enter` to view the details of a specific job.
- Press `s` to change a job's status.
- Press `q` to quit.

## Step 7: Apply Draft Generation
Select a `jobId` from the evaluations folder or the TUI, and generate a draft application packet. This creates a human-in-the-loop review checklist and generated answers.
```bash
# Example: replace <jobId> with a real UUID from your .careertwin/jobs/evaluations/ directory
npm run ct -- apply draft <jobId> --mock
```

You can then review the packet contents inside `.careertwin/jobs/applications/<jobId>/`.

## Next Steps
- Read the [Commands Reference](commands.md) to explore the rest of the CLI.
- Learn about the [Local Data Model](local-data-model.md) powering the engine.
- Understand the [Architecture](architecture.md).
