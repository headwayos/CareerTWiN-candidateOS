# CareerTWiN Candidate OS (CTOSS)

> **Status:** Public Alpha  
> **Note:** CTOSS is a local-first candidate operating system. There is no live cloud platform, subscription, or web dashboard enabled in this release. Your data stays on your machine.

**CTOSS** is a local-first candidate operating system for selective technical job search. It provides an agency-grade, human-in-the-loop pipeline for ingesting, evaluating, and managing job applications with a strong emphasis on data privacy, determinism, and high-quality AI inference.

## Why CTOSS?
The modern job search is chaotic. Candidates are forced to track applications across messy spreadsheets, juggle multiple resume versions, and rely on opaque employer portals. CTOSS flips this model by providing a local, developer-centric pipeline:
- **Local-First Privacy:** All artifacts (resumes, evaluations, trackers) live as flat files in `.careertwin/`.
- **Model Agnostic:** Bring your own API keys (OpenAI, Anthropic, OpenRouter) or run a local model via Ollama.
- **Human-in-the-loop Automation:** Generates high-quality, targeted drafts that *you* review. No autonomous spam.
- **Developer Workflows:** Includes a powerful CLI (`ct`) and an interactive Terminal UI (TUI).

---

## 🚀 Quickstart: The Canonical Demo Flow

Get started with the full local pipeline in less than 5 minutes. See [docs/quickstart.md](docs/quickstart.md) for details.

1. **Install and Build**
   ```bash
   npm install
   npm run build
   ```

2. **Initialize Workspace & Import CV**
   ```bash
   npm run ct -- init
   npm run ct -- cv import ./path/to/resume.pdf --mock
   npm run ct -- doctor
   ```
   > Profile is saved to `.careertwin/profile/candidate.json` (gitignored).

3. **Discover & Evaluate**
   ```bash
   # Scan a source for jobs
   npm run ct -- scan --source remotive --limit 5
   
   # Batch evaluate the discovered jobs against your profile
   npm run ct -- batch --limit 2
   ```

4. **Manage & Review (TUI)**
   ```bash
   # Launch the interactive Terminal UI
   npm run ct -- tui
   ```

5. **Prepare Application Packet**
   ```bash
   # Generate a draft application packet (cover letter, answers)
   npm run ct -- apply draft <jobId> --mock
   ```

---

## 🔌 Provider Modes

CTOSS supports two operating modes. **You do not need a paid API key to try the demo.**

### Mode A — Real Provider (Recommended for production use)

Set one of the following environment variables before running `batch` or `apply`:

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic (via OpenAI-compatible endpoint)
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenRouter
export OPENROUTER_API_KEY="sk-or-..."

# Local model (Ollama, LM Studio, vLLM, etc.)
export CT_LOCAL_URL="http://localhost:11434/v1"
export CT_MODEL="llama3"
```

Then run normally:
```bash
npm run ct -- batch --limit 2
```

### Mode B — Mock / Demo Mode (For testing and QA)

A lightweight mock OpenAI-compatible server is included in `tools/mock-provider/`. It returns deterministic synthetic responses — useful for demos, CI, and development without consuming API credits.

```bash
# Terminal 1 — start the mock provider
node tools/mock-provider/server.js

# Terminal 2 — use mock mode
export CT_LOCAL_URL="http://localhost:3000/v1"
export CT_MODEL="local-mock-model"
npm run ct -- batch --limit 2
npm run ct -- apply draft <jobId> --mock
```

> **Note:** `--mock` on `apply draft` and `negotiation draft` forces mock LLM responses even without the mock server running. The mock server is only needed for `batch` evaluation.

> **The mock server is a QA/demo tool only. It is not required for, and does not affect, normal product usage with a real provider.**

---

## 🏗 Architecture

CTOSS is built as a TypeScript monorepo with a dedicated Go-based TUI.

```mermaid
flowchart TD
    subgraph Interfaces
        CLI[CT CLI / Node.js]
        TUI[CT TUI / Go]
    end

    subgraph Core Engines
        ScanEngine[Scanner]
        BatchEngine[Evaluation]
        ApplyEngine[Apply / Draft]
        PipelineEngine[Pipeline Integrity]
    end

    subgraph Adapters & AI
        ModelGateway[Model Gateway\nOpenAI/Anthropic/Local]
        Connectors[Board Connectors\nGreenhouse/Lever/etc]
    end

    subgraph Local File System
        DB[(.careertwin/)]
        Tracker[tracker/]
        Evals[jobs/evaluations/]
        ApplyPkgs[jobs/applications/]
        Profile[profile/]
    end

    CLI --> Core Engines
    TUI --> DB
    Core Engines --> ModelGateway
    Core Engines --> Connectors
    Core Engines --> DB
```

Read the full architecture overview in [docs/architecture.md](docs/architecture.md).

---

## 📊 Status / Readiness

| Feature / Phase | Status | Description |
| :--- | :--- | :--- |
| **Phase 1: Report Parity** | ✅ Complete | Deterministic profile ingestion and 6-block JSON evaluation reports. |
| **Phase 2A: Dashboard Summary** | ✅ Complete | CLI tabular views of evaluation bands and scores. |
| **Phase 2B: Full TUI** | ✅ Complete | Interactive Go-based Terminal UI for tracking pipeline state. |
| **Phase 3: Scanner + Batch** | ✅ Complete | Automated board discovery, deduplication, and batch processing. |
| **Phase 4: Apply + Integrity** | ✅ Complete | Draft packet generation, review checklists, and pipeline audits. |
| **Phase 5: Story Bank + Interview + Negotiation** | ✅ Complete | STAR story bank (v2.1), interview prep packs, and local-first negotiation scripts. |
| **Phase 6: Differentiation** | 🔜 Coming | Deep research artifacts and unique value proposition generation. |
| **Phase 7: Cloud / Mobile Sync**| ⏸ Deferred | Future sync boundaries and multi-device platforms. |

---

## 📚 Documentation Directory

- **[Quickstart](docs/quickstart.md):** Canonical demo and setup flow.
- **[Commands Reference](docs/commands.md):** Detailed guide to all `ct` CLI commands.
- **[Architecture](docs/architecture.md):** Deep dive into the engine, TUI, and integration layers.
- **[Local Data Model](docs/local-data-model.md):** Understanding the `.careertwin/` file structure.
- **[Roadmap](docs/roadmap.md):** Our planned progression from local OS to cloud platform.
- **[FAQ](docs/faq.md):** Common questions about providers, local modes, and privacy.
- **[Development Setup](docs/development.md):** Guide for contributors.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to submit issues, features, and PRs.

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
