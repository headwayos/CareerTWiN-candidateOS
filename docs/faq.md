# Frequently Asked Questions

## Is my data sent to the cloud?
No. CTOSS is entirely local-first. All data—including your resume, evaluations, tracked applications, and cover letters—resides as flat JSON and Markdown files inside the `.careertwin/` directory on your local machine.

The only time data leaves your machine is when the `ModelGateway` sends your profile and job descriptions to your configured LLM provider (OpenAI, Anthropic, OpenRouter).

## How do I configure my LLM Provider?
CTOSS is provider-agnostic. You configure it via environment variables:

- **OpenAI:** `export OPENAI_API_KEY="sk-..."` (Defaults to `gpt-4o`)
- **Anthropic:** `export ANTHROPIC_API_KEY="sk-..."` (Defaults to `claude-3-5-sonnet-20241022`)
- **OpenRouter:** `export OPENROUTER_API_KEY="sk-or-..."`
- **Local (Ollama):** `export CT_LOCAL_URL="http://localhost:11434/v1"`

You can override the model for any provider using `export CT_MODEL="your-preferred-model"`.

## Does CTOSS auto-submit job applications?
**No.** We believe in high-quality, targeted applications over volume spam. CTOSS discovers jobs, evaluates them, and drafts the necessary application packet (cover letter, structured answers). It then presents these to you for human-in-the-loop review. Submitting the application to the employer portal is currently a manual action.

## Why is the TUI written in Go?
While the core evaluation and orchestration engines are written in TypeScript/Node.js, we chose Go (specifically the BubbleTea framework) for the Terminal UI. Go provides exceptional performance, raw terminal rendering speeds, and zero cold-start latency. The TUI simply reads and writes the local JSON files produced by the TypeScript engine.

## Can I run CTOSS without paying for an API key?
Yes. 
1. You can run completely offline by pointing the gateway to a local Ollama instance (`CT_LOCAL_URL`).
2. Alternatively, for development and testing, you can pass the `--mock` flag to commands like `batch` and `apply draft`. This bypasses live inference and returns static, safe mock data for UI testing.

## Is there a web dashboard?
Not yet. The current system relies strictly on the CLI (`ct`) and the TUI (`ct tui`). Web and mobile dashboards are planned for Phase 7 (see [Roadmap](roadmap.md)).
