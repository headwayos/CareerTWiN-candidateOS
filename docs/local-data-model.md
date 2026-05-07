# CTOSS Local Data Model

CTOSS operates purely on local flat files. By avoiding a heavy SQL or NoSQL database daemon, the system remains portable, perfectly versionable, and highly transparent. 

All data resides in your initialized workspace folder: `.careertwin/`.

## Directory Layout

```text
.careertwin/
├── artifacts/
│   └── passports/
│       ├── passport.json        # Compiled candidate passport
│       ├── publish-state.json   # Export/publish tracking
│       └── readiness.json       # Completeness audit output
├── config/
│   └── portals.yml              # Scanner target configuration
├── jobs/
│   ├── applications/            # Generated Apply Packets
│   │   └── <jobId>/
│   │       ├── answers.json
│   │       ├── cover-letter.md
│   │       ├── packet.json      # Metadata tracking artifact links
│   │       └── review-checklist.md
│   ├── discovered/              # Raw output from ScanEngine
│   │   └── <date>-<id>.json
│   └── evaluations/             # 6-block JSON reports from BatchEngine
│       └── <jobId>.json
├── profile/
│   ├── profile.json             # Core candidate identity and experience
│   ├── source-cv.pdf            # Original ingested PDF
│   └── story-bank.json          # Interview preparation STAR stories
└── tracker/
    └── applications.json        # Global pipeline state (read by TUI)
```

## Key Artifacts

### 1. Profile (`profile/profile.json`)
The immutable source of truth for your professional identity. Extracted via `ct ingest` from your PDF resume. Used by the `BatchEngine` to perform job compatibility evaluations.

### 2. Discovered Posting (`jobs/discovered/*.json`)
A normalized representation of a remote job description. Contains the canonical URL, source, and raw markdown of the job description.

### 3. Evaluation Artifact (`jobs/evaluations/<jobId>.json`)
The core intelligence unit. A rich 6-block JSON schema containing:
- **Block A**: Role Summary
- **Block B**: CV Match (Strengths, Gaps, Risks)
- **Block C**: Leveling Strategy
- **Block D**: Compensation Demand
- **Block E**: Personalization Plan (Resume tailoring hints)
- **Block F**: Interview Preparation

### 4. Tracker Database (`tracker/applications.json`)
A simple array of `TrackerEntry` objects. This file is the single source of truth for the pipeline status (e.g., `evaluated`, `tailored`, `interview`, `rejected`). This is what the Go TUI reads and writes to.

### 5. Apply Packet (`jobs/applications/<jobId>/packet.json`)
A strict reference artifact tying together the evaluation output, the tracker entry, and the human-reviewed artifacts (cover letters and answers).
