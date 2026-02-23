package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	version = "0.1.0"
	rootCmd = &cobra.Command{
		Use:   "aeco",
		Short: "Agent Ecosystem CLI — universal AI agent workflow bootstrapper",
		Long: `aeco is a cross-platform CLI that scans any repository, generates agent
instructions for multiple AI platforms (GitHub Copilot, Claude, Codex,
Gemini, Cursor, Kiro), and enforces a spec-driven development workflow.

One command. Any repo. Every agent gets the same standardized context.`,
		Version: version,
	}
)

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.CompletionOptions.HiddenDefaultCmd = true
	rootCmd.SetVersionTemplate(fmt.Sprintf("aeco v%s\n", version))

	// Global flags
	rootCmd.PersistentFlags().StringP("manifest", "m", "", "Path to skills.manifest.yaml (default: auto-detect)")
	rootCmd.PersistentFlags().StringP("repo", "r", "", "Repository root (default: git rev-parse or cwd)")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Verbose output")

	// Register subcommands
	rootCmd.AddCommand(
		doctorCmd,
		profileCmd,
		bootstrapCmd,
		syncCmd,
		verifyCmd,
		exportCmd,
		updateCmd,
		initCmd,
		installCmd,
		readyCmd,
	)
}

func logInfo(format string, args ...any) {
	fmt.Fprintf(os.Stdout, "[INFO] "+format+"\n", args...)
}

func logWarn(format string, args ...any) {
	fmt.Fprintf(os.Stdout, "\033[33m[WARN]\033[0m "+format+"\n", args...)
}

func logError(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "\033[31m[ERROR]\033[0m "+format+"\n", args...)
}

func logSuccess(format string, args ...any) {
	fmt.Fprintf(os.Stdout, "\033[32m[OK]\033[0m "+format+"\n", args...)
}
