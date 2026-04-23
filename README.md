# CareerTwin Candidate OS

CareerTwin Candidate OS is a local-first, developer-native operating system for managing career artifacts, tracking job applications, and publishing decision packets to the CareerTwin founder marketplace. 

Built as a strict CLI-first ecosystem, your data lives securely on your local file system within the `.careertwin/` directory.

> **Note:** The Web UI (`apps/web`) is strictly a secondary, read-only inspector and onboarding surface. The CLI and local filesystem remain the primary product foundation.

## 🚀 Quick Start & Smoke Test

Get the Candidate OS running on your machine and run your first smoke test in under 2 minutes.

### 1. Installation & Build

```bash
# Clone the repository
git clone https://github.com/headwayos/CareerTWiN-candidateOS.git
cd CareerTWiN-candidateOS

# Install monorepo dependencies
npm install

# Build all workspaces in dependency order
npm run build --workspaces --if-present

# Link the CLI globally so you can use the 'ct' command anywhere
cd apps/cli
npm link
cd ../..
```

### 2. First-Run Smoke Test

Now that the CLI is linked, initialize your first Candidate OS environment and check its health.

```bash
# Initialize the local OS environment (creates .careertwin/)
ct init

# Run the system doctor to verify environment health
ct doctor
```

If everything is set up correctly, `ct doctor` will output green checks for Node.js, the `.careertwin/` directory, and your configuration file.

---

## 🛠 Troubleshooting

**Error: `zsh: command not found: ct`**
* **Cause**: The `npm link` step did not place the executable in your system's PATH.
* **Fix**: Ensure your npm global bin directory is in your PATH (`export PATH="$(npm config get prefix)/bin:$PATH"`), or run the CLI via `npx ct` from the project root. Alternatively, re-run `chmod +x apps/cli/dist/index.js` followed by `npm link` inside the `apps/cli` directory.

**Error: `Cannot find module '@careertwin/engine'`**
* **Cause**: Workspaces were not built in the correct dependency order.
* **Fix**: Ensure you run `npm run build --workspaces --if-present` from the monorepo root to populate the `dist/` directories of all internal packages.

**Error: `MISSING_API_KEY` during evaluation**
* **Cause**: You are attempting to run an OpenAI-powered command (`ct evaluate`, `ct tailor`, `ct cv import`) without configuring your API key.
* **Fix**: Provide your OpenAI key via the environment (`export OPENAI_API_KEY="sk-..."`) or configure it permanently in `.careertwin/config.json`.

---

## 🤖 Assistant Adapters

The Candidate OS is designed to be operated autonomously by AI IDEs. 
The current primary integration is the **Antigravity Adapter**, which uses OpenAI Structured Outputs to strictly enforce our Zod schemas during ingestion and tailoring.

Other AI IDEs, such as **Claude Code**, can operate the system via the CLI immediately and can be seamlessly upgraded to native adapters using the shared `AssistantAdapter` Contract.

## 📚 Documentation Reference

- **[CLI Reference](docs/CLI_REFERENCE.md)**: Full command list and examples.
- **[Passport Trust Boundaries](docs/PASSPORT.md)**: Details on the Decision Packet and data visibility.
- **[Contributing Guide](CONTRIBUTING.md)**: OSS guidelines and setup instructions.
