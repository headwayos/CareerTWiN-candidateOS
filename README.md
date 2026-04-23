# CareerTwin Candidate OS

A developer-first, CLI-native candidate operating system.

Ingest your profile. Structure your artifacts. Evaluate opportunities. Generate ATS-safe LaTeX resumes. Track your pipeline. Build your Passport. Go live into the CareerTwin marketplace.

---

## Quick Start

```bash
# Install dependencies
npm install

# Initialize your workspace
ct init

# Check your environment
ct doctor

# Import your CV
ct cv import path/to/resume.txt

# View your profile
ct profile show

# Evaluate a job
ct evaluate path/to/jd.txt

# Build your resume
ct resume build --mode ats

# Build your Passport
ct passport build

# Preview before publishing
ct passport preview
```

---

## Command Surface

| Command                     | Description                                      |
|-----------------------------|--------------------------------------------------|
| `ct init`                   | Bootstrap the `.careertwin/` workspace            |
| `ct doctor`                 | Validate environment (LaTeX, Config, Node.js)     |
| `ct config edit`            | Open config in default editor                     |
| `ct profile show`           | Display structured candidate profile              |
| `ct profile ingest`         | Interactively ingest profile data                 |
| `ct cv import <file>`       | Import existing CV                                |
| `ct evaluate <url\|file>`   | Run Job Evaluation and Gap Analysis               |
| `ct tailor <job_id>`        | Generate tailored resume content                  |
| `ct resume build`           | Compile LaTeX artifacts (ATS or Startup)          |
| `ct artifacts list`         | List all generated artifacts                      |
| `ct passport build`         | Generate/update the structured Passport           |
| `ct passport preview`       | Local HTML/PDF preview of the Passport            |
| `ct passport publish`       | Sync Passport to CareerTwin marketplace           |
| `ct passport unpublish`     | Remove Passport from marketplace                  |
| `ct tracker list`           | Show current application pipeline                 |
| `ct tracker update <id>`    | Update status of a tracked application            |
| `ct scan`                   | Search for opportunities                          |
| `ct apply draft <job_id>`   | Generate browser automation script for review     |

---

## Architecture

```
CLI / AI-IDE Adapter
        │
        ▼
  CareerTwin Engine
        │
        ├── WorkspaceManager   (.careertwin/ filesystem)
        ├── IngestionEngine    (profile + CV parsing)
        ├── EvaluationEngine   (JD analysis + fit scoring)
        ├── TrackerEngine      (application pipeline)
        ├── EvidenceEngine     (GitHub extraction)
        ├── ScannerEngine      (opportunity discovery)
        ├── DocumentEngine     (LaTeX resume compilation)
        └── PassportBuilder    (marketplace identity)
```

---

## Local Workspace (`.careertwin/`)

```
.careertwin/
├── config.json
├── manifest.json
├── profile/
│   ├── candidate.json
│   ├── preferences.json
│   └── evidence.json
├── artifacts/
│   ├── resumes/
│   ├── passports/
│   ├── reports/
│   └── cover-letters/
├── jobs/
│   ├── postings/
│   └── evaluations/
├── tracker/
│   └── applications.json
├── logs/
└── cache/
```

---

## Domain Mode Packs

Opinionated configurations for different engineering domains:

- **Backend** — System design, API contracts, databases
- **DevOps** — Infrastructure, CI/CD, containers
- **Full Stack** — End-to-end product ownership
- **Frontend** — UI frameworks, accessibility, design systems
- **Data** — Pipelines, warehousing, SQL
- **AI / ML** — Modeling, MLOps, deployment
- **Mobile** — iOS, Android, React Native, Flutter
- **SRE** — Reliability, incident response, SLOs
- **Startup Generalist** — Breadth, shipping speed, product sense

---

## Passport Trust Boundaries

| Level      | Data                                      |
|------------|-------------------------------------------|
| Private    | Compensation, internal notes, raw evidence|
| Founder    | Fit scores, detailed proof, contact info  |
| Public     | Role tags, high-level summary, skills     |

---

## Tech Stack

- **TypeScript** — All packages
- **Zod** — Schema validation
- **Commander** — CLI framework
- **Handlebars** — LaTeX templating
- **Tectonic** — Deterministic LaTeX compilation
- **Next.js + Tailwind** — Web inspector (secondary surface)
- **fs-extra** — Local filesystem operations

---

## License

MIT
