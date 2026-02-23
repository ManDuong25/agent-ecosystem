package cli

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/sickn33/agent-ecosystem/internal/util"
	"github.com/spf13/cobra"
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize agent-ecosystem in a repository (copies config + templates)",
	RunE: func(cmd *cobra.Command, args []string) error {
		target, _ := cmd.Flags().GetString("target")
		if target == "" {
			var err error
			target, err = os.Getwd()
			if err != nil {
				return err
			}
		}

		target, err := filepath.Abs(target)
		if err != nil {
			return err
		}

		logInfo("Initializing agent-ecosystem in: %s", target)

		// Create tools/agent-ecosystem structure
		kitDir := filepath.Join(target, "tools", "agent-ecosystem")
		if err := os.MkdirAll(kitDir, 0o755); err != nil {
			return fmt.Errorf("create kit dir: %w", err)
		}

		// Write default manifest
		manifestDst := filepath.Join(kitDir, "skills.manifest.yaml")
		if !util.FileExists(manifestDst) {
			if err := util.WriteEmbeddedFile("configs/default-manifest.yaml", manifestDst); err != nil {
				return fmt.Errorf("write manifest: %w", err)
			}
			logSuccess("Created: %s", manifestDst)
		} else {
			logWarn("Manifest already exists: %s", manifestDst)
		}

		// Write templates
		templateDir := filepath.Join(kitDir, "templates")
		if err := util.WriteEmbeddedDir("templates", templateDir); err != nil {
			return fmt.Errorf("write templates: %w", err)
		}
		logSuccess("Templates written to: %s", templateDir)

		// Write a wrapper script for convenience
		if err := writeWrapperScripts(kitDir); err != nil {
			logWarn("Could not write wrapper scripts: %v", err)
		}

		logSuccess("Initialization complete!")
		logInfo("Next steps:")
		fmt.Println("  1. aeco profile           # Scan your repo")
		fmt.Println("  2. aeco bootstrap          # Fetch skill sources")
		fmt.Println("  3. aeco sync --apply       # Build skill index")
		fmt.Println("  4. aeco export             # Generate agent bridge files")
		fmt.Println("  Or simply: aeco ready      # Does all of the above")

		return nil
	},
}

var installCmd = &cobra.Command{
	Use:   "install",
	Short: "Install agent-ecosystem kit into a target repository",
	RunE: func(cmd *cobra.Command, args []string) error {
		target, _ := cmd.Flags().GetString("target")
		force, _ := cmd.Flags().GetBool("force")
		ready, _ := cmd.Flags().GetBool("ready")

		if target == "" {
			return fmt.Errorf("--target is required")
		}

		target, err := filepath.Abs(target)
		if err != nil {
			return err
		}

		if !util.DirExists(target) {
			return fmt.Errorf("target directory does not exist: %s", target)
		}

		kitDir := filepath.Join(target, "tools", "agent-ecosystem")
		if util.DirExists(kitDir) && !force {
			return fmt.Errorf("kit already exists at %s (use --force to overwrite)", kitDir)
		}

		logInfo("Installing agent-ecosystem to: %s", target)

		if util.DirExists(kitDir) && force {
			os.RemoveAll(kitDir)
		}

		if err := os.MkdirAll(kitDir, 0o755); err != nil {
			return err
		}

		// Copy manifest and templates
		manifestDst := filepath.Join(kitDir, "skills.manifest.yaml")
		if err := util.WriteEmbeddedFile("configs/default-manifest.yaml", manifestDst); err != nil {
			return err
		}
		if err := util.WriteEmbeddedDir("templates", filepath.Join(kitDir, "templates")); err != nil {
			return err
		}
		if err := writeWrapperScripts(kitDir); err != nil {
			logWarn("Could not write wrapper scripts: %v", err)
		}

		logSuccess("Kit installed to: %s", kitDir)

		if ready {
			logInfo("Running ready sequence in target repo...")
			// Run in-process ready
			origDir, _ := os.Getwd()
			os.Chdir(target)
			defer os.Chdir(origDir)
			return runReady(cmd, target)
		}

		return nil
	},
}

func init() {
	initCmd.Flags().String("target", "", "Target directory (default: current directory)")

	installCmd.Flags().String("target", "", "Target repository path (required)")
	installCmd.Flags().Bool("force", false, "Overwrite existing kit")
	installCmd.Flags().Bool("ready", false, "Run ready sequence after install")
}

func writeWrapperScripts(kitDir string) error {
	// Shell wrapper for Unix
	sh := `#!/bin/sh
# Agent Ecosystem wrapper — delegates to aeco binary
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if command -v aeco >/dev/null 2>&1; then
    exec aeco "$@" --repo "$REPO_ROOT"
else
    echo "[WARN] aeco not found in PATH. Install: go install github.com/sickn33/agent-ecosystem/cmd/aeco@latest"
    echo "[WARN] Or download from: https://github.com/sickn33/agent-ecosystem/releases"
    exit 1
fi
`
	shPath := filepath.Join(kitDir, "aeco.sh")
	if err := os.WriteFile(shPath, []byte(sh), 0o755); err != nil {
		return err
	}

	// PowerShell wrapper for Windows compat
	ps := `# Agent Ecosystem wrapper — delegates to aeco binary
$ScriptDir = Split-Path -Parent $PSCommandPath
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\.."))

$aeco = Get-Command aeco -ErrorAction SilentlyContinue
if ($aeco) {
    & aeco @args --repo $RepoRoot
} else {
    Write-Host "[WARN] aeco not found in PATH."
    Write-Host "[WARN] Install: go install github.com/sickn33/agent-ecosystem/cmd/aeco@latest"
    Write-Host "[WARN] Or download from: https://github.com/sickn33/agent-ecosystem/releases"
    exit 1
}
`
	psPath := filepath.Join(kitDir, "aeco.ps1")
	return os.WriteFile(psPath, []byte(ps), 0o644)
}
