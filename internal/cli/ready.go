package cli

import (
	"fmt"

	"github.com/sickn33/agent-ecosystem/internal/config"
	"github.com/sickn33/agent-ecosystem/internal/profile"
	"github.com/sickn33/agent-ecosystem/internal/util"
	"github.com/spf13/cobra"
)

var readyCmd = &cobra.Command{
	Use:   "ready",
	Short: "One-command bootstrap: profile → doctor → bootstrap → sync → export",
	Long: `Runs the full zero-setup pipeline:
1. Profile scan (full inventory)
2. Doctor checks
3. Bootstrap (clone/fetch skill sources) 
4. Sync (build skill index)
5. Export (generate agent bridge files)

This is the single command you run in any repo to get all agents configured.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		repoRoot, err := util.ResolveRepoRoot(cmd)
		if err != nil {
			return err
		}
		return runReady(cmd, repoRoot)
	},
}

var readyQuick bool
var readyLatest bool

func init() {
	readyCmd.Flags().BoolVar(&readyQuick, "quick", false, "Quick mode: skip sync if index exists")
	readyCmd.Flags().BoolVar(&readyLatest, "latest", false, "Track latest upstream refs before sync")
}

func runReady(cmd *cobra.Command, repoRoot string) error {
	manifest, err := config.LoadManifest(cmd)
	if err != nil {
		return err
	}

	// Step 1: Profile
	logInfo("=== Step 1/5: Repository Profile ===")
	prof, err := profile.ScanRepo(repoRoot)
	if err != nil {
		return fmt.Errorf("profile scan: %w", err)
	}
	if _, err := profile.WriteArtifacts(repoRoot, prof); err != nil {
		return fmt.Errorf("write profile: %w", err)
	}
	logSuccess("Profile: %s (%d files, %s)", prof.RepoName, prof.FileCount, prof.ArchitectureSummary)

	// Step 2: Doctor
	logInfo("=== Step 2/5: Doctor Checks ===")
	if !util.CommandExists("git") {
		return fmt.Errorf("git is required but not found")
	}
	logSuccess("Core tools available")

	// Step 3: Bootstrap
	logInfo("=== Step 3/5: Bootstrap ===")
	hubRoot := config.ExpandHubRoot(manifest.HubRoot)
	needsBootstrap := !util.DirExists(hubRoot)
	if readyQuick && !needsBootstrap {
		logInfo("Hub exists, skipping bootstrap in quick mode")
	} else {
		if err := bootstrapCmd.RunE(cmd, nil); err != nil {
			logWarn("Bootstrap: %v (continuing...)", err)
		}
	}

	// Step 4: Sync
	logInfo("=== Step 4/5: Sync ===")
	indexPath := config.IndexJSONPath(manifest)
	needsSync := !util.FileExists(indexPath) || !readyQuick
	if readyQuick && !needsSync {
		logInfo("Index exists, skipping sync in quick mode")
	} else {
		cmd.Flags().Set("apply", "true")
		if err := syncCmd.RunE(cmd, nil); err != nil {
			logWarn("Sync: %v (continuing...)", err)
		}
	}

	// Step 5: Export
	logInfo("=== Step 5/5: Export Agent Bridge Files ===")
	if err := exportCmd.RunE(cmd, nil); err != nil {
		return fmt.Errorf("export: %w", err)
	}

	logSuccess("=== Ready! All agents configured for: %s ===", prof.RepoName)
	return nil
}
