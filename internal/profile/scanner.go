package profile

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/sickn33/agent-ecosystem/internal/util"
)

// Profile contains all scanned repository metadata
type Profile struct {
	ScanAt                    string `json:"PROFILE_SCAN_AT_UTC"`
	RepoName                  string `json:"REPO_NAME"`
	FileCount                 int    `json:"REPO_FILE_COUNT"`
	ArchitectureSummary       string `json:"ARCHITECTURE_SUMMARY"`
	KeyRootsMarkdown          string `json:"KEY_ROOTS_MARKDOWN"`
	ReadFirstMarkdown         string `json:"READ_FIRST_MARKDOWN"`
	CriticalBehaviorHint      string `json:"CRITICAL_BEHAVIOR_HINT"`
	BackendValidationCommand  string `json:"BACKEND_VALIDATION_COMMAND"`
	FrontendValidationCommand string `json:"FRONTEND_VALIDATION_COMMAND"`
	BehaviorValidationHint    string `json:"BEHAVIOR_VALIDATION_HINT"`
	StackRoutingHint          string `json:"STACK_ROUTING_HINT"`
	CommitBoundaryHint        string `json:"COMMIT_BOUNDARY_HINT"`
	DocUpdateHint             string `json:"DOC_UPDATE_HINT"`
	DetectedLanguagesMarkdown string `json:"DETECTED_LANGUAGES_MARKDOWN"`
	DetectedFrameworksMarkdown string `json:"DETECTED_FRAMEWORKS_MARKDOWN"`
}

// ArtifactPaths holds output file paths
type ArtifactPaths struct {
	ProfileJSON string
	ProfileMD   string
}

// ScanRepo performs a full repository scan and returns a Profile
func ScanRepo(rootPath string) (*Profile, error) {
	repoName := filepath.Base(rootPath)
	scanAt := time.Now().UTC().Format(time.RFC3339)

	// Get all files
	files, err := getFileInventory(rootPath)
	if err != nil {
		return nil, fmt.Errorf("file inventory: %w", err)
	}

	fileSet := make(map[string]bool, len(files))
	for _, f := range files {
		fileSet[strings.ToLower(f)] = true
	}

	// Detect structure
	hasBackend := anyPrefix(files, "backend/")
	hasFrontend := anyPrefix(files, "frontend/")
	hasDocs := anyPrefix(files, "docs/")

	// Key roots
	keyRoots := detectKeyRoots(files)
	keyRootsMarkdown := joinInlineCode(keyRoots)

	// Languages
	languages := detectLanguages(files)
	languagesMarkdown := joinInlineCode(languages)
	if languagesMarkdown == "" {
		languagesMarkdown = "Unknown"
	}

	// Frameworks
	frameworks := detectFrameworks(rootPath, files, fileSet)
	frameworksMarkdown := joinInlineCode(frameworks.Names)
	if frameworksMarkdown == "" {
		frameworksMarkdown = "Unknown"
	}

	// Architecture summary
	archSummary := buildArchSummary(hasBackend, hasFrontend, languages, frameworks)

	// Read-first docs
	readFirst := detectReadFirst(fileSet)
	readFirstMarkdown := joinInlineCode(readFirst)

	// Behavior signals
	behaviorHint := detectBehaviorHint(files)

	// Validation commands
	backendCmd := detectBackendValidation(hasBackend, languages, frameworks, files, fileSet)
	frontendCmd := detectFrontendValidation(hasFrontend, frameworks, fileSet)
	behaviorValid := detectBehaviorValidation(files, frameworks, fileSet)

	// Routing hints
	stackHint := buildStackRoutingHint(hasBackend, hasFrontend, languages, frameworks)
	commitHint := buildCommitBoundaryHint(hasBackend, hasFrontend)
	docHint := buildDocUpdateHint(hasDocs, fileSet)

	return &Profile{
		ScanAt:                    scanAt,
		RepoName:                  repoName,
		FileCount:                 len(files),
		ArchitectureSummary:       archSummary,
		KeyRootsMarkdown:          keyRootsMarkdown,
		ReadFirstMarkdown:         readFirstMarkdown,
		CriticalBehaviorHint:      behaviorHint,
		BackendValidationCommand:  backendCmd,
		FrontendValidationCommand: frontendCmd,
		BehaviorValidationHint:    behaviorValid,
		StackRoutingHint:          stackHint,
		CommitBoundaryHint:        commitHint,
		DocUpdateHint:             docHint,
		DetectedLanguagesMarkdown: languagesMarkdown,
		DetectedFrameworksMarkdown: frameworksMarkdown,
	}, nil
}

