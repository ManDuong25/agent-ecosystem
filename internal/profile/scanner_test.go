package profile

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScanRepo(t *testing.T) {
	// Create a minimal repo structure in temp dir
	tmpDir := t.TempDir()

	// Create some files to simulate a repo
	dirs := []string{
		"backend/app",
		"frontend/src",
		"docs",
		"tests",
	}
	for _, d := range dirs {
		os.MkdirAll(filepath.Join(tmpDir, d), 0o755)
	}

	files := map[string]string{
		"backend/requirements.txt":  "fastapi\nuvicorn\npytest\n",
		"backend/app/main.py":       "from fastapi import FastAPI\n",
		"backend/tests/conftest.py":  "import pytest\n",
		"frontend/package.json":     `{"dependencies":{"react":"^18","vite":"^5"},"scripts":{"lint":"eslint .","build":"vite build"}}`,
		"frontend/src/App.jsx":      "export default function App() { return <div/>; }\n",
		"docs/TESTING.md":           "# Testing\n",
		"README.md":                 "# Test Repo\n",
	}

	for path, content := range files {
		fullPath := filepath.Join(tmpDir, path)
		os.MkdirAll(filepath.Dir(fullPath), 0o755)
		os.WriteFile(fullPath, []byte(content), 0o644)
	}

	prof, err := ScanRepo(tmpDir)
	if err != nil {
		t.Fatalf("ScanRepo failed: %v", err)
	}

	if prof.RepoName == "" {
		t.Error("RepoName should not be empty")
	}

	if prof.FileCount < 5 {
		t.Errorf("Expected at least 5 files, got %d", prof.FileCount)
	}

	if prof.ArchitectureSummary == "" {
		t.Error("ArchitectureSummary should not be empty")
	}

	// Check that FastAPI + React/Vite detected
	expectedArch := "FastAPI backend + React/Vite frontend (full-stack web application)."
	if prof.ArchitectureSummary != expectedArch {
		t.Errorf("Expected arch '%s', got '%s'", expectedArch, prof.ArchitectureSummary)
	}

	if prof.BackendValidationCommand != "cd backend && python -m pytest -q" {
		t.Errorf("Expected pytest backend command, got '%s'", prof.BackendValidationCommand)
	}

	if prof.FrontendValidationCommand != "cd frontend && npm run lint && npm run build" {
		t.Errorf("Expected lint+build frontend command, got '%s'", prof.FrontendValidationCommand)
	}
}

func TestWriteArtifacts(t *testing.T) {
	tmpDir := t.TempDir()

	prof := &Profile{
		ScanAt:                    "2026-02-22T00:00:00Z",
		RepoName:                  "test-repo",
		FileCount:                 42,
		ArchitectureSummary:       "Test architecture.",
		KeyRootsMarkdown:          "`backend/`, `frontend/`",
		DetectedLanguagesMarkdown: "`Python`, `TypeScript`",
		DetectedFrameworksMarkdown: "`FastAPI`, `React`",
	}

	paths, err := WriteArtifacts(tmpDir, prof)
	if err != nil {
		t.Fatalf("WriteArtifacts failed: %v", err)
	}

	if _, err := os.Stat(paths.ProfileJSON); err != nil {
		t.Errorf("Profile JSON not created: %v", err)
	}

	if _, err := os.Stat(paths.ProfileMD); err != nil {
		t.Errorf("Profile MD not created: %v", err)
	}
}

func TestDetectLanguages(t *testing.T) {
	files := []string{
		"backend/app/main.py",
		"backend/app/utils.py",
		"frontend/src/App.tsx",
		"frontend/src/index.ts",
	}

	langs := detectLanguages(files)
	if len(langs) == 0 {
		t.Error("Expected detected languages")
	}
}

func TestDetectKeyRoots(t *testing.T) {
	files := []string{
		"backend/app/main.py",
		"backend/tests/test.py",
		"frontend/src/App.tsx",
		"docs/README.md",
	}

	roots := detectKeyRoots(files)
	if len(roots) == 0 {
		t.Error("Expected key roots")
	}
	if roots[0] != "backend/" {
		t.Errorf("Expected 'backend/' as first root, got '%s'", roots[0])
	}
}
