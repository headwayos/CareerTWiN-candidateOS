package types

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ─── Loader ───────────────────────────────────────────────────────────────────

type WorkspaceData struct {
	Evaluations []EvaluationRun
	Tracker     []TrackerEntry
	StoryBank   StoryBank
	Readiness   PassportReadiness
	PublishState PublishState
	HasReadiness bool
}

func LoadWorkspace(workspacePath string) WorkspaceData {
	data := WorkspaceData{}
	data.Evaluations = loadEvaluations(workspacePath)
	data.Tracker = loadTracker(workspacePath)
	data.StoryBank = loadStoryBank(workspacePath)
	data.Readiness, data.HasReadiness = loadReadiness(workspacePath)
	data.PublishState = loadPublishState(workspacePath)
	return data
}

func loadEvaluations(workspacePath string) []EvaluationRun {
	evalDir := filepath.Join(workspacePath, "jobs", "evaluations")
	entries, err := os.ReadDir(evalDir)
	if err != nil {
		return nil
	}

	var results []EvaluationRun
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		fpath := filepath.Join(evalDir, e.Name())
		data, err := os.ReadFile(fpath)
		if err != nil {
			results = append(results, EvaluationRun{
				FileName: e.Name(), IsUnreadable: true,
			})
			continue
		}
		var run EvaluationRun
		if err := json.Unmarshal(data, &run); err != nil {
			results = append(results, EvaluationRun{
				FileName: e.Name(), IsUnreadable: true,
			})
			continue
		}
		run.FileName = e.Name()
		run.IsLegacy = run.BlockA == nil
		// Parse evaluatedAt for sorting
		if t, err := time.Parse(time.RFC3339, run.EvaluatedAt); err == nil {
			run.LoadedAt = t
		} else {
			info, _ := e.Info()
			if info != nil {
				run.LoadedAt = info.ModTime()
			}
		}
		results = append(results, run)
	}
	return results
}

func loadTracker(workspacePath string) []TrackerEntry {
	p := filepath.Join(workspacePath, "tracker", "applications.json")
	data, err := os.ReadFile(p)
	if err != nil {
		return nil
	}
	var entries []TrackerEntry
	_ = json.Unmarshal(data, &entries)
	return entries
}

func loadStoryBank(workspacePath string) StoryBank {
	p := filepath.Join(workspacePath, "profile", "story-bank.json")
	data, err := os.ReadFile(p)
	if err != nil {
		return StoryBank{}
	}
	var sb StoryBank
	_ = json.Unmarshal(data, &sb)
	return sb
}

func loadReadiness(workspacePath string) (PassportReadiness, bool) {
	p := filepath.Join(workspacePath, "artifacts", "passports", "readiness.json")
	data, err := os.ReadFile(p)
	if err != nil {
		return PassportReadiness{}, false
	}
	var r PassportReadiness
	if err := json.Unmarshal(data, &r); err != nil {
		return PassportReadiness{}, false
	}
	return r, true
}

func loadPublishState(workspacePath string) PublishState {
	p := filepath.Join(workspacePath, "artifacts", "passports", "publish-state.json")
	data, err := os.ReadFile(p)
	if err != nil {
		return PublishState{}
	}
	var ps PublishState
	_ = json.Unmarshal(data, &ps)
	return ps
}

// ─── Filtering ────────────────────────────────────────────────────────────────

// TrackerStatusFor returns the tracker status for a given jobId, or "evaluated" as default.
func TrackerStatusFor(jobId string, tracker []TrackerEntry) string {
	for _, t := range tracker {
		if t.JobId == jobId {
			return t.Status
		}
	}
	return "evaluated"
}

// TrackerEntryFor returns the full TrackerEntry for a given jobId, and a found bool.
// The entry's Id field (not JobId) is what ct tracker update expects.
func TrackerEntryFor(jobId string, tracker []TrackerEntry) (TrackerEntry, bool) {
	for _, t := range tracker {
		if t.JobId == jobId {
			return t, true
		}
	}
	return TrackerEntry{}, false
}

var Tabs = []string{"all", "evaluated", "tailored", "ready-to-apply", "interview", "applied", "rejected", "top-target"}

func FilterEvaluations(evals []EvaluationRun, tracker []TrackerEntry, tab string) []EvaluationRun {
	if tab == "all" {
		return evals
	}
	var out []EvaluationRun
	for _, e := range evals {
		if tab == "top-target" {
			if e.RecommendationBand == "top-target" {
				out = append(out, e)
			}
			continue
		}
		status := TrackerStatusFor(e.JobId, tracker)
		if status == tab {
			out = append(out, e)
		}
	}
	return out
}

func TabCount(evals []EvaluationRun, tracker []TrackerEntry, tab string) int {
	return len(FilterEvaluations(evals, tracker, tab))
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

var SortModes = []string{"recent", "score", "band", "company"}

var bandOrder = map[string]int{
	"top-target":        0,
	"strong-apply":      1,
	"conditional-apply": 2,
	"no-apply":          3,
	"":                  4,
}

func SortEvaluations(evals []EvaluationRun, mode string) []EvaluationRun {
	out := make([]EvaluationRun, len(evals))
	copy(out, evals)

	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		switch mode {
		case "score":
			return a.Scores.Overall > b.Scores.Overall
		case "band":
			oa := bandOrder[a.RecommendationBand]
			ob := bandOrder[b.RecommendationBand]
			if oa != ob {
				return oa < ob
			}
			return a.Scores.Overall > b.Scores.Overall
		case "company":
			ca, cb := "(legacy)", "(legacy)"
			if a.BlockA != nil {
				ca = a.BlockA.Company
			}
			if b.BlockA != nil {
				cb = b.BlockA.Company
			}
			if ca != cb {
				return strings.ToLower(ca) < strings.ToLower(cb)
			}
			return a.Scores.Overall > b.Scores.Overall
		default: // "recent"
			return a.LoadedAt.After(b.LoadedAt)
		}
	})
	return out
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

type Group struct {
	Label string
	Rows  []EvaluationRun
}

var groupOrder = []string{"top-target", "strong-apply", "conditional-apply", "no-apply", ""}

var groupLabels = map[string]string{
	"top-target":        "Top Target",
	"strong-apply":      "Strong Apply",
	"conditional-apply": "Conditional Apply",
	"no-apply":          "No Apply",
	"":                  "Legacy / Unknown",
}

func GroupEvaluations(evals []EvaluationRun) []Group {
	buckets := map[string][]EvaluationRun{}
	for _, e := range evals {
		band := e.RecommendationBand
		if _, ok := groupLabels[band]; !ok {
			band = ""
		}
		buckets[band] = append(buckets[band], e)
	}
	var groups []Group
	for _, band := range groupOrder {
		rows := buckets[band]
		if len(rows) == 0 {
			continue
		}
		groups = append(groups, Group{
			Label: groupLabels[band],
			Rows:  rows,
		})
	}
	return groups
}
