# CareerTwin Candidate OS: CLI Reference

The `ct` command-line interface is the primary mechanism for interacting with the Candidate OS.

All commands are invoked via `npm run ct -- <command>` from the repo root.

---

## Environment & Setup

### `ct init`
Scaffolds the `.careertwin/` workspace directory with config, profile, artifacts, tracker, and cache subdirectories.
```bash
$ npm run ct -- init
✔ .careertwin/ workspace initialized
```
Idempotent — safe to run multiple times. Existing data is preserved.

### `ct doctor`
Validates environment health: Node.js, workspace, writable permissions, provider readiness, Tectonic, and profile status.
```bash
$ npm run ct -- doctor
```
Provider readiness checks are generic — supports OpenAI, Anthropic, OpenRouter, and local endpoints.

### `ct --version`
Prints the current CLI version. Use this to confirm you are running the built binary, not a stale global install.
```bash
$ npm run ct -- --version
0.1.0
```

### `ct config edit`
Opens `.careertwin/config.json` in your default `$EDITOR`.
```bash
$ npm run ct -- config edit
```

---

## Intelligence & Profiles

### `ct cv import <file>`
Reads a text file and sends it to the configured provider for structured parsing into a `CandidateProfile`.
```bash
# Live mode (requires provider)
$ npm run ct -- cv import my-resume.txt

# Demo mode (no provider needed)
$ npm run ct -- cv import my-resume.txt --mock
```
The `--mock` flag generates a clearly labeled demo profile. Without `--mock`, a missing provider will fail loudly with setup instructions.

### `ct profile show`
Displays the active candidate profile with name, skills, summary, and experience.
```bash
$ npm run ct -- profile show
```

### `ct profile ingest`
Prints instructions for importing a profile. Directs to `ct cv import`.

---

## Evaluation & Tailoring

### `ct evaluate <source>`
Evaluates the active profile against a job description (file path or URL).
```bash
# Live evaluation
$ npm run ct -- evaluate job-description.txt

# Demo mode
$ npm run ct -- evaluate job-description.txt --mock
```
Outputs a score table (Overall, Skills, Experience, Startup Fit) and a detailed gap analysis.

### `ct tailor <jobId>`
Rewrites resume bullets using the STAR methodology for a specific job. Requires a configured provider.
```bash
$ npm run ct -- tailor abc123
```

---

## Document Engine

### `ct resume build`
Compiles the active profile into a LaTeX document using ATS-safe or startup templates.
```bash
$ npm run ct -- resume build --mode ats
$ npm run ct -- resume build --mode startup
```
If Tectonic is installed, a PDF is compiled. If not, the `.tex` source is preserved and the error message is actionable.

---

## Artifacts & Tracking

### `ct artifacts list`
Lists all generated artifacts (PDFs, passports, reports) from the manifest.
```bash
$ npm run ct -- artifacts list
```

### `ct tracker list`
Displays the application pipeline as a compact table.
```bash
$ npm run ct -- tracker list
```

### `ct tracker update <id> <status>`
Updates the status of a tracked application.
```bash
$ npm run ct -- tracker update abc123 "interview"
```

---

## Passport & Marketplace

### `ct passport build`
Generates the Decision Packet and computes a readiness score.
```bash
$ npm run ct -- passport build
```

### `ct passport preview`
Shows the passport with trust-boundary visibility grouping (Public / Founder / Private).
```bash
$ npm run ct -- passport preview
```

### `ct passport publish`
Publishes the passport to the CareerTwin marketplace. Only fields within the Public and Founder trust boundaries are sent. Private data stays local.
```bash
$ npm run ct -- passport publish
$ npm run ct -- passport publish --confirm
```
Persists publish state to `.careertwin/artifacts/passports/publish-state.json`.

### `ct passport unpublish`
Revokes marketplace visibility immediately. Local data remains intact.
```bash
$ npm run ct -- passport unpublish
```

---

## Scanning & Automation

### `ct scan`
Searches for matching opportunities based on profile preferences.
```bash
$ npm run ct -- scan
```

### `ct apply draft <jobId>`
Generates a browser automation draft for human review. No data is submitted without explicit approval.
```bash
$ npm run ct -- apply draft abc123
```

---

## Provider Configuration

The Candidate OS uses a generic `ModelGateway` that auto-detects providers from environment variables:

| Provider | Environment Variable | Default Model |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| OpenRouter | `OPENROUTER_API_KEY` | `openai/gpt-4o` |
| Local (Ollama/LM Studio) | `CT_LOCAL_URL` | `llama3` |

Override the model with `CT_MODEL`:
```bash
export CT_MODEL="gpt-4o-mini"
```

For local endpoints:
```bash
export CT_LOCAL_URL="http://localhost:11434/v1"
export CT_LOCAL_API_KEY="local"   # optional
export CT_MODEL="llama3"
```

---

## LaTeX / Tectonic Setup

Install Tectonic for PDF compilation from `.tex` sources:

```bash
# macOS
brew install tectonic

# Linux
curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh

# Verify
tectonic --version
```

If Tectonic is not installed, `ct resume build` will still generate the `.tex` source file. Only the PDF compilation step is skipped, and the error message tells you exactly how to install it.
