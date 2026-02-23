package cli

import (
	"github.com/sickn33/agent-ecosystem/internal/config"
	"github.com/sickn33/agent-ecosystem/internal/util"
	"github.com/spf13/cobra"
)

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Check system readiness (tools, paths, hub state)",
	RunE: func(cmd *cobra.Command, args []string) error {
		repoRoot, err := util.ResolveRepoRoot(cmd)
		if err != nil {
			return err
		}

		manifest, err := config.LoadManifest(cmd)
		if err != nil {
			return err
		}

		logInfo("Running doctor checks...")

		// Check required tools
		tools := []string{"git", "node"}
		optTools := []string{"rg", "pwsh", "go", "python", "python3"}

		allOk := true
		for _, t := range tools {
			if util.CommandExists(t) {
				logSuccess("%-12s found", t)
			} else {
				logError("%-12s MISSING (required)", t)
				allOk = false
			}
		}
		for _, t := range optTools {
			if util.CommandExists(t) {
				logSuccess("%-12s found", t)
			} else {
				logWarn("%-12s not found (optional)", t)
			}
		}

		// Check repo root
		logInfo("Repo root: %s", repoRoot)

		// Check hub
		hubRoot := config.ExpandHubRoot(manifest.HubRoot)
		if util.DirExists(hubRoot) {
			logSuccess("Hub root: %s", hubRoot)
		} else {
			logWarn("Hub root not found: %s (will be created on bootstrap)", hubRoot)
		}

		// Check index
		indexPath := config.IndexJSONPath(manifest)
		if util.FileExists(indexPath) {
			logSuccess("Skills index: %s", indexPath)
		} else {
			logWarn("Skills index not found (run bootstrap + sync first)")
		}

		if !allOk {
			return errorf("Some required tools are missing")
		}

		logSuccess("All doctor checks passed")
		return nil
	},
}
