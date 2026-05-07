package ui

import "github.com/charmbracelet/lipgloss"

// ─── CTOSS colour palette ──────────────────────────────────────────────────────

const (
	colCyan     = "#06B6D4"
	colBlue     = "#0EA5E9"
	colGreen    = "#22C55E"
	colAmber    = "#F59E0B"
	colRed      = "#EF4444"
	colMuted    = "#6B7280"
	colDim      = "#374151"
	colBg       = "#0F172A"
	colSurface  = "#1E293B"
	colBorder   = "#334155"
	colText     = "#E2E8F0"
	colSubtext  = "#94A3B8"
)

// ─── Base styles ───────────────────────────────────────────────────────────────

var (
	StyleText    = lipgloss.NewStyle().Foreground(lipgloss.Color(colText))
	StyleSubtext = lipgloss.NewStyle().Foreground(lipgloss.Color(colSubtext))
	StyleDim     = lipgloss.NewStyle().Foreground(lipgloss.Color(colMuted))
	StyleBold    = lipgloss.NewStyle().Bold(true)

	StyleCyan  = lipgloss.NewStyle().Foreground(lipgloss.Color(colCyan))
	StyleBlue  = lipgloss.NewStyle().Foreground(lipgloss.Color(colBlue))
	StyleGreen = lipgloss.NewStyle().Foreground(lipgloss.Color(colGreen))
	StyleAmber = lipgloss.NewStyle().Foreground(lipgloss.Color(colAmber))
	StyleRed   = lipgloss.NewStyle().Foreground(lipgloss.Color(colRed))

	StyleHeader = lipgloss.NewStyle().
			Foreground(lipgloss.Color(colBlue)).
			Bold(true)

	StyleBorder = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(colBorder))

	StyleSelectedRow = lipgloss.NewStyle().
				Background(lipgloss.Color(colSurface)).
				Foreground(lipgloss.Color(colText)).
				Bold(true)

	StyleGroupHeader = lipgloss.NewStyle().
				Foreground(lipgloss.Color(colCyan)).
				Bold(true)

	StyleFooter = lipgloss.NewStyle().
			Foreground(lipgloss.Color(colMuted))

	StyleTabActive = lipgloss.NewStyle().
			Foreground(lipgloss.Color(colCyan)).
			Bold(true).
			Underline(true)

	StyleTabInactive = lipgloss.NewStyle().
				Foreground(lipgloss.Color(colMuted))

	StylePreviewPanel = lipgloss.NewStyle().
				BorderLeft(true).
				BorderStyle(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color(colBorder)).
				Padding(0, 1)

	StyleModalBox = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(colCyan)).
			Padding(1, 2).
			Background(lipgloss.Color(colSurface))
)

// ─── Band helpers ──────────────────────────────────────────────────────────────

func BandIcon(band string) string {
	switch band {
	case "top-target":
		return StyleGreen.Render("★")
	case "strong-apply":
		return StyleBlue.Render("●")
	case "conditional-apply":
		return StyleAmber.Render("◐")
	case "no-apply":
		return StyleRed.Render("○")
	default:
		return StyleDim.Render("–")
	}
}

func BandLabel(band string) string {
	var s lipgloss.Style
	switch band {
	case "top-target":
		s = StyleGreen
	case "strong-apply":
		s = StyleBlue
	case "conditional-apply":
		s = StyleAmber
	case "no-apply":
		s = StyleRed
	default:
		return StyleDim.Render("legacy v1.x        ")
	}
	if len(band) < 18 {
		band = band + spaces(18-len(band))
	}
	return s.Render(band)
}

func spaces(n int) string {
	s := ""
	for i := 0; i < n; i++ {
		s += " "
	}
	return s
}

func Truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}
