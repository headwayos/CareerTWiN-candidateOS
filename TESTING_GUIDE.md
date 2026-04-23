# End-to-End Testing Guide

This guide allows you to test the full CareerTwin Candidate OS pipeline locally.

## Setup Instructions

Open your terminal and run the following commands to initialize the OS and link the CLI:

```bash
# 1. Ensure you are in the project root
cd /Users/darshilparmar/Downloads/CTOSS

# 2. Build the project
npx tsc -b

# 3. Link the CLI globally so you can run `ct` anywhere
cd apps/cli
npm link
cd ../..

# 4. Initialize your local workspace
ct init
```

---

## AI Assistant Prompt for Live Testing

Open a **separate AI window** (e.g., Claude, ChatGPT, or a new Antigravity session). You will act as the "AI-IDE" communicating with the local engine. 

**Copy and paste the entire prompt below into the new AI window:**

> **System Context:**
> You are the AI Assistant operating the CareerTwin Candidate OS. Your job is to simulate the `AntigravityAdapter` contract by parsing a user's raw resume, structuring the data, generating LaTeX, performing a STAR-methodology evaluation, and creating a final Passport.
> 
> **Instructions for the AI:**
> Follow these steps precisely. Output your responses as formatted JSON or LaTeX blocks so I can copy them into my local file system.
> 
> **Phase 1: Ingestion & Structuring**
> 1. I will provide my raw resume text. 
> 2. Parse it into the strictly typed `CandidateProfile` Zod schema format (JSON). Ensure you extract `bio`, `experience`, `education`, and `skills`.
> 3. Provide the JSON block. I will save this locally to `.careertwin/profile/candidate.json`.
> 
> **Phase 2: LaTeX Generation**
> 1. Based on the JSON profile, generate a complete ATS-safe LaTeX document using standard `article` class.
> 2. Ensure it compiles cleanly with `pdflatex` or `tectonic`.
> 3. Provide the LaTeX block. I will save this locally to `.careertwin/artifacts/resumes/resume-ats-live.tex`.
> 
> **Phase 3: STAR Methodology Skill Evaluation**
> 1. Analyze the experience bullets in the resume.
> 2. Identify areas where the "Situation, Task, Action, Result" (STAR) methodology is missing.
> 3. Provide a brief critique and rewrite 2 specific bullet points to have stronger impact metrics and better resume practices.
> 
> **Phase 4: Decision Packet (Passport) Creation**
> 1. Generate the final `Passport` JSON object based on the `PassportSchema`.
> 2. Include a `founderIntro` (a compelling 2-sentence hook for founders), `roleTags`, `skillTags`, and `startupFitIndicators` (e.g., "High ownership", "Comfortable with ambiguity").
> 3. Provide the JSON block. I will save this locally to `.careertwin/artifacts/passports/passport.json`.
> 
> **User Input:**
> "I am ready. Here is my raw resume text: [PASTE YOUR RAW RESUME TEXT HERE]"

---

## Post-AI Steps (CLI Verification)

Once the AI gives you the structured files and you save them into your `.careertwin` directory as instructed, run the following CLI commands to verify the engine sees them:

```bash
# Check if the engine reads your profile correctly
ct profile show

# Check your environment readiness
ct doctor

# Check the local artifact manifest
ct artifacts list

# Preview your generated passport
ct passport preview
```

You can also start the web inspector to view the data visually:
```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```
