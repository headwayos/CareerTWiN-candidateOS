package ui

import (
	"fmt"
	"strings"

	m "careertwin/tui/model"
)

// RenderReport renders the full evaluation report as a scrollable string.
// Callers pass reportLines[scrollOff : scrollOff+viewH] for paging.
func BuildReportLines(e m.EvaluationRun) []string {
	var lines []string
	add := func(s string) { lines = append(lines, s) }
	sep := func() { add(StyleDim.Render(strings.Repeat("─", 72))) }

	add(StyleHeader.Render("  Evaluation Report"))
	add(fmt.Sprintf("  %s  ·  %s  ·  %s",
		StyleDim.Render("jobId: "+e.JobId[:8]+"…"),
		StyleDim.Render("schema: "+e.SchemaVersion),
		StyleDim.Render(e.EvaluatedAt[:10]),
	))
	add(fmt.Sprintf("  %s  %s/100",
		BandIcon(e.RecommendationBand)+"  "+BandLabel(e.RecommendationBand),
		StyleBold.Render(fmt.Sprintf("%d", e.Scores.Overall)),
	))
	sep()

	if e.IsLegacy || e.BlockA == nil {
		add(StyleAmber.Render("  [legacy v1.x artifact — 6-block report not available]"))
		if e.Analysis != nil {
			add("")
			add(StyleCyan.Render("  Analysis"))
			add(fmt.Sprintf("  Recommendation: %s", e.Analysis.Recommendation))
			add("")
			add(StyleCyan.Render("  Matches"))
			for _, x := range e.Analysis.Matches {
				add("    " + StyleGreen.Render("●") + "  " + x)
			}
			add("")
			add(StyleCyan.Render("  Gaps"))
			for _, x := range e.Analysis.Gaps {
				add("    " + StyleAmber.Render("✗") + "  " + x)
			}
			add("")
			add(StyleCyan.Render("  Actionable Fixes"))
			for _, x := range e.Analysis.ActionableFixes {
				add("    → " + x)
			}
		}
		return lines
	}

	// ── Block A ──────────────────────────────────────────────────────────────
	a := e.BlockA
	add("")
	add(StyleCyan.Render("  A · Role Summary"))
	add(fmt.Sprintf("  %s  @  %s  [%s]", StyleBold.Render(a.Title), StyleBold.Render(a.Company), a.Level))
	add(fmt.Sprintf("  %s  ·  %s  ·  %s", a.Archetype, a.Domain, a.WorkMode))
	if a.Location != "" {
		add("  " + StyleDim.Render(a.Location))
	}
	if a.CompensationRange != "" {
		add("  " + StyleAmber.Render(a.CompensationRange))
	}
	add("")
	add("  " + StyleSubtext.Render(a.TlDr))
	add("  " + StyleDim.Render(a.WhyThisMatters))
	sep()

	// ── Block B ──────────────────────────────────────────────────────────────
	if b := e.BlockB; b != nil {
		add("")
		add(StyleCyan.Render(fmt.Sprintf("  B · CV Match  (%d%%)", b.OverallMatchPct)))
		for _, r := range b.Requirements {
			icon := StyleGreen.Render("●")
			if r.Strength == "partial" {
				icon = StyleAmber.Render("◐")
			} else if r.Strength == "weak" || r.Strength == "missing" {
				icon = StyleRed.Render("✗")
			}
			add(fmt.Sprintf("  %s  %-28s  %s", icon, Truncate(r.Requirement, 28), StyleDim.Render(Truncate(r.Evidence, 36))))
		}
		for _, g := range b.Gaps {
			add(fmt.Sprintf("  %s  [%s] %s — %s", StyleRed.Render("✗"), g.Severity, g.Gap, StyleDim.Render(Truncate(g.Mitigation, 40))))
		}
		sep()
	}

	// ── Block C ──────────────────────────────────────────────────────────────
	if c := e.BlockC; c != nil {
		add("")
		add(StyleCyan.Render("  C · Level & Strategy"))
		add(fmt.Sprintf("  JD: %s  ·  You: %s  ·  Alignment: %s", c.JdLevel, c.CandidateLevel, c.LevelAlignment))
		add(fmt.Sprintf("  Strategy: %s", StyleBold.Render(c.StrategyName)))
		for _, tp := range c.TalkingPoints {
			add("    › " + tp)
		}
		sep()
	}

	// ── Block D ──────────────────────────────────────────────────────────────
	if d := e.BlockD; d != nil {
		add("")
		add(StyleCyan.Render(fmt.Sprintf("  D · Compensation  (comp score %d/100)", d.CompScore)))
		for _, row := range d.BenchmarkTable {
			add(fmt.Sprintf("  %-8s %-14s %-16s  p50 %s  [%s]",
				row.Level, row.Geography, row.CompanyType, row.P50, row.Source))
		}
		add("  " + StyleDim.Render(d.AttractivenessCommentary))
		sep()
	}

	// ── Block E ──────────────────────────────────────────────────────────────
	if e2 := e.BlockE; e2 != nil {
		add("")
		add(StyleCyan.Render("  E · Personalization Plan"))
		if len(e2.CvChanges) > 0 {
			add("  CV Changes:")
			for _, c := range e2.CvChanges {
				add(fmt.Sprintf("    ↑ [%s] %s — %s", c.Section, c.Change, StyleDim.Render(c.Rationale)))
			}
		}
		if len(e2.LinkedInChanges) > 0 {
			add("  LinkedIn Changes:")
			for _, c := range e2.LinkedInChanges {
				add(fmt.Sprintf("    ↑ [%s] %s — %s", c.Section, c.Change, StyleDim.Render(c.Rationale)))
			}
		}
		sep()
	}

	// ── Block F ──────────────────────────────────────────────────────────────
	if f := e.BlockF; f != nil {
		add("")
		add(StyleCyan.Render(fmt.Sprintf("  F · Interview Prep  (readiness %d/100)", f.ReadinessScore)))
		for _, s := range f.Stories {
			add(fmt.Sprintf("  %s  %s", StyleGreen.Render("●"), StyleBold.Render(s.Title)))
			add(fmt.Sprintf("    S: %s", s.Situation))
			add(fmt.Sprintf("    T: %s", s.Task))
			add(fmt.Sprintf("    A: %s", s.Action))
			add(fmt.Sprintf("    R: %s", StyleGreen.Render(s.Result)))
			add(fmt.Sprintf("    tags: %s", strings.Join(s.Tags, ", ")))
		}
	}

	add("")
	return lines
}

func RenderReportPage(lines []string, scrollOff, viewH int) string {
	end := scrollOff + viewH
	if end > len(lines) {
		end = len(lines)
	}
	if scrollOff > len(lines) {
		scrollOff = len(lines)
	}
	return strings.Join(lines[scrollOff:end], "\n")
}
