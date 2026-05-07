# Contributing to CTOSS

Thank you for your interest in contributing to the CareerTWiN Candidate OS!

Since CTOSS is currently in Public Alpha, the system architecture and schema contracts are somewhat rigid to ensure determinism and local-first reliability.

## How to Contribute

### 1. Report Issues
If you encounter a bug, please open an issue with:
- OS and Node.js / Go versions.
- Steps to reproduce.
- Relevant command output (redact any PII).

### 2. Propose Features
Before submitting a PR for a major feature, please open an issue to discuss it. We want to ensure it aligns with the [Roadmap](docs/roadmap.md).
- **No Cloud/Live Integrations:** Please do not submit PRs that add cloud databases, automated application submission, or subscription logic.

### 3. Submitting Pull Requests
1. Fork the repository.
2. Create a new branch (`git checkout -b feat/my-new-feature`).
3. Make your changes.
4. Ensure you test your changes (run `npm run build` and `npm run ct -- pipeline health`).
5. Commit your changes (`git commit -m 'Add some feature'`).
6. Push to the branch (`git push origin feat/my-new-feature`).
7. Open a Pull Request.

## Local Development
Please see [docs/development.md](docs/development.md) for instructions on how to set up the repository, build the TypeScript components, run the Go TUI, and use the local mock provider for safe UI/UX iteration.

## Code of Conduct
By participating in this project, you agree to abide by standard open-source conventions of respect and collaboration.
