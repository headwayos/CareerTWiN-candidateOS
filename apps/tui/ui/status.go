package ui

import (
	"fmt"
	"strings"

	m "careertwin/tui/model"
)

var StatusOptions = []string{"evaluated", "shortlisted", "tailored", "ready-to-apply", "applied", "interview", "offer", "rejected", "ghosted", "archived"}

func RenderStatusModal(e m.EvaluationRun, selectedOpt int, width int) string {
	title := "Update Status"
	jobLine := ""
	if e.BlockA != nil {
		jobLine = fmt.Sprintf("%s @ %s  ·  %d/100  ·  %s", e.BlockA.Title, e.BlockA.Company, e.Scores.Overall, e.RecommendationBand)
	} else {
		jobLine = fmt.Sprintf("[legacy v1.x]  score %d  ·  %s", e.Scores.Overall, e.RecommendationBand)
	}

	var opts []string
	for i, s := range StatusOptions {
		if i == selectedOpt {
			opts = append(opts, StyleCyan.Render("● "+s))
		} else {
			opts = append(opts, StyleDim.Render("○ "+s))
		}
	}
	optRow1 := strings.Join(opts[:5], "   ")
	optRow2 := strings.Join(opts[5:], "   ")

	body := fmt.Sprintf(
		"%s\n\n%s\n\n%s\n%s\n\n%s",
		StyleCyan.Render(title),
		StyleDim.Render(Truncate(jobLine, 60)),
		optRow1,
		optRow2,
		StyleDim.Render("[enter] confirm    [esc] cancel — no change written"),
	)

	boxWidth := 64
	if width < boxWidth+8 {
		boxWidth = width - 8
	}
	return StyleModalBox.Width(boxWidth).Render(body)
}
