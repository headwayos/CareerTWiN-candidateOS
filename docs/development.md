# Development Setup

CTOSS is built as a Turborepo managing a collection of TypeScript packages and a Go application.

## Prerequisites
- Node.js (v20+)
- Go (v1.21+)

## Repository Structure
- `apps/cli/`: Node.js entrypoint for the `ct` command.
- `apps/tui/`: Go source code for the Terminal UI (`ct tui`).
- `packages/engine/`: Core logic (scanning, batching, applying).
- `packages/schemas/`: Centralized Zod and TypeScript schemas.
- `tools/mock-provider/`: A local HTTP server that mimics the OpenAI API format for offline UI/UX testing.

## Building the TypeScript Code
```bash
# Install all dependencies across the monorepo
npm install

# Build all packages and CLI
npm run build
```

## Running the CLI Locally
You can run the CLI directly from the source during development:
```bash
npm run ct -- doctor
```

## Working on the Go TUI
The TUI is invoked by the Node CLI via a child process, but during development, you can run it directly using Go:
```bash
cd apps/tui

# Build the binary
go build -o tui main.go

# Run it directly (assumes you are in a directory containing .careertwin/)
./tui
```

## Testing with the Mock Provider
To avoid burning live API credits while working on UI/UX changes, you can start the mock provider:

```bash
# Terminal 1: Start the mock server
node tools/mock-provider/server.js
# Runs on port 3000
```

```bash
# Terminal 2: Run commands pointing to local server
export CT_LOCAL_URL="http://localhost:3000/v1"
export CT_MODEL="local-mock-model"

npm run ct -- batch --limit 2
npm run ct -- apply draft <jobId>
```
