# CTOSS CLI Commands Reference

The CareerTWiN OS is driven primarily through the `ct` command-line interface.

## Global Commands

### `ct init`
Initializes a new local workspace in the current directory (`.careertwin/`).
- Generates the base folder structure.
- Creates the `portals.yml` template.

### `ct doctor`
Runs a health check on the current workspace.
- Validates the presence of required directories.
- Checks if `profile/candidate.json` is present (your candidate profile).
- Checks the configured AI provider credentials (OpenAI, Anthropic, OpenRouter, Local).

## Ingestion & Passports

### `ct cv import <path-to-pdf>`
Ingests a candidate resume (PDF or text file) and converts it into the structured `profile/candidate.json` format.
**Options:**
- `--mock`: Create a demo profile without a live AI provider.

### `ct passport verify`
Validates the candidate's profile completeness against the `PassportReadinessSchema`. Ensures required fields (bio, skills, experience) are present before allowing evaluations.

## Discovery & Evaluation

### `ct scan`
Scans configured remote job boards and normalizes postings into the `.careertwin/jobs/discovered/` directory.
**Options:**
- `--source <name>`: Specific connector to run (e.g., `remotive`, `greenhouse`).
- `--limit <n>`: Maximum number of jobs to fetch.

### `ct batch`
Processes discovered postings, running them through the deduplication engine and evaluating them against the candidate profile using the `ModelGateway`.
**Options:**
- `--limit <n>`: Maximum number of jobs to process.
- `--mock`: Use mock fallback responses instead of live LLM inference.

## Application Workflow

### `ct apply draft <jobId>`
Generates a draft application packet (cover letter, answers schema, review checklist) based on the evaluation artifact and the candidate profile. Sets packet status to `draft` and tracker status to `tailored`.
**Options:**
- `--mock`: Use mock LLM output for cover letter generation.

### `ct apply list`
Lists all active application packets and their review status.

### `ct apply review <jobId>`
Marks an application packet as reviewed by a human. Promotes the tracker status to `ready-to-apply`.
**Options:**
- `--notes <text>`: Add review notes to the packet metadata.

## Tracking & Integrity

### `ct tui`
Launches the full-screen interactive Terminal UI (written in Go) for managing the application pipeline.

### `ct pipeline health`
Runs a pipeline integrity check across the entire `.careertwin/` directory.
- Detects orphaned evaluations without tracker entries.
- Detects stale discovered postings.
- Verifies apply packet integrity.

### `ct pipeline fix`
Auto-repairs safe pipeline issues detected by `health` (e.g., creating tracker entries for orphan evaluations, deduplicating broken state).

### `ct pipeline stats`
Provides a summary table of the entire tracker state, highest-scoring matches, and most recently evaluated roles.
