# CTOSS Product Roadmap

CTOSS is being built iteratively, moving from a fully local tool toward a hybrid system capable of syncing to secure cloud platforms for mobile/web companions.

## ✅ Completed Phases

### Phase 1: Report Parity
- Foundation of the local database (`.careertwin/`).
- Ingestion engine to convert PDF CVs into `candidate.json`.
- Batch engine and Model Gateway architecture.
- 6-block JSON schema for deep evaluation artifacts.

### Phase 2A & 2B: TUI & Dashboards
- Terminal UI (TUI) written in Go for high-performance navigation.
- Pipeline management with `tracker/applications.json`.
- BubbleTea framework integration.
- CLI-based tabular dashboard summaries.

### Phase 3: Discovery & Batch Automation
- Scalable Scanner Engine.
- Custom board connectors (Greenhouse, Lever, Remotive).
- Pipeline deduplication mapping job descriptions to tracker entries.

### Phase 4: Apply & Integrity (Current Alpha Baseline)
- `ApplyPacket` generation: cover letter, QA application answers, human review checklist.
- Strict formal schema with traceability.
- Pipeline integrity suite (`health`, `fix`, `stats`) to find orphans and duplicates.

---

## 🔜 Up Next

### Phase 5: Interview Prep & Story Bank
- ✅ **Phase 5A:** Story Bank expansion (STAR+R, polished workflows, mapping).
- ✅ **Phase 5B:** Comprehensive Interview Prep Packs (questions, drill plans, gap analysis).
- 🔜 **Phase 5C:** Negotiation playbooks and compensation scripts (deferred).

### Phase 6: Deep Differentiation
- Scraping deep corporate data (10-Ks, engineering blogs).
- "Unique Value Proposition" (UVP) reports for highly competitive roles.

---

## ⏸ Deferred / Future Considerations

### Phase 7: Sync Boundary & Cloud
- Secure, end-to-end encrypted synchronization layer to push `.careertwin/` state to a managed Postgres instance.
- Enablement of web dashboards and iOS/Android companions.
- *Status:* Intentionally deferred to ensure local-first privacy and determinism are rock solid.

### Autonomous Agents
- CTOSS currently implements "Human-in-the-Loop" for applications.
- Fully autonomous form submission is outside the scope of the current OS design. We focus on preparation, not spam.
