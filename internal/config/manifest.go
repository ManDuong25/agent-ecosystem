package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/sickn33/agent-ecosystem/internal/util"
	"github.com/spf13/cobra"
)

// Manifest represents skills.manifest.yaml
type Manifest struct {
	Version  int               `json:"version" yaml:"version"`
	HubRoot  string            `json:"hub_root" yaml:"hub_root"`
	Sources  map[string]Source  `json:"sources" yaml:"sources"`
	Policies Policies          `json:"policies" yaml:"policies"`
	Targets  map[string]Target `json:"targets" yaml:"targets"`
	Copilot  CopilotConfig     `json:"copilot" yaml:"copilot"`
	AgentDocs AgentDocsConfig  `json:"agent_docs" yaml:"agent_docs"`
	SpecWorkflow SpecWorkflow  `json:"spec_workflow" yaml:"spec_workflow"`
	Security SecurityConfig    `json:"security" yaml:"security"`
}

type Source struct {
	Repo  string   `json:"repo" yaml:"repo"`
	Ref   string   `json:"ref" yaml:"ref"`
	Paths []string `json:"paths" yaml:"paths"`
}

type Policies struct {
	NamespacePrefix map[string]string `json:"namespace_prefix" yaml:"namespace_prefix"`
	CopyFallback    bool              `json:"copy_fallback" yaml:"copy_fallback"`
}

type Target struct {
	Enabled bool   `json:"enabled" yaml:"enabled"`
	Path    string `json:"path" yaml:"path"`
}

type CopilotConfig struct {
	BridgeMode         string `json:"bridge_mode" yaml:"bridge_mode"`
	InstructionsOutput string `json:"instructions_output" yaml:"instructions_output"`
	PromptsDir         string `json:"prompts_dir" yaml:"prompts_dir"`
	SkillsIndexMD      string `json:"skills_index_markdown" yaml:"skills_index_markdown"`
}

type AgentDocsConfig struct {
	Enabled bool              `json:"enabled" yaml:"enabled"`
	Outputs map[string]string `json:"outputs" yaml:"outputs"`
}

type SpecWorkflow struct {
	Enabled              bool   `json:"enabled" yaml:"enabled"`
	Provider             string `json:"provider" yaml:"provider"`
	Repo                 string `json:"repo" yaml:"repo"`
	DefaultAI            string `json:"default_ai" yaml:"default_ai"`
	DefaultScript        string `json:"default_script" yaml:"default_script"`
	DefaultHere          bool   `json:"default_here" yaml:"default_here"`
	DefaultIgnoreAgentTools bool `json:"default_ignore_agent_tools" yaml:"default_ignore_agent_tools"`
	DefaultForce         bool   `json:"default_force" yaml:"default_force"`
	PreserveRepoTemplates bool  `json:"preserve_repo_templates" yaml:"preserve_repo_templates"`
}

type SecurityConfig struct {
	AllowExecFiles bool `json:"allow_exec_files" yaml:"allow_exec_files"`
}

// ExpandHubRoot expands ~ to home dir
func ExpandHubRoot(hubRoot string) string {
	return util.ExpandHome(hubRoot)
}

// IndexJSONPath returns the full path to the skills index
func IndexJSONPath(m *Manifest) string {
	return filepath.Join(ExpandHubRoot(m.HubRoot), "indexes", "skills-index.json")
}

// LoadManifest loads the manifest from flag or auto-detect
func LoadManifest(cmd *cobra.Command) (*Manifest, error) {
	path, err := ResolveManifestPath(cmd)
	if err != nil {
		return nil, err
	}
	return loadManifestFile(path)
}