// LoadOrScan loads existing profile or scans fresh
func LoadOrScan(repoRoot string) (*Profile, error) {
	jsonPath := filepath.Join(repoRoot, "docs", "ai", "repo-profile.json")
	if util.FileExists(jsonPath) {
		data, err := os.ReadFile(jsonPath)
		if err == nil {
			prof := &Profile{}
			if json.Unmarshal(data, prof) == nil && prof.RepoName != "" {
				return prof, nil
			}
		}
	}
	return ScanRepo(repoRoot)
}

// WriteArtifacts writes profile JSON and markdown files
func WriteArtifacts(repoRoot string, prof *Profile) (*ArtifactPaths, error) {
	jsonPath := filepath.Join(repoRoot, "docs", "ai", "repo-profile.json")
	mdPath := filepath.Join(repoRoot, "docs", "ai", "repo-profile.md")

	if err := os.MkdirAll(filepath.Dir(jsonPath), 0o755); err != nil {
		return nil, err
	}

	if err := util.WriteJSON(jsonPath, prof); err != nil {
		return nil, fmt.Errorf("write json: %w", err)
	}

	md := buildProfileMarkdown(prof)
	if err := os.WriteFile(mdPath, []byte(md), 0o644); err != nil {
		return nil, fmt.Errorf("write markdown: %w", err)
	}

	return &ArtifactPaths{ProfileJSON: jsonPath, ProfileMD: mdPath}, nil
}

// --- File inventory ---

func getFileInventory(rootPath string) ([]string, error) {
	var files []string

	// Try ripgrep first (fast)
	if util.CommandExists("rg") {
		cmd := exec.Command("rg", "--files", "--hidden", "-g", "!.git", "-g", "!**/.git/**")
		cmd.Dir = rootPath
		out, err := cmd.Output()
		if err == nil {
			for _, line := range strings.Split(string(out), "\n") {
				line = strings.TrimSpace(line)
				line = util.NormalizePath(line)
				for strings.HasPrefix(line, "./") {
					line = line[2:]
				}
				if line == "" || strings.HasPrefix(strings.ToLower(line), ".git/") {
					continue
				}
				files = append(files, line)
			}
		}
	}

	// Fallback: Go's filepath.Walk
	if len(files) == 0 {
		err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil // skip errors
			}
			if info.IsDir() {
				base := filepath.Base(path)
				if base == ".git" || base == "node_modules" {
					return filepath.SkipDir
				}
				return nil
			}
			rel, err := filepath.Rel(rootPath, path)
			if err != nil {
				return nil
			}
			rel = util.NormalizePath(rel)
			if !strings.HasPrefix(strings.ToLower(rel), ".git/") {
				files = append(files, rel)
			}
			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	sort.Strings(files)
	return files, nil
}

// --- Detection helpers ---

func anyPrefix(files []string, prefix string) bool {
	for _, f := range files {
		if strings.HasPrefix(f, prefix) {
			return true
		}
	}
	return false
}

type frameworkResult struct {
	Names              []string
	Set                map[string]bool
	HasPlaywright      bool
	HasLint            bool
	HasBuild           bool
	HasTest            bool
	HasPytest          bool
}

func detectKeyRoots(files []string) []string {
	counts := map[string]int{}
	for _, f := range files {
		idx := strings.Index(f, "/")
		root := "./"
		if idx >= 0 {
			root = f[:idx] + "/"
		}
		counts[root]++
	}

	type kv struct {
		Key   string
		Count int
	}
	var sorted []kv
	for k, v := range counts {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].Count != sorted[j].Count {
			return sorted[i].Count > sorted[j].Count
		}
		return sorted[i].Key < sorted[j].Key
	})

	var roots []string
	for i, kv := range sorted {
		if i >= 10 {
			break
		}
		roots = append(roots, kv.Key)
	}
	if len(roots) == 0 {
		roots = []string{"./"}
	}
	return roots
}

var langExtMap = map[string]string{
	".py":     "Python",
	".js":     "JavaScript",
	".jsx":    "JavaScript/JSX",
	".ts":     "TypeScript",
	".tsx":    "TypeScript/TSX",
	".java":   "Java",
	".kt":     "Kotlin",
	".go":     "Go",
	".rs":     "Rust",
	".cs":     ".NET/C#",
	".php":    "PHP",
	".rb":     "Ruby",
	".swift":  "Swift",
	".scala":  "Scala",
	".vue":    "Vue SFC",
	".svelte": "Svelte",
	".sql":    "SQL",
}

