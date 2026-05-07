# CTOSS Architecture

CTOSS is fundamentally a local-first system. All components are designed to read from and write to a single source of truth: the `.careertwin/` directory on your local filesystem.

## High-Level Architecture

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
        Connectors[Board Connectors\nGreenhouse/Lever/Remotive]
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

## Core Components

### Interfaces
- **Node.js CLI (`ct`)**: The primary interface for state transitions (scanning, batching, drafting packets).
- **Go TUI (`ct tui`)**: A high-performance BubbleTea-based terminal UI solely responsible for reading the state and facilitating fast, keyboard-driven review workflows. The TUI reads JSON directly and updates `tracker/applications.json`.

### Engines
- **ScanEngine**: Connects to remote job boards via `connectors`, pulls job descriptions, normalizes them into a unified `DiscoveredPosting` schema, and writes them to `.careertwin/jobs/discovered/`.
- **BatchEngine**: Runs a local deduplication pass against the tracker. It then invokes the `ModelGateway` to parse the JD against your `profile.json` to generate a 6-block Evaluation Artifact.
- **ApplyEngine**: Assembles a draft `ApplyPacket`. It extracts cover-letter context and application answers, creating a human-in-the-loop review checklist.
- **PipelineEngine**: The integrity layer. Audits `.careertwin/` for orphan state, duplicates, and missing artifacts.

### Adapters & AI
- **ModelGateway**: An agnostic interface to LLMs. It supports structured JSON output. By default, it looks for `OPENAI_API_KEY`, then `ANTHROPIC_API_KEY`, then `OPENROUTER_API_KEY`. It can also be configured to hit a local LLM via Ollama (`CT_LOCAL_URL`).
- **Connectors**: Adapters for specific job boards (Greenhouse, Lever, Remotive).

## The State Machine
The core pipeline flows through these tracked states:
1. `evaluated`: Output of the Batch Engine.
2. `tailored`: Output of the Apply Draft generation.
3. `ready-to-apply`: Output of Human Review (`ct apply review`).
4. `applied` / `interview` / `offer` / `rejected`: Standard tracker states updated via TUI.

## Future Sync Boundary
Currently, CTOSS is strictly local-first. In future phases, a Sync Engine will be introduced to push local state securely to a cloud database, enabling mobile and web companion apps. At this time, no cloud dependencies exist.
