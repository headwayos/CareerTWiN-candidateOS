package types

import (
	"os"
	"os/exec"
)

// UpdateTrackerStatus shells out to the existing TypeScript CLI to perform the write.
// This preserves human-in-the-loop and avoids reimplementing mutation logic in Go.
func UpdateTrackerStatus(jobId, status string) error {
	// Locate the npm run script — finds the correct ct binary via PATH or npx
	cmd := exec.Command("npm", "run", "ct", "--", "tracker", "update", jobId, status)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