func detectLanguages(files []string) []string {
	counts := map[string]int{}
	for _, f := range files {
		ext := strings.ToLower(filepath.Ext(f))
		if lang, ok := langExtMap[ext]; ok {
			counts[lang]++
		}
	}

	type kv struct {
		Key   string
		Count int
	}
	var sorted []kv
	for k, v := range counts {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].Count != sorted[j].Count {
			return sorted[i].Count > sorted[j].Count
		}
		return sorted[i].Key < sorted[j].Key
	})

	var langs []string
	for i, kv := range sorted {
		if i >= 8 {
			break
		}
		langs = append(langs, kv.Key)
	}
	return langs
}

func detectFrameworks(rootPath string, files []string, fileSet map[string]bool) *frameworkResult {
	r := &frameworkResult{
		Set: make(map[string]bool),
	}

	// Scan package.json files
	for _, f := range files {
		lower := strings.ToLower(f)
		if !strings.HasSuffix(lower, "package.json") || strings.Contains(lower, "node_modules/") {
			continue
		}

		absPath := filepath.Join(rootPath, f)
		raw := util.ReadFileSafe(absPath)
		if raw == "" {
			continue
		}

		var pkg map[string]json.RawMessage
		if json.Unmarshal([]byte(raw), &pkg) != nil {
			continue
		}

		deps := collectDeps(pkg)

		if deps["react"] {
			r.Set["React"] = true
		}
		if deps["vite"] {
			r.Set["Vite"] = true
		}
		if deps["next"] {
			r.Set["Next.js"] = true
		}
		if deps["nuxt"] {
			r.Set["Nuxt"] = true
		}
		if deps["vue"] {
			r.Set["Vue"] = true
		}
		if deps["svelte"] {
			r.Set["Svelte"] = true
		}
		if deps["@angular/core"] {
			r.Set["Angular"] = true
		}
		if deps["express"] {
			r.Set["Express"] = true
		}
		if deps["@nestjs/core"] {
			r.Set["NestJS"] = true
		}
		if deps["@playwright/test"] {
			r.Set["Playwright"] = true
			r.HasPlaywright = true
		}
		if deps["cypress"] {
			r.Set["Cypress"] = true
		}

		// Check scripts
		if rawScripts, ok := pkg["scripts"]; ok {
			var scripts map[string]string
			if json.Unmarshal(rawScripts, &scripts) == nil {
				if _, ok := scripts["lint"]; ok {
					r.HasLint = true
				}
				if _, ok := scripts["build"]; ok {
					r.HasBuild = true
				}
				if _, ok := scripts["test"]; ok {
					r.HasTest = true
				}
				if _, ok := scripts["test:e2e"]; ok {
					r.HasTest = true
				}
			}
		}
	}

	// Scan Python configs
	for _, f := range files {
		lower := strings.ToLower(f)
		if !strings.Contains(lower, "requirements") && !strings.HasSuffix(lower, "pyproject.toml") {
			continue
		}

		raw := util.ReadFileSafe(filepath.Join(rootPath, f))
		if raw == "" {
			continue
		}

		if containsCI(raw, "fastapi") {
			r.Set["FastAPI"] = true
		}
		if containsCI(raw, "django") {
			r.Set["Django"] = true
		}
		if containsCI(raw, "flask") {
			r.Set["Flask"] = true
		}
		if containsCI(raw, "pytest") {
			r.HasPytest = true
		}
	}

	// Check for conftest.py or pytest.ini
	for _, f := range files {
		base := strings.ToLower(filepath.Base(f))
		if base == "conftest.py" || base == "pytest.ini" {
			r.HasPytest = true
			break
		}
	}

	// Build system detection
	for _, f := range files {
		lower := strings.ToLower(f)
		base := filepath.Base(lower)
		switch {
		case base == "go.mod":
			r.Set["Go Modules"] = true
		case base == "cargo.toml":
			r.Set["Cargo"] = true
		case base == "pom.xml":
			r.Set["Maven"] = true
		case base == "build.gradle" || base == "build.gradle.kts":
			r.Set["Gradle"] = true
		case strings.HasSuffix(base, ".csproj"):
			r.Set[".NET"] = true
		}
	}

	// Collect sorted names
	for name := range r.Set {
		r.Names = append(r.Names, name)
	}
	sort.Strings(r.Names)

	return r
}

