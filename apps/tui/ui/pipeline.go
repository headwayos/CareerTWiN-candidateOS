package ui

import (
	"fmt"
	"strings"

	m "careertwin/tui/model"
)

// rowLabel builds the display string for one evaluation row.
func rowLabel(e m.EvaluationRun, width int) string {
	if e.IsUnreadable {
		return StyleRed.Render("!") + "  " + StyleDim.Render(Truncate(e.FileName, 20)) + "  " + StyleDim.Render("(unreadable)")
	}
	band := BandIcon(e.RecommendationBand) + "  " + BandLabel(e.RecommendationBand)
	score := fmt.Sprintf("%3d/100", e.Scores.Overall)

	var label string
	if e.BlockA != nil {
		level := ""
		if e.BlockA.Level != "" {
			level = " [" + e.BlockA.Level + "]"
		}
		label = Truncate(e.BlockA.Title+" @ "+e.BlockA.Company+level, width-40)
	} else if e.Analysis != nil && e.Analysis.Recommendation != "" {
		label = StyleDim.Render(Truncate("[legacy] "+e.Analysis.Recommendation, width-40))
	} else {
		label = StyleDim.Render("[legacy v1.x]")
	}
	return band + "  " + StyleSubtext.Render(score) + "  " + label
}

// RenderPipelineFlat renders a flat sorted list.
func RenderPipelineFlat(evals []m.EvaluationRun, selected, scrollOff, listH, width int) string {
	if len(evals) == 0 {
		return StyleDim.Render("\n  No evaluations found. Run: npm run ct -- evaluate <jd>\n")
	}
	var lines []string
	end := scrollOff + listH
	if end > len(evals) {
		end = len(evals)
	}
	for i := scrollOff; i < end; i++ {
		row := "  " + rowLabel(evals[i], width)
		if i == selected {
			row = StyleSelectedRow.Render("> " + rowLabel(evals[i], width))
		}
		lines = append(lines, row)
	}
	return strings.Join(lines, "\n")
}

// RenderPipelineGrouped renders rows grouped by recommendation band.
func RenderPipelineGrouped(evals []m.EvaluationRun, selected, width int) string {
	if len(evals) == 0 {
		return StyleDim.Render("\n  No evaluations found. Run: npm run ct -- evaluate <jd>\n")
	}
	groups := m.GroupEvaluations(evals)
	// Build a flat index map so selection still works across groups
	var flatIdx int
	var lines []string
	for _, g := range groups {
		header := StyleGroupHeader.Render(fmt.Sprintf("── %s (%d) ", g.Label, len(g.Rows)))
		header += StyleDim.Render(strings.Repeat("─", max(0, width-len(g.Label)-12)))
		lines = append(lines, header)
		for _, e := range g.Rows {
			row := "  " + rowLabel(e, width)
			if flatIdx == selected {
				row = StyleSelectedRow.Render("> " + rowLabel(e, width))
			}
			lines = append(lines, row)
			flatIdx++
		}
	}
	return strings.Join(lines, "\n")
}

// RenderPreviewRail renders the bottom preview for the selected evaluation.
func RenderPreviewRail(evals []m.EvaluationRun, selected, width int) string {
	if selected < 0 || selected >= len(evals) {
		return StyleDim.Render("  No job selected")
	}
	e := evals[selected]
	if e.IsUnreadable {
		return StyleRed.Render("  Cannot preview: unreadable artifact")
	}
	if e.BlockA == nil {
		// legacy fallback
		rec := ""
		if e.Analysis != nil {
			rec = e.Analysis.Recommendation
		}
		return StyleDim.Render(fmt.Sprintf("  [legacy v1.x]  score %d  %s", e.Scores.Overall, Truncate(rec, 60)))
	}
	line1 := StyleBold.Render(e.BlockA.Title) + "  " + StyleDim.Render("@") + "  " + StyleCyan.Render(e.BlockA.Company)
	line2 := StyleDim.Render(e.BlockA.Archetype) + "  ·  " + StyleDim.Render(e.BlockA.Domain) + "  ·  " + StyleDim.Render(e.BlockA.WorkMode)
	line3 := StyleSubtext.Render(Truncate(e.BlockA.TlDr, width-4))
	comp := e.BlockA.CompensationRange
	if comp == "" {
		comp = "comp n/a"
	}
	line4 := StyleDim.Render(e.BlockA.Location) + "  " + StyleAmber.Render(comp) + "  " + BandIcon(e.RecommendationBand) + " " + StyleSubtext.Render(fmt.Sprintf("%d/100", e.Scores.Overall))
	return "  " + line1 + "\n  " + line2 + "\n  " + line3 + "\n  " + line4
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
