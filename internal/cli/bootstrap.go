package cli

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/sickn33/agent-ecosystem/internal/config"
	"github.com/sickn33/agent-ecosystem/internal/skills"
	"github.com/sickn33/agent-ecosystem/internal/util"
	"github.com/spf13/cobra"
)

var bootstrapCmd = &cobra.Command{
	Use:   "bootstrap",
	Short: "Clone/fetch skill sources into the local hub",
	RunE: func(cmd *cobra.Command, args []string) error {
		manifest, err := config.LoadManifest(cmd)
		if err != nil {
			return err
		}

		logInfo("Bootstrapping skill hub...")

		hubRoot := config.ExpandHubRoot(manifest.HubRoot)
		if err := os.MkdirAll(hubRoot, 0o755); err != nil {
			return fmt.Errorf("cannot create hub root: %w", err)
		}

		for name, src := range manifest.Sources {
			logInfo("Source: %s -> %s@%s", name, src.Repo, src.Ref)
			repoDir := filepath.Join(hubRoot, "repos", name)
			if err := skills.EnsureClone(src.Repo, src.Ref, repoDir); err != nil {
				return fmt.Errorf("bootstrap source %s: %w", name, err)
			}
			logSuccess("Source %s ready at %s", name, repoDir)
		}

		logSuccess("Bootstrap complete. Hub: %s", hubRoot)
		return nil
	},
}

var syncCmd = &cobra.Command{
	Use:   "sync",
	Short: "Sync skills from hub sources into local index",
	RunE: func(cmd *cobra.Command, args []string) error {
		apply, _ := cmd.Flags().GetBool("apply")
		manifest, err := config.LoadManifest(cmd)
		if err != nil {
			return err
		}

		_, err = util.ResolveRepoRoot(cmd)
		if err != nil {
			return err
		}

		hubRoot := config.ExpandHubRoot(manifest.HubRoot)
		if !util.DirExists(hubRoot) {
			return fmt.Errorf("hub root not found: %s (run bootstrap first)", hubRoot)
		}

		logInfo("Scanning skill sources...")
		index, err := skills.BuildIndex(manifest, hubRoot)
		if err != nil {
			return fmt.Errorf("index build failed: %w", err)
		}

		logInfo("Found %d skills total", index.Total)

		if !apply {
			logWarn("Dry run. Use --apply to write index and sync targets.")
			return nil
		}

		indexPath := config.IndexJSONPath(manifest)
		if err := os.MkdirAll(filepath.Dir(indexPath), 0o755); err != nil {
			return err
		}
		if err := util.WriteJSON(indexPath, index); err != nil {
			return fmt.Errorf("write index: %w", err)
		}
		logSuccess("Index written: %s (%d skills)", indexPath, index.Total)

		// Sync to configured targets
		for targetName, target := range manifest.Targets {
			if !target.Enabled {
				continue
			}
			targetPath := util.ExpandHome(target.Path)
			if err := skills.SyncToTarget(index, targetPath); err != nil {
				logWarn("Sync to %s failed: %v", targetName, err)
			} else {
				logSuccess("Synced to %s: %s", targetName, targetPath)
			}
		}

		return nil
	},
}

var verifyCmd = &cobra.Command{
	Use:   "verify",
	Short: "Verify hub integrity and skill targets",
	RunE: func(cmd *cobra.Command, args []string) error {
		manifest, err := config.LoadManifest(cmd)
		if err != nil {
			return err
		}

		logInfo("Verifying hub state...")

		hubRoot := config.ExpandHubRoot(manifest.HubRoot)
		indexPath := config.IndexJSONPath(manifest)

		issues := 0

		if !util.DirExists(hubRoot) {
			logError("Hub root missing: %s", hubRoot)
			issues++
		}

		if !util.FileExists(indexPath) {
			logError("Index missing: %s", indexPath)
			issues++
		}

		for name, target := range manifest.Targets {
			if !target.Enabled {
				continue
			}
			p := util.ExpandHome(target.Path)
			if util.DirExists(p) {
				logSuccess("Target %s: %s", name, p)
			} else {
				logWarn("Target %s missing: %s", name, p)
			}
		}

		if issues > 0 {
			return fmt.Errorf("%d verification issues found", issues)
		}

		logSuccess("All verification checks passed")
		return nil
	},
}

func init() {
	syncCmd.Flags().Bool("apply", false, "Apply changes (write index, sync targets)")
}