// ResolveManifestPath finds the manifest file
func ResolveManifestPath(cmd *cobra.Command) (string, error) {
	// Check flag first
	if p, _ := cmd.Flags().GetString("manifest"); p != "" {
		if util.FileExists(p) {
			return filepath.Abs(p)
		}
		return "", fmt.Errorf("manifest not found: %s", p)
	}

	// Check common locations
	candidates := []string{
		"tools/agent-ecosystem/skills.manifest.yaml",
		"skills.manifest.yaml",
		".agent-ecosystem/skills.manifest.yaml",
	}

	// Try relative to repo root
	repoRoot, _ := util.FindRepoRoot("")
	if repoRoot != "" {
		for _, c := range candidates {
			p := filepath.Join(repoRoot, c)
			if util.FileExists(p) {
				return p, nil
			}
		}
	}

	// Try relative to cwd
	cwd, _ := os.Getwd()
	for _, c := range candidates {
		p := filepath.Join(cwd, c)
		if util.FileExists(p) {
			return p, nil
		}
	}

	// Try next to executable
	exe, _ := os.Executable()
	if exe != "" {
		exeDir := filepath.Dir(exe)
		p := filepath.Join(exeDir, "skills.manifest.yaml")
		if util.FileExists(p) {
			return p, nil
		}
	}

	// Return default path (will be created by init)
	if repoRoot != "" {
		return filepath.Join(repoRoot, "tools", "agent-ecosystem", "skills.manifest.yaml"), nil
	}
	return filepath.Join(cwd, "tools", "agent-ecosystem", "skills.manifest.yaml"), nil
}

func loadManifestFile(path string) (*Manifest, error) {
	if !util.FileExists(path) {
		// Return default manifest if file doesn't exist
		return DefaultManifest(), nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read manifest: %w", err)
	}

	// The manifest is stored as JSON (despite .yaml extension in the original)
	m := &Manifest{}
	if err := json.Unmarshal(data, m); err != nil {
		return nil, fmt.Errorf("parse manifest: %w", err)
	}

	return m, nil
}

// SaveManifest writes manifest back to disk
func SaveManifest(path string, m *Manifest) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return util.WriteJSON(path, m)
}

// DefaultManifest returns a sensible default manifest
func DefaultManifest() *Manifest {
	home := "~/.agent-skills-hub"
	return &Manifest{
		Version: 1,
		HubRoot: home,
		Sources: map[string]Source{
			"openai": {
				Repo:  "openai/skills",
				Ref:   "main",
				Paths: []string{"skills/.curated"},
			},
			"antigravity": {
				Repo:  "sickn33/antigravity-awesome-skills",
				Ref:   "main",
				Paths: []string{"skills"},
			},
		},
		Policies: Policies{
			NamespacePrefix: map[string]string{
				"openai":      "oa",
				"antigravity": "ag",
			},
			CopyFallback: true,
		},
		Targets: map[string]Target{
			"codex":       {Enabled: true, Path: "~/.codex/skills"},
			"antigravity": {Enabled: true, Path: "~/.gemini/antigravity/skills"},
			"claude":      {Enabled: true, Path: "~/.claude/skills"},
			"gemini":      {Enabled: true, Path: "~/.gemini/skills"},
			"cursor":      {Enabled: true, Path: "~/.cursor/skills"},
			"kiro":        {Enabled: true, Path: "~/.kiro/skills"},
		},
		Copilot: CopilotConfig{
			BridgeMode:         "hybrid",
			InstructionsOutput: ".github/copilot-instructions.md",
			PromptsDir:         ".github/prompts",
			SkillsIndexMD:      "docs/ai/skills-index.md",
		},
		AgentDocs: AgentDocsConfig{
			Enabled: true,
			Outputs: map[string]string{
				"agents_md":          "AGENTS.md",
				"claude_md":          "CLAUDE.md",
				"gemini_md":          "GEMINI.md",
				"copilot_agent_md":   ".github/agents/copilot-instructions.md",
				"codex_auto_prompt":  ".codex/prompts/auto-execute.prompt.md",
			},
		},
		SpecWorkflow: SpecWorkflow{
			Enabled:              true,
			Provider:             "spec-kit",
			Repo:                 "github/spec-kit",
			DefaultAI:            "codex",
			DefaultScript:        "ps",
			DefaultHere:          true,
			DefaultIgnoreAgentTools: true,
			DefaultForce:         true,
			PreserveRepoTemplates: true,
		},
		Security: SecurityConfig{
			AllowExecFiles: false,
		},
	}
}

// ReadyCommand returns the canonical ready command for templates
func ReadyCommand(m *Manifest) string {
	_ = m
	return "aeco ready --quick"
}

// SpecflowSection returns the specflow markdown section if enabled
func SpecflowSection(m *Manifest) string {
	if !m.SpecWorkflow.Enabled {
		return ""
	}
	lines := []string{
		"",
		"## Spec-Driven Workflow (Spec-Kit)",
		"- This repo supports a multi-agent SDD flow via `aeco` CLI.",
		"- Core chat commands after init: /speckit.specify, /speckit.plan, /speckit.tasks, /speckit.implement",
	}
	return strings.Join(lines, "\n")
}
