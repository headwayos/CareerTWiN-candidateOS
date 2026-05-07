package types

import "time"

// ─── Evaluation ───────────────────────────────────────────────────────────────

type BlockARoleSummary struct {
	Title             string `json:"title"`
	Company           string `json:"company"`
	Level             string `json:"level"`
	WorkMode          string `json:"workMode"`
	Location          string `json:"location"`
	CompensationRange string `json:"compensationRange"`
	Archetype         string `json:"archetype"`
	Domain            string `json:"domain"`
	Function          string `json:"function"`
	TlDr              string `json:"tldr"`
	WhyThisMatters    string `json:"whyThisMatters"`
}

type RequirementMapping struct {
	Requirement string `json:"requirement"`
	Evidence    string `json:"evidence"`
	Strength    string `json:"strength"`
}

type GapItem struct {
	Gap        string `json:"gap"`
	Severity   string `json:"severity"`
	Mitigation string `json:"mitigation"`
}

type BlockBCvMatch struct {
	OverallMatchPct int                  `json:"overallMatchPct"`
	Requirements    []RequirementMapping `json:"requirements"`
	TopMatches      []string             `json:"topMatches"`
	Gaps            []GapItem            `json:"gaps"`
	Risks           []string             `json:"risks"`
}

type BlockCLevelStrategy struct {
	JdLevel           string   `json:"jdLevel"`
	CandidateLevel    string   `json:"candidateLevel"`
	LevelAlignment    string   `json:"levelAlignment"`
	StrategyName      string   `json:"strategyName"`
	TalkingPoints     []string `json:"talkingPoints"`
	DownlevelGuidance string   `json:"downlevelGuidance"`
}

type BenchmarkRow struct {
	Level       string `json:"level"`
	Geography   string `json:"geography"`
	CompanyType string `json:"companyType"`
	P25         string `json:"p25"`
	P50         string `json:"p50"`
	P75         string `json:"p75"`
	Source      string `json:"source"`
}

type BlockDCompensation struct {
	CompScore               int            `json:"compScore"`
	BenchmarkTable          []BenchmarkRow `json:"benchmarkTable"`
	DemandContext           string         `json:"demandContext"`
	AttractivenessCommentary string        `json:"attractivenessCommentary"`
}

type CvChange struct {
	Section  string `json:"section"`
	Change   string `json:"change"`
	Rationale string `json:"rationale"`
	Priority string `json:"priority"`
}

type BlockEPersonalization struct {
	CvChanges       []CvChange `json:"cvChanges"`
	LinkedInChanges []CvChange `json:"linkedInChanges"`
}

type InterviewStory struct {
	StoryId           string   `json:"storyId"`
	Title             string   `json:"title"`
	RequirementMapped string   `json:"requirementMapped"`
	Situation         string   `json:"situation"`
	Task              string   `json:"task"`
	Action            string   `json:"action"`
	Result            string   `json:"result"`
	Tags              []string `json:"tags"`
	ConfidenceLevel   string   `json:"confidenceLevel"`
}

type BlockFInterviewPrep struct {
	ReadinessScore int              `json:"readinessScore"`
	Stories        []InterviewStory `json:"stories"`
}

type LegacyAnalysis struct {
	Matches        []string `json:"matches"`
	Gaps           []string `json:"gaps"`
	Risks          []string `json:"risks"`
	Recommendation string   `json:"recommendation"`
	ActionableFixes []string `json:"actionableFixes"`
}

type Scores struct {
	Overall    int `json:"overall"`
	Skills     int `json:"skills"`
	Experience int `json:"experience"`
	StartupFit int `json:"startupFit"`
}

// EvaluationRun mirrors the frozen Phase 1 v2.0 schema.
// All 6-block fields are pointers so legacy v1.x artifacts (missing blocks) degrade gracefully.
type EvaluationRun struct {
	SchemaVersion  string  `json:"schemaVersion"`
	JobId          string  `json:"jobId"`
	EvaluatedAt    string  `json:"evaluatedAt"`
	RecommendationBand string `json:"recommendationBand"`
	Scores         Scores  `json:"scores"`
	SenioritySignal string `json:"senioritySignal"`

	// Legacy v1.x compat
	Analysis *LegacyAnalysis `json:"analysis"`

	// 6-block report (v2.0+)
	BlockA *BlockARoleSummary   `json:"blockA_roleSummary"`
	BlockB *BlockBCvMatch       `json:"blockB_cvMatch"`
	BlockC *BlockCLevelStrategy `json:"blockC_levelStrategy"`
	BlockD *BlockDCompensation  `json:"blockD_compensationDemand"`
	BlockE *BlockEPersonalization `json:"blockE_personalizationPlan"`
	BlockF *BlockFInterviewPrep `json:"blockF_interviewPrep"`

	// Internal (set by loader)
	FileName    string    `json:"-"`
	LoadedAt    time.Time `json:"-"`
	IsLegacy    bool      `json:"-"`
	IsUnreadable bool     `json:"-"`
}

// ─── Tracker ──────────────────────────────────────────────────────────────────

type TrackerNote struct {
	Date    string `json:"date"`
	Content string `json:"content"`
}

type TrackerEntry struct {
	Id            string        `json:"id"`
	JobId         string        `json:"jobId"`
	Status        string        `json:"status"`
	LastUpdatedAt string        `json:"lastUpdatedAt"`
	Notes         []TrackerNote `json:"notes"`
}

// ─── Passport ─────────────────────────────────────────────────────────────────

type ChecklistItem struct {
	Task      string `json:"task"`
	Completed bool   `json:"completed"`
	Impact    string `json:"impact"`
}

type PassportReadiness struct {
	Score     int             `json:"score"`
	IsReady   bool            `json:"isReady"`
	Checklist []ChecklistItem `json:"checklist"`
}

type PublishState struct {
	Status            string `json:"status"`
	LastPublishedAt   string `json:"lastPublishedAt"`
	LastUnpublishedAt string `json:"lastUnpublishedAt"`
}

// ─── Story Bank ───────────────────────────────────────────────────────────────

type Story struct {
	Id              string   `json:"id"`
	Title           string   `json:"title"`
	Tags            []string `json:"tags"`
	ConfidenceLevel string   `json:"confidenceLevel"`
	JobIds          []string `json:"jobIds"`
	CreatedAt       string   `json:"createdAt"`
	LastUsedAt      string   `json:"lastUsedAt"`
}

type StoryBank struct {
	SchemaVersion string  `json:"schemaVersion"`
	Stories       []Story `json:"stories"`
}
