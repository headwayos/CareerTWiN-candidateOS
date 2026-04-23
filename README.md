# CareerTwin Candidate OS

A local-first, CLI-native operating system for managing career artifacts, evaluating job postings, and publishing decision packets to the CareerTwin founder marketplace.

Your data lives on your filesystem in `.careertwin/`. The Web UI is a secondary inspector. The CLI is the product.

---

## Repository Development Setup

These instructions are for developers cloning and building the monorepo.

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10

### Clone & Build

```bash
git clone https://github.com/headwayos/CareerTWiN-candidateOS.git
cd CareerTWiN-candidateOS

# Install all workspace dependencies
npm install

# Build every workspace in dependency order
for pkg in packages/schemas packages/engine packages/document-engine packages/passport packages/shared packages/adapters apps/cli; do
  echo "Building $pkg..." && (cd $pkg && npm run build)
done
```

### Verify the Build

```bash
# This is the deterministic local execution path.
# It runs the CLI from the built dist/ — no npm link, no stale global binary.
npm run ct -- --version
# → 0.1.0
```

---

## Candidate OS Usage

Once the repo is built, every `ct` command is invoked via `npm run ct -- <command>` from the repo root.

### First-Run Smoke Test

```bash
# 1. Initialize the local OS
npm run ct -- init

# 2. Check environment health and provider readiness
npm run ct -- doctor

# 3. Import a resume (requires OPENAI_API_KEY for live parsing)
npm run ct -- cv import my-resume.txt

# 4. Or use demo mode without a provider
npm run ct -- cv import my-resume.txt --mock

# 5. View your profile
npm run ct -- profile show
```

### Provider Configuration

The Candidate OS uses a generic `ModelGateway` that supports any OpenAI-compatible provider.

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Then run AI-dependent commands
npm run ct -- cv import my-resume.txt
npm run ct -- evaluate job-description.txt
```

If no provider is configured, AI commands will fail loudly with setup instructions. You can always use `--mock` to test without a provider.

### Optional: LaTeX Resume Compilation

Install [Tectonic](https://tectonic-typesetting.github.io/) for PDF compilation:

```bash
# macOS
brew install tectonic

# Then build a resume
npm run ct -- resume build --mode ats
```

If Tectonic is not installed, the `.tex` source will still be generated; only PDF compilation is skipped.

---

## Troubleshooting

**`npm run ct` says "Missing script"**
→ You are not in the repo root, or `package.json` is missing the `ct` script. Run from the cloned directory.

**`Cannot find module '@careertwin/engine'`**
→ Workspaces were not built. Run the full build loop above.

**`Provider (openai) Not configured` in `ct doctor`**
→ Set `export OPENAI_API_KEY="sk-..."` or run with `--mock`.

**`ct cv import` creates `[DEMO] Mock User`**
→ You used the `--mock` flag. Remove it and configure a provider for real parsing.

---

## Assistant Adapters

The OS is designed to be operated by AI IDEs autonomously.

- **Primary**: The **Antigravity Adapter** wraps the Engine as a thin operator surface.
- **Immediate**: **Claude Code**, **Trae**, or any terminal-capable AI can operate the system via `ct` commands directly.
- **Extensible**: New adapters implement the shared `AssistantAdapter` contract — they do not contain inference logic, which lives in the Engine's `ModelGateway`.

---

## Documentation

- **[CLI Reference](docs/CLI_REFERENCE.md)** — Full command list with examples
- **[Passport & Trust Boundaries](docs/PASSPORT.md)** — Data visibility and marketplace behavior
- **[Contributing](CONTRIBUTING.md)** — OSS setup and guidelines
