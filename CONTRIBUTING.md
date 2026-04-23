# Contributing to CareerTwin Candidate OS

Welcome to the CareerTwin Candidate OS! We're building a developer-native, CLI-first operating system for managing career artifacts, tracking pipelines, and bridging to the CareerTwin marketplace.

## Open Source Documentation Checklist
To make this project truly OSS-ready, we are incrementally building out the following documentation:

- [ ] **`README.md`** (Completed) - High-level overview, quick start, and architecture.
- [ ] **`CONTRIBUTING.md`** (This file) - Guide for local setup and contributing guidelines.
- [ ] **`CODE_OF_CONDUCT.md`** - Standard community guidelines (e.g., Contributor Covenant).
- [ ] **`.github/ISSUE_TEMPLATE/`** - Bug report and feature request templates.
- [ ] **`.github/PULL_REQUEST_TEMPLATE.md`** - PR submission checklist.
- [ ] **`docs/ARCHITECTURE.md`** - Deep dive into the Engine, Assistant Adapters, and Marketplace Bridge.
- [ ] **`docs/MODE_PACKS.md`** - How to create and tune new Domain Mode Packs for different engineering roles.

## Setting Up Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/careertwin/ctoss.git
   cd ctoss
   ```

2. **Install dependencies:**
   We use `npm workspaces` for monorepo management.
   ```bash
   npm install
   ```

3. **Build all packages:**
   ```bash
   npx tsc -b
   ```

4. **Link the CLI globally (Optional but recommended):**
   ```bash
   cd apps/cli
   npm link
   ```
   *Now you can run `ct` from anywhere.*

5. **Start the Web Inspector:**
   ```bash
   cd apps/web
   npm run dev
   ```

## Project Structure

- **`packages/schemas`**: Zod schemas defining the core data contracts.
- **`packages/engine`**: Core local-first filesystem and business logic (`WorkspaceManager`, `IngestionEngine`, etc).
- **`packages/document-engine`**: Handlebars templating and Tectonic/LaTeX compilation.
- **`packages/adapters`**: Standardized interfaces for connecting AI-IDEs (e.g., Antigravity Adapter).
- **`packages/passport`**: Marketplace readiness evaluation and trust boundary enforcement.
- **`packages/shared`**: Shared resources like Domain Mode Packs.
- **`apps/cli`**: The primary user surface (`commander.js`).
- **`apps/web`**: The secondary Next.js local inspector dashboard.

## Adding a New Domain Mode Pack

Mode packs define how the AI evaluates and tailors a candidate for specific roles.

1. Navigate to `packages/shared/src/modes/index.ts`.
2. Define a new `ModePack` object (e.g., `securityMode`).
3. Include a specialized `scoringRubric`, relevant `keywords`, and targeted `prompts`.
4. Export it in the `allModePacks` array.

## Submitting a Pull Request

1. Fork the repo and create your branch from `main`.
2. Ensure your code passes the typescript compiler: `npx tsc -b`.
3. If you've added new CLI commands, update the `README.md` Command Surface table.
4. Issue a PR with a clear description of the problem solved or feature added.
