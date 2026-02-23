package bridge

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/sickn33/agent-ecosystem/internal/config"
	"github.com/sickn33/agent-ecosystem/internal/profile"
	"github.com/sickn33/agent-ecosystem/internal/util"
)

// SkillCounts holds skill count info from index
type SkillCounts struct {
	Total       int
	OpenAI      int
	Antigravity int
}

// BuildTemplateVars creates the template variable map from profile + manifest
func BuildTemplateVars(prof *profile.Profile, manifest *config.Manifest, now time.Time) map[string]string {
	vars := map[string]string{
		"GENERATED_AT_UTC":            now.Format(time.RFC3339),
		"REPO_NAME":                   prof.RepoName,
		"ARCHITECTURE_SUMMARY":        prof.ArchitectureSummary,
		"KEY_ROOTS_MARKDOWN":          prof.KeyRootsMarkdown,
		"READ_FIRST_MARKDOWN":         prof.ReadFirstMarkdown,
		"CRITICAL_BEHAVIOR_HINT":      prof.CriticalBehaviorHint,
		"BACKEND_VALIDATION_COMMAND":  prof.BackendValidationCommand,
		"FRONTEND_VALIDATION_COMMAND": prof.FrontendValidationCommand,
		"BEHAVIOR_VALIDATION_HINT":    prof.BehaviorValidationHint,
		"STACK_ROUTING_HINT":          prof.StackRoutingHint,
		"COMMIT_BOUNDARY_HINT":        prof.CommitBoundaryHint,
		"DOC_UPDATE_HINT":             prof.DocUpdateHint,
		"DETECTED_LANGUAGES_MARKDOWN": prof.DetectedLanguagesMarkdown,
		"DETECTED_FRAMEWORKS_MARKDOWN": prof.DetectedFrameworksMarkdown,
		"BRIDGE_MODE":                 manifest.Copilot.BridgeMode,
		"READY_COMMAND":               config.ReadyCommand(manifest),
		"SPECFLOW_SECTION":            config.SpecflowSection(manifest),
		"SPECFLOW_DEFAULT_AI":         manifest.SpecWorkflow.DefaultAI,
		"SPECFLOW_DEFAULT_SCRIPT":     manifest.SpecWorkflow.DefaultScript,
	}
	return vars
}

// ReadSkillCounts reads counts from skills index JSON
func ReadSkillCounts(indexPath string) (*SkillCounts, error) {
	data, err := os.ReadFile(indexPath)
	if err != nil {
		return nil, err
	}

	var index struct {
		Total int `json:"total"`
		Skills []struct {
			Namespace string `json:"namespace"`
		} `json:"skills"`
	}
	if err := json.Unmarshal(data, &index); err != nil {
		return nil, err
	}

	counts := &SkillCounts{Total: index.Total}
	for _, s := range index.Skills {
		switch {
		case strings.HasPrefix(s.Namespace, "oa"):
			counts.OpenAI++
		case strings.HasPrefix(s.Namespace, "ag"):
			counts.Antigravity++
		}
	}

	if counts.Total == 0 {
		counts.Total = counts.OpenAI + counts.Antigravity
	}

	return counts, nil
}

// RenderAll renders all templates and writes output files
func RenderAll(repoRoot string, manifest *config.Manifest, vars map[string]string) ([]string, error) {
	var outputs []string

	// Define template → output mapping
	type mapping struct {
		Template string
		Output   string
	}

	mappings := []mapping{
		{"templates/copilot-instructions.md.hbs", manifest.Copilot.InstructionsOutput},
		{"templates/find-skill.prompt.md.hbs", filepath.Join(manifest.Copilot.PromptsDir, "find-skill.prompt.md")},
		{"templates/use-skill.prompt.md.hbs", filepath.Join(manifest.Copilot.PromptsDir, "use-skill.prompt.md")},
		{"templates/speckit-sdd.prompt.md.hbs", filepath.Join(manifest.Copilot.PromptsDir, "speckit-sdd.prompt.md")},
		{"templates/speckit-implement.prompt.md.hbs", filepath.Join(manifest.Copilot.PromptsDir, "speckit-implement.prompt.md")},
	}

	// Agent docs
	if manifest.AgentDocs.Enabled {
		for key, outputPath := range manifest.AgentDocs.Outputs {
			tmpl := templateForAgentDoc(key)
			if tmpl != "" {
				mappings = append(mappings, mapping{tmpl, outputPath})
			}
		}
	}

	// Frontend/backend instructions
	mappings = append(mappings,
		mapping{"templates/backend.instructions.md.hbs", ".github/instructions/backend.instructions.md"},
		mapping{"templates/frontend.instructions.md.hbs", ".github/instructions/frontend.instructions.md"},
	)

	// Skills index markdown
	if manifest.Copilot.SkillsIndexMD != "" {
		skillsMDPath := filepath.Join(repoRoot, manifest.Copilot.SkillsIndexMD)
		if !util.FileExists(skillsMDPath) {
			if err := os.MkdirAll(filepath.Dir(skillsMDPath), 0o755); err == nil {
				os.WriteFile(skillsMDPath, []byte("# Skills Index\n\nRun `aeco sync --apply` to populate.\n"), 0o644)
				outputs = append(outputs, manifest.Copilot.SkillsIndexMD)
			}
		}
	}

	for _, m := range mappings {
		content, err := renderTemplate(m.Template, vars)
		if err != nil {
			// Template might not exist in embedded FS; try from disk
			content, err = renderTemplateDisk(repoRoot, m.Template, vars)
			if err != nil {
				continue // Skip missing templates
			}
		}

		outPath := filepath.Join(repoRoot, m.Output)
		if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
			return outputs, err
		}
		if err := os.WriteFile(outPath, []byte(content), 0o644); err != nil {
			return outputs, fmt.Errorf("write %s: %w", m.Output, err)
		}
		outputs = append(outputs, m.Output)
	}

	return outputs, nil
}

func templateForAgentDoc(key string) string {
	switch key {
	case "agents_md":
		return "templates/agents.md.hbs"
	case "claude_md":
		return "templates/claude.md.hbs"
	case "gemini_md":
		return "templates/gemini.md.hbs"
	case "copilot_agent_md":
		return "templates/copilot-agent-instructions.md.hbs"
	case "codex_auto_prompt":
		return "templates/codex-auto-execute.prompt.md.hbs"
	default:
		return ""
	}
}

// renderTemplate renders a template from the embedded FS
func renderTemplate(templatePath string, vars map[string]string) (string, error) {
	data, err := util.ReadEmbeddedFile(templatePath)
	if err != nil {
		return "", err
	}
	return applyVars(string(data), vars), nil
}

// renderTemplateDisk renders a template from disk (tools/agent-ecosystem/templates/)
func renderTemplateDisk(repoRoot, templatePath string, vars map[string]string) (string, error) {
	// Try in kit dir
	kitPath := filepath.Join(repoRoot, "tools", "agent-ecosystem", templatePath)
	if util.FileExists(kitPath) {
		data, err := os.ReadFile(kitPath)
		if err != nil {
			return "", err
		}
		return applyVars(string(data), vars), nil
	}
	return "", fmt.Errorf("template not found: %s", templatePath)
}

// applyVars does simple {{KEY}} replacement
func applyVars(content string, vars map[string]string) string {
	for key, value := range vars {
		content = strings.ReplaceAll(content, "{{"+key+"}}", value)
	}
	return content
}