func collectDeps(pkg map[string]json.RawMessage) map[string]bool {
	deps := make(map[string]bool)
	for _, key := range []string{"dependencies", "devDependencies", "peerDependencies", "optionalDependencies"} {
		raw, ok := pkg[key]
		if !ok {
			continue
		}
		var m map[string]string
		if json.Unmarshal(raw, &m) == nil {
			for name := range m {
				deps[name] = true
			}
		}
	}
	return deps
}

func containsCI(text, substr string) bool {
	return strings.Contains(strings.ToLower(text), strings.ToLower(substr))
}

func detectReadFirst(fileSet map[string]bool) []string {
	candidates := []string{
		"AGENTS.md", "CONVENTIONS.md", "README.md",
		"docs/TESTING.md", "docs/BUSINESS_LOGIC.md",
		"docs/FEATURES.md", "docs/ERRORS.md", "CONTRIBUTING.md",
	}
	var found []string
	for _, c := range candidates {
		if fileSet[strings.ToLower(c)] {
			found = append(found, c)
		}
	}
	if len(found) == 0 {
		found = []string{"README.md"}
	}
	return found
}

func detectBehaviorHint(files []string) string {
	signals := map[string]bool{}
	for _, f := range files {
		lower := strings.ToLower(f)
		if strings.Contains(lower, "map") || strings.Contains(lower, "leaflet") || strings.Contains(lower, "maplibre") {
			signals["map"] = true
		}
		if strings.Contains(lower, "geofence") || strings.Contains(lower, "location") {
			signals["geofence/location"] = true
		}
		if strings.Contains(lower, "narrat") || strings.Contains(lower, "audio") || strings.Contains(lower, "tts") || strings.Contains(lower, "voice") || strings.Contains(lower, "speech") {
			signals["narration/audio"] = true
		}
		if strings.Contains(lower, "offline") || strings.Contains(lower, "serviceworker") || strings.Contains(lower, "pwa") || strings.Contains(lower, "cache") {
			signals["offline-first"] = true
		}
		if strings.Contains(lower, "localiz") || strings.Contains(lower, "i18n") || strings.Contains(lower, "lang") {
			signals["language lane"] = true
		}
	}

	if len(signals) == 0 {
		return "Preserve existing core behavior and API compatibility."
	}

	var names []string
	for k := range signals {
		names = append(names, k)
	}
	sort.Strings(names)

	return "Preserve " + strings.Join(names, ", ") + " behavior and avoid regressions."
}

func buildArchSummary(hasBackend, hasFrontend bool, languages []string, fw *frameworkResult) string {
	hasLang := func(l string) bool {
		for _, lang := range languages {
			if lang == l {
				return true
			}
		}
		return false
	}

	if hasBackend && hasFrontend {
		if fw.Set["FastAPI"] && fw.Set["React"] && fw.Set["Vite"] {
			return "FastAPI backend + React/Vite frontend (full-stack web application)."
		}
		return "Full-stack repository with backend and frontend modules."
	}
	if hasBackend {
		if fw.Set["FastAPI"] {
			return "Backend service built with FastAPI/Python."
		}
		if hasLang("Python") {
			return "Backend-focused Python repository."
		}
		return "Backend-focused repository."
	}
	if hasFrontend {
		if fw.Set["React"] && fw.Set["Vite"] {
			return "Frontend application built with React and Vite."
		}
		return "Frontend-focused repository."
	}
	return "Repository with mixed/custom structure."
}

func detectBackendValidation(hasBackend bool, languages []string, fw *frameworkResult, files []string, fileSet map[string]bool) string {
	hasLang := func(l string) bool {
		for _, lang := range languages {
			if lang == l {
				return true
			}
		}
		return false
	}

	hasBackendTests := anyPrefix(files, "backend/tests/")
	hasRootTests := anyPrefix(files, "tests/")

	if hasBackend {
		if hasLang("Python") && (fw.HasPytest || hasBackendTests || hasRootTests) {
			return "cd backend && python -m pytest -q"
		}
		if fileSet["backend/go.mod"] {
			return "cd backend && go test ./..."
		}
		if fileSet["backend/cargo.toml"] {
			return "cd backend && cargo test"
		}
		if fileSet["backend/pom.xml"] {
			return "cd backend && mvn test"
		}
		if fileSet["backend/package.json"] {
			return "cd backend && npm run test --if-present"
		}
		return "cd backend"
	}
	if hasLang("Python") && (fw.HasPytest || hasRootTests) {
		return "python -m pytest -q"
	}
	return "N/A (no backend directory detected)"
}

