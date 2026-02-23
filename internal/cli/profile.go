package cli

import (
	"fmt"

	"github.com/sickn33/agent-ecosystem/internal/config"
	"github.com/sickn33/agent-ecosystem/internal/profile"
	"github.com/sickn33/agent-ecosystem/internal/util"
	"github.com/spf13/cobra"
)

var profileCmd = &cobra.Command{
	Use:   "profile",
	Short: "Scan repo and generate profile artifacts (repo-profile.json, repo-profile.md)",
	RunE: func(cmd *cobra.Command, args []string) error {
		repoRoot, err := util.ResolveRepoRoot(cmd)
		if err != nil {
			return err
		}

		_, err = config.LoadManifest(cmd)
		if err != nil {
			return err
		}

		logInfo("Scanning repository: %s", repoRoot)

		prof, err := profile.ScanRepo(repoRoot)
		if err != nil {
			return fmt.Errorf("profile scan failed: %w", err)
		}

		paths, err := profile.WriteArtifacts(repoRoot, prof)
		if err != nil {
			return fmt.Errorf("failed to write profile artifacts: %w", err)
		}

		logSuccess("Repository profile generated")
		fmt.Printf("  Repo:        %s\n", prof.RepoName)
		fmt.Printf("  Files:       %d\n", prof.FileCount)
		fmt.Printf("  Arch:        %s\n", prof.ArchitectureSummary)
		fmt.Printf("  Languages:   %s\n", prof.DetectedLanguagesMarkdown)
		fmt.Printf("  Frameworks:  %s\n", prof.DetectedFrameworksMarkdown)
		logInfo("Wrote: %s", paths.ProfileJSON)
		logInfo("Wrote: %s", paths.ProfileMD)

		return nil
	},
}
