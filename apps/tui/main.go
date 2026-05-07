package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strings"

	tea "github.com/charmbracelet/bubbletea"

	m "careertwin/tui/model"
	"careertwin/tui/ui"
)

// ─── App Model ────────────────────────────────────────────────────────────────

type model struct {
	workspace string
	data      m.WorkspaceData

	// Tab / sort / view
	activeTab int
	sortMode  int
	viewMode  string // "flat" | "grouped"

	// Screen
	screen string // "pipeline" | "report" | "status-modal"

	// Filtered + sorted eval list for current view
	displayed []m.EvaluationRun

	// Pipeline state
	selectedIndex  int
	listScrollOff  int

	// Report state
	reportLines    []string
	reportScrollOff int

	// Prior state (preserved when entering report)
	priorSelected  int
	priorScrollOff int

	// Status modal
	statusOptIdx int

	// Terminal size
	width  int
	height int

	// Error
	err string
}

func newModel(workspacePath string) model {
	data := m.LoadWorkspace(workspacePath)
	mod := model{
		workspace: workspacePath,
		data:      data,
		activeTab: 0,
		sortMode:  0,
		viewMode:  "flat",
		screen:    "pipeline",
		width:     120,
		height:    36,
	}
	mod.refreshList()
	return mod
}

func (mod *model) refreshList() {
	tab := m.Tabs[mod.activeTab]
	filtered := m.FilterEvaluations(mod.data.Evaluations, mod.data.Tracker, tab)
	sorted := m.SortEvaluations(filtered, m.SortModes[mod.sortMode])
	mod.displayed = sorted
	// Clamp selection
	if mod.selectedIndex >= len(mod.displayed) {
		mod.selectedIndex = max(0, len(mod.displayed)-1)
	}
}

func (mod *model) reloadData() {
	mod.data = m.LoadWorkspace(mod.workspace)
	mod.refreshList()
}

func max(a, b int) int {
	if a > b { return a }
	return b
}
func clamp(v, lo, hi int) int {
	if v < lo { return lo }
	if v > hi { return hi }
	return v
}

// ─── Bubble Tea interface ─────────────────────────────────────────────────────

func (mod model) Init() tea.Cmd { return nil }

func (mod model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		mod.width = msg.Width
		mod.height = msg.Height
		return mod, nil

	case tea.KeyMsg:
		key := msg.String()

		// Global quit
		if key == "q" || key == "ctrl+c" {
			return mod, tea.Quit
		}

		switch mod.screen {

		// ── Pipeline ──────────────────────────────────────────────────────────
		case "pipeline":
			listH := mod.listHeight()
			switch key {
			case "up", "k":
				mod.selectedIndex = clamp(mod.selectedIndex-1, 0, len(mod.displayed)-1)
				if mod.selectedIndex < mod.listScrollOff {
					mod.listScrollOff = mod.selectedIndex
				}
			case "down", "j":
				mod.selectedIndex = clamp(mod.selectedIndex+1, 0, len(mod.displayed)-1)
				if mod.selectedIndex >= mod.listScrollOff+listH {
					mod.listScrollOff = mod.selectedIndex - listH + 1
				}
			case "left":
				mod.activeTab = clamp(mod.activeTab-1, 0, len(m.Tabs)-1)
				mod.selectedIndex = 0
				mod.listScrollOff = 0
				mod.refreshList()
			case "right":
				mod.activeTab = clamp(mod.activeTab+1, 0, len(m.Tabs)-1)
				mod.selectedIndex = 0
				mod.listScrollOff = 0
				mod.refreshList()
			case "s":
				mod.sortMode = (mod.sortMode + 1) % len(m.SortModes)
				mod.refreshList()
			case "v":
				if mod.viewMode == "flat" {
					mod.viewMode = "grouped"
				} else {
					mod.viewMode = "flat"
				}
			case "enter":
				if len(mod.displayed) > 0 {
					mod.priorSelected = mod.selectedIndex
					mod.priorScrollOff = mod.listScrollOff
					mod.reportLines = ui.BuildReportLines(mod.displayed[mod.selectedIndex])
					mod.reportScrollOff = 0
					mod.screen = "report"
				}
			case "u":
				if len(mod.displayed) > 0 {
					mod.statusOptIdx = 0
					mod.screen = "status-modal"
				}
			}

		// ── Report ────────────────────────────────────────────────────────────
		case "report":
			reportViewH := mod.reportViewHeight()
			switch key {
			case "esc":
				mod.screen = "pipeline"
				mod.selectedIndex = mod.priorSelected
				mod.listScrollOff = mod.priorScrollOff
			case "up", "k":
				mod.reportScrollOff = clamp(mod.reportScrollOff-1, 0, len(mod.reportLines))
			case "down", "j":
				mod.reportScrollOff = clamp(mod.reportScrollOff+1, 0, max(0, len(mod.reportLines)-reportViewH))
			case "pgup":
				mod.reportScrollOff = clamp(mod.reportScrollOff-reportViewH, 0, len(mod.reportLines))
			case "pgdown":
				mod.reportScrollOff = clamp(mod.reportScrollOff+reportViewH, 0, max(0, len(mod.reportLines)-reportViewH))
			}

		// ── Status Modal ──────────────────────────────────────────────────────
		case "status-modal":
			switch key {
			case "esc":
				mod.screen = "pipeline"
			case "up", "k":
				mod.statusOptIdx = clamp(mod.statusOptIdx-1, 0, len(ui.StatusOptions)-1)
			case "down", "j":
				mod.statusOptIdx = clamp(mod.statusOptIdx+1, 0, len(ui.StatusOptions)-1)
		case "enter":
				if len(mod.displayed) > 0 {
					e := mod.displayed[mod.selectedIndex]
					newStatus := ui.StatusOptions[mod.statusOptIdx]
					// Resolve tracker entry Id (not jobId) — ct tracker update expects entry.Id
					if entry, ok := m.TrackerEntryFor(e.JobId, mod.data.Tracker); ok {
						_ = runTrackerUpdate(mod.workspace, entry.Id, newStatus)
					}
					// Reload + close regardless (new evals without tracker entry are safe)
					mod.reloadData()
					mod.screen = "pipeline"
				}
			}
		}
	}
	return mod, nil
}