func detectFrontendValidation(hasFrontend bool, fw *frameworkResult, fileSet map[string]bool) string {
	if hasFrontend {
		if fw.HasLint && fw.HasBuild {
			return "cd frontend && npm run lint && npm run build"
		}
		if fw.HasBuild {
			return "cd frontend && npm run build"
		}
		if fw.HasTest {
			return "cd frontend && npm run test --if-present"
		}
		if fileSet["frontend/package.json"] {
			return "cd frontend && npm run test --if-present"
		}
		return "cd frontend"
	}
	if fileSet["package.json"] {
		return "npm run lint --if-present && npm run build --if-present"
	}
	return "N/A (no frontend directory detected)"
}

func detectBehaviorValidation(files []string, fw *frameworkResult, fileSet map[string]bool) string {
	hasPlaywrightConfig := false
	for _, f := range files {
		base := strings.ToLower(filepath.Base(f))
		if strings.HasPrefix(base, "playwright.config.") {
			hasPlaywrightConfig = true
			break
		}
	}
	hasFrontendTests := anyPrefix(files, "frontend/tests/")

	if hasPlaywrightConfig || fw.HasPlaywright {
		if hasFrontendTests {
			return "Run targeted Playwright specs in `frontend/tests`."
		}
		return "Run targeted Playwright specs using repository test commands."
	}
	if fw.Set["Cypress"] {
		return "Run targeted Cypress specs for affected user journeys."
	}
	if fw.HasTest {
		return "Run targeted frontend test scripts for affected user journeys."
	}
	return "Run targeted regression checks for affected user journeys."
}

func buildStackRoutingHint(hasBackend, hasFrontend bool, languages []string, fw *frameworkResult) string {
	hasLang := func(l string) bool {
		for _, lang := range languages {
			if lang == l {
				return true
			}
		}
		return false
	}

	if hasBackend && hasFrontend {
		backendLabel := "backend stack"
		if fw.Set["FastAPI"] {
			backendLabel = "FastAPI/Python"
		} else if hasLang("Python") {
			backendLabel = "Python backend"
		}
		frontendLabel := "frontend stack"
		if fw.Set["React"] || fw.Set["Vite"] {
			frontendLabel = "React/Vite"
		}
		return fmt.Sprintf("Prefer skills matching backend (%s) and frontend (%s) context.", backendLabel, frontendLabel)
	}
	if hasBackend {
		return "Prefer skills aligned with backend service development."
	}
	if hasFrontend {
		return "Prefer skills aligned with frontend application development."
	}
	return "Prefer skills aligned with the most impacted subsystem."
}

func buildCommitBoundaryHint(hasBackend, hasFrontend bool) string {
	if hasBackend && hasFrontend {
		return "Prefer atomic changes by layer (backend vs frontend) when possible."
	}
	return "Keep changes small and scoped to a single module."
}

func buildDocUpdateHint(hasDocs bool, fileSet map[string]bool) string {
	if hasDocs || fileSet["docs/testing.md"] {
		return "When behavior/logic changes, update `docs/BUSINESS_LOGIC.md`, `docs/TESTING.md`, `docs/FEATURES.md`, and `docs/ERRORS.md`."
	}
	return "When behavior/logic changes, update the repository's canonical docs."
}

// --- Markdown helpers ---

func inlineCode(s string) string {
	return "`" + s + "`"
}

func joinInlineCode(items []string) string {
	coded := make([]string, len(items))
	for i, item := range items {
		coded[i] = inlineCode(item)
	}
	return strings.Join(coded, ", ")
}

func buildProfileMarkdown(prof *Profile) string {
	lines := []string{
		"# Repository Profile",
		"",
		"- Scanned at: " + prof.ScanAt,
		"- Repo name: " + prof.RepoName,
		"- Architecture: " + prof.ArchitectureSummary,
		fmt.Sprintf("- Files scanned: %d", prof.FileCount),
		"- Key roots: " + prof.KeyRootsMarkdown,
		"- Languages: " + prof.DetectedLanguagesMarkdown,
		"- Frameworks: " + prof.DetectedFrameworksMarkdown,
		"- Read first: " + prof.ReadFirstMarkdown,
		"- Behavior hint: " + prof.CriticalBehaviorHint,
		"- Backend validation: " + inlineCode(prof.BackendValidationCommand),
		"- Frontend validation: " + inlineCode(prof.FrontendValidationCommand),
		"- Behavior-sensitive validation: " + prof.BehaviorValidationHint,
		"",
		"## Notes",
		"- Generated by `aeco profile` via repository-wide scan.",
		"- Regenerate with: `aeco profile`",
	}
	return strings.Join(lines, "\n")
}
