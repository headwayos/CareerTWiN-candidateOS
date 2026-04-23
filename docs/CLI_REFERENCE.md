# CareerTwin Candidate OS: CLI Reference

The `ct` command-line interface is the primary mechanism for interacting with the Candidate OS.

## Environment Initialization

### `ct init`
Initializes a new `.careertwin/` hidden workspace in your current directory. This acts as the local database and filesystem for all your career artifacts.
```bash
$ ct init
✔ .careertwin/ workspace initialized
```

### `ct doctor`
Runs a health check on the Candidate OS, validating your configuration, Node.js version, and LaTeX compiler availability.
```bash
$ ct doctor
  ✓ Node.js: v20.19.4
  ✓ .careertwin/: Found
```

---

## Intelligence & Profiles

### `ct cv import <raw_text_string>`
Invokes the Assistant Adapter (e.g., OpenAI) to parse raw, unstructured CV text into the strictly typed `CandidateProfile` JSON schema.
```bash
$ ct cv import "Full Stack Developer with 5 years experience in..."
✔ Profile parsed and saved to .careertwin/profile/candidate.json
```

### `ct profile show`
Displays the currently active candidate profile JSON payload.
```bash
$ ct profile show
```

### `ct evaluate <job_description>`
Evaluates the currently ingested Candidate Profile against a raw job description using OpenAI Structured Outputs to provide a gap analysis and fit score.
```bash
$ ct evaluate "Looking for a Senior React Engineer..."
✔ Evaluation complete: Fit Score 85%
```

### `ct tailor --mode <domain_pack>`
Dynamically tailors your experience bullets using the STAR methodology (Situation, Task, Action, Result) based on the provided domain mode pack (e.g., `startup`, `backend`, `sre`).
```bash
$ ct tailor --mode startup
✔ Bullets rewritten for maximum founder impact.
```

---

## Document Generation

### `ct resume build --mode <ats|startup>`
Compiles your JSON profile into a high-precision, Tectonic-ready LaTeX document.
```bash
$ ct resume build --mode ats
✔ Resume built: .careertwin/artifacts/resumes/resume-ats-safe-1234.pdf
```

---

## Artifacts & Tracking

### `ct artifacts list`
Lists all artifacts (PDFs, JSON passports, tailored profiles) currently stored in your local OS workspace.
```bash
$ ct artifacts list
```

### `ct tracker add <company> <role>`
Adds a new job application to your local Kanban-style tracker.
```bash
$ ct tracker add "Stripe" "Backend Engineer"
✔ Added Stripe (Backend Engineer) to Tracker.
```

### `ct tracker board`
Displays a summary of your application pipeline directly in the terminal.
```bash
$ ct tracker board
```

---

## Marketplace Publishing

### `ct passport build`
Generates your Decision Packet based on the `PassportSchema`, filtering sensitive data based on Trust Boundaries.
```bash
$ ct passport build
✔ Passport generated at .careertwin/artifacts/passports/passport.json
```

### `ct passport preview`
Previews the metadata and tags of your generated Passport.

### `ct passport publish`
Syncs your local Passport JSON with the live CareerTwin Founder Marketplace via the secure API bridge.

### `ct passport unpublish`
Revokes your Passport from the live marketplace and immediately removes founder visibility.
