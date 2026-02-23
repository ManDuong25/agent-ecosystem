package util

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/spf13/cobra"
)

// CommandExists checks if a command is available in PATH
func CommandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// FileExists checks if a file exists and is not a directory
func FileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

// DirExists checks if a directory exists
func DirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

// ExpandHome expands ~ to home directory
func ExpandHome(path string) string {
	if strings.HasPrefix(path, "~/") || path == "~" {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return filepath.Join(home, path[1:])
	}
	return path
}

// FindRepoRoot finds the git repo root from a starting dir
func FindRepoRoot(startDir string) (string, error) {
	if startDir == "" {
		var err error
		startDir, err = os.Getwd()
		if err != nil {
			return "", err
		}
	}

	cmd := exec.Command("git", "-C", startDir, "rev-parse", "--show-toplevel")
	out, err := cmd.Output()
	if err == nil {
		root := strings.TrimSpace(string(out))
		if root != "" {
			return filepath.Abs(root)
		}
	}

	// Fallback: walk up looking for .git
	dir := startDir
	for {
		if DirExists(filepath.Join(dir, ".git")) {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return startDir, nil
}

// ResolveRepoRoot resolves the repo root from cobra flags or auto-detection
func ResolveRepoRoot(cmd *cobra.Command) (string, error) {
	if p, _ := cmd.Flags().GetString("repo"); p != "" {
		return filepath.Abs(p)
	}
	cwd, _ := os.Getwd()
	return FindRepoRoot(cwd)
}

// WriteJSON writes data as indented JSON
func WriteJSON(path string, data any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0o644)
}

// ReadJSON reads JSON from a file
func ReadJSON(path string, dest any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dest)
}

// IsWindows returns true on Windows
func IsWindows() bool {
	return runtime.GOOS == "windows"
}

// Platform returns the current OS name
func Platform() string {
	return runtime.GOOS + "/" + runtime.GOARCH
}

// NormalizePath normalizes path separators to /
func NormalizePath(p string) string {
	return strings.ReplaceAll(p, "\\", "/")
}

// ReadFileSafe reads a file, returns empty string on error
func ReadFileSafe(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return string(data)
}
