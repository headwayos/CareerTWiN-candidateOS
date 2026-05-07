package ui

import "strings"

func RenderFooter(width int, screen string) string {
	var hints string
	switch screen {
	case "report":
		hints = "↑↓ scroll  pgup/pgdn fast  esc back  q quit"
	case "status-modal":
		hints = "↑↓ select  enter confirm  esc cancel"
	default:
		hints = "↑↓ move  ←→ tabs  enter report  s sort  v view  u status  q quit"
	}
	divider := StyleDim.Render(strings.Repeat("─", width))
	return divider + "\n" + StyleFooter.Render("  "+hints)
}
