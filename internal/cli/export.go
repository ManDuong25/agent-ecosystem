package cli

import (
	"fmt"
	"time"

	"github.com/sickn33/agent-ecosystem/internal/bridge"
	"github.com/sickn33/agent-ecosystem/internal/config"
	"github.com/sickn33/agent-ecosystem/internal/profile"
	"github.com/sickn33/agent-ecosystem/internal/util"
	"github.com/spf13/cobra"
)

var exportCmd = &cobra.Command{
	Use:   "export",
	Short: "Export agent bridge files (Copilot, Claude, Codex, Gemini, etc.)",
	RunE: func(cmd *cobra.Command, args []string) error {
		repoRoot, err := util.ResolveRepoRoot(cmd)
		if err != nil {
			return err
		}

		manifest, err := config.LoadManifest(cmd)
		if err != nil {
			return err
		}

		logInfo("Generating agent bridge files...")

		// Load or generate profile
		prof, err := profile.LoadOrScan(repoRoot)
		if err != nil {
			return fmt.Errorf("profile: %w", err)
		}

		// Build template vars
		vars := bridge.BuildTemplateVars(prof, manifest, time.Now().UTC())

		// Count skills if index exists
		indexPath := config.IndexJSONPath(manifest)
		if util.FileExists(indexPath) {
			counts, err := bridge.ReadSkillCounts(indexPath)
			if err == nil {
				vars["TOTAL_SKILLS"] = fmt.Sprintf("%d", counts.Total)
				vars["OPENAI_COUNT"] = fmt.Sprintf("%d", counts.OpenAI)
				vars["ANTIGRAVITY_COUNT"] = fmt.Sprintf("%d", counts.Antigravity)
				vars["INDEX_JSON_PATH"] = indexPath
			}
		}
		if _, ok := vars["TOTAL_SKILLS"]; !ok {
			vars["TOTAL_SKILLS"] = "0"
			vars["OPENAI_COUNT"] = "0"
			vars["ANTIGRAVITY_COUNT"] = "0"
			vars["INDEX_JSON_PATH"] = config.IndexJSONPath(manifest)
		}

		// Render all templates
		outputs, err := bridge.RenderAll(repoRoot, manifest, vars)
		if err != nil {
			return fmt.Errorf("render templates: %w", err)
		}

		for _, out := range outputs {
			logSuccess("Wrote: %s", out)
		}

		logSuccess("Export complete (%d files generated)", len(outputs))
		return nil
	},
}

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update skill source refs in manifest",
	RunE: func(cmd *cobra.Command, args []string) error {
		source, _ := cmd.Flags().GetString("source")
		ref, _ := cmd.Flags().GetString("ref")

		manifest, err := config.LoadManifest(cmd)
		if err != nil {
			return err
		}

		manifestPath, err := config.ResolveManifestPath(cmd)
		if err != nil {
			return err
		}

		if source == "all" {
			for name := range manifest.Sources {
				manifest.Sources[name] = config.Source{
					Repo:  manifest.Sources[name].Repo,
					Ref:   ref,
					Paths: manifest.Sources[name].Paths,
				}
			}
		} else {
			src, ok := manifest.Sources[source]
			if !ok {
				return fmt.Errorf("unknown source: %s", source)
			}
			src.Ref = ref
			manifest.Sources[source] = src
		}

		if err := config.SaveManifest(manifestPath, manifest); err != nil {
			return fmt.Errorf("save manifest: %w", err)
		}

		logSuccess("Manifest updated: source=%s ref=%s", source, ref)
		logInfo("Run 'aeco sync --apply' to materialize changes.")
		return nil
	},
}

func init() {
	updateCmd.Flags().String("source", "all", "Source to update (openai|antigravity|all)")
	updateCmd.Flags().String("ref", "main", "Git ref to track")
}
