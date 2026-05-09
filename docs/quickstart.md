# Quickstart: Candidate OS

Welcome to the CareerTWiN Candidate Operating System (CTOSS). This guide walks you through the primary user flow. 

By the end of this guide, you will have:
1. Built the local workspace.
2. Imported your real CV.
3. Discovered jobs from a live job board.
4. Batch evaluated those jobs using a local LLM.
5. Reviewed your pipeline in the Terminal UI.

## Prerequisites
- Node.js (v20+)
- Go (v1.21+) for the TUI
- An AI Provider API Key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) OR a local Ollama instance running.

## Local Model Guidance (Ollama)
For local-first operation, we strongly recommend:
- **`llama3:8b`**: Excellent for fast, reliable CV parsing and general extraction.
- **`gpt-oss:20b` (or similar larger models)**: Recommended for the heavy lifting of the `batch` evaluation step to ensure high-fidelity 6-block JSON generation.

To use local models, ensure Ollama is running and update your `.careertwin/config/models.yml` accordingly.

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

## Step 3: Import Real CV (Profile Setup)
Import your existing CV (PDF or text) to create your structured candidate profile.
```bash
# Replace with the path to your actual resume
npm run ct -- cv import ./path/to/resume.pdf
```
> **Note:** The generated profile stays securely on your local machine in `.careertwin/profile/candidate.json`.

## Step 4: Check System Health
Run the doctor command to ensure your workspace is valid and your profile is loaded.
```bash
npm run ct -- doctor
```

## Step 5: Discover Postings
Use the scanner to find jobs on an external board (e.g., Hacker News, Remotive).
```bash
npm run ct -- scan --source hackernews --limit 5
```

## Step 6: Batch Evaluate
Evaluate the newly discovered jobs against your profile. This generates rich 6-block JSON artifacts in `.careertwin/jobs/evaluations/`.
```bash
npm run ct -- batch --limit 2
```

## Step 7: Interactive TUI
Launch the full-screen Terminal UI to review the evaluation results.
```bash
npm run ct -- tui
```
- Use `j`/`k` or arrows to navigate.
- Press `Tab` to cycle through pipeline statuses.
- Press `Enter` to view the details of a specific job.
- Press `u` to change a job's status.
- Press `q` to quit.

---

## 🧪 Synthetic Demo Workspace

If you want to test the OS without using your real CV or calling an LLM, you can seed a synthetic demo workspace:

```bash
# Safely generates a fake profile, jobs, evaluations, and tracker data
npm run ct -- demo seed
```
> **Warning:** To prevent accidental data loss, this command will fail if you already have real data in your workspace. Use `--force` to overwrite.

Once seeded, you can test the TUI or downstream commands:
```bash
# View the mock data in the TUI
npm run ct -- tui

# Generate a mock application packet using the fake data
npm run ct -- apply draft <demo-job-id> --mock
```

## Next Steps
- Read the [Commands Reference](commands.md) to explore the rest of the CLI.
- Learn about the [Local Data Model](local-data-model.md) powering the engine.