// ─── View ─────────────────────────────────────────────────────────────────────

func (mod model) View() string {
	header := ui.RenderHeader(mod.width, mod.activeTab, mod.data.Evaluations, mod.data.Tracker, m.SortModes[mod.sortMode], mod.viewMode)
	footer := ui.RenderFooter(mod.width, mod.screen)

	// Fixed line counts
	headerLines := strings.Count(header, "\n") + 1
	footerLines := strings.Count(footer, "\n") + 1
	available := mod.height - headerLines - footerLines - 1

	var body string

	switch mod.screen {
	case "report":
		body = ui.RenderReportPage(mod.reportLines, mod.reportScrollOff, mod.reportViewHeight())

	case "status-modal":
		if len(mod.displayed) > 0 {
			listContent := mod.renderList(available - 10)
			modal := ui.RenderStatusModal(mod.displayed[mod.selectedIndex], mod.statusOptIdx, mod.width)
			body = listContent + "\n\n" + modal
		}

	default: // pipeline
		listH := mod.listHeight()
		previewH := 4
		listContent := mod.renderList(listH)
		divider := ui.StyleDim.Render(strings.Repeat("─", mod.width))
		previewContent := ui.RenderPreviewRail(mod.displayed, mod.selectedIndex, mod.width)
		_ = previewH
		body = listContent + "\n" + divider + "\n" + previewContent
	}

	return header + "\n" + body + "\n" + footer
}

func (mod model) renderList(h int) string {
	_ = h
	if mod.viewMode == "grouped" {
		return ui.RenderPipelineGrouped(mod.displayed, mod.selectedIndex, mod.width)
	}
	return ui.RenderPipelineFlat(mod.displayed, mod.selectedIndex, mod.listScrollOff, mod.listHeight(), mod.width)
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

func (mod model) listHeight() int {
	// header ~3 lines, footer ~2, preview ~5, divider ~1
	h := mod.height - 3 - 2 - 5 - 1
	if h < 4 {
		h = 4
	}
	return h
}

func (mod model) reportViewHeight() int {
	h := mod.height - 5 - 2
	if h < 4 {
		h = 4
	}
	return h
}

// runTrackerUpdate shells to the existing CLI: ct tracker update <trackerId> <status>
// trackerId MUST be the tracker entry's `id` field (the UUID in applications.json),
// NOT the jobId. Callers must resolve via TrackerEntryFor before calling this.
func runTrackerUpdate(workspacePath, trackerId, status string) error {
	root := workspacePath + "/../.."
	cmd := exec.Command("npm", "run", "ct", "--", "tracker", "update", trackerId, status)
	cmd.Dir = root
	cmd.Stdout = os.Stderr // log to stderr, not TUI stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// ─── Entry point ──────────────────────────────────────────────────────────────

func main() {
	wsFlag := flag.String("workspace", "", "Absolute path to .careertwin/ directory")
	flag.Parse()

	workspacePath := *wsFlag
	if workspacePath == "" {
		// Auto-detect: walk up from cwd to find .careertwin/
		cwd, _ := os.Getwd()
		workspacePath = findWorkspace(cwd)
	}
	if workspacePath == "" {
		fmt.Fprintln(os.Stderr, "error: .careertwin/ workspace not found. Run from your CTOSS project root or pass --workspace <path>")
		os.Exit(1)
	}

	p := tea.NewProgram(
		newModel(workspacePath),
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)
	if _, err := p.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "tui error:", err)
		os.Exit(1)
	}
}

func findWorkspace(start string) string {
	parts := strings.Split(start, string(os.PathSeparator))
	for len(parts) > 1 {
		candidate := strings.Join(parts, string(os.PathSeparator)) + "/.careertwin"
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
		parts = parts[:len(parts)-1]
	}
	return ""
}
