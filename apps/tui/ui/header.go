package ui

import (
	"fmt"
	"strings"

	m "careertwin/tui/model"
)

func RenderHeader(width int, activeTab int, evals []m.EvaluationRun, tracker []m.TrackerEntry, sortMode, viewMode string) string {
	title := StyleHeader.Render("CareerTwin OS") + "  " + StyleDim.Render("Phase 2B TUI")

	// Sort + view indicators
	indicators := StyleDim.Render("sort:"+sortMode) + "  " + StyleDim.Render("view:"+viewMode)

	// Tab bar
	var tabs []string
	for i, tab := range m.Tabs {
		count := m.TabCount(evals, tracker, tab)
		label := fmt.Sprintf("%s:%d", tab, count)
		if i == activeTab {
			tabs = append(tabs, StyleTabActive.Render(label))
		} else {
			tabs = append(tabs, StyleTabInactive.Render(label))
		}
	}
	tabBar := strings.Join(tabs, StyleDim.Render("  "))

	divider := StyleDim.Render(strings.Repeat("─", width))

	return title + "  " + indicators + "\n" + tabBar + "\n" + divider
}
