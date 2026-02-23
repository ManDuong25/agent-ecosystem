package skills

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/sickn33/agent-ecosystem/internal/config"
	"github.com/sickn33/agent-ecosystem/internal/util"
)

// Index represents the skill index
type Index struct {
	Total  int      `json:"total"`
	Skills []Skill  `json:"skills"`
}

// Skill represents a single indexed skill
type Skill struct {
	ID        string `json:"id"`
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Source    string `json:"source"`
	Path      string `json:"path"`
}

// EnsureClone clones or fetches a git repo
func EnsureClone(repo, ref, targetDir string) error {
	repoURL := "https://github.com/" + repo + ".git"

	if util.DirExists(filepath.Join(targetDir, ".git")) {
		// Already cloned — just fetch + checkout
		cmd := exec.Command("git", "-C", targetDir, "fetch", "origin", ref)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("git fetch: %w", err)
		}

		cmd = exec.Command("git", "-C", targetDir, "checkout", "FETCH_HEAD")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		return cmd.Run()
	}

	// Fresh clone
	if err := os.MkdirAll(filepath.Dir(targetDir), 0o755); err != nil {
		return err
	}

	cmd := exec.Command("git", "clone", "--depth=1", "--branch", ref, repoURL, targetDir)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// BuildIndex scans cloned repos and builds skill index
func BuildIndex(manifest *config.Manifest, hubRoot string) (*Index, error) {
	var allSkills []Skill

	for sourceName, source := range manifest.Sources {
		prefix := sourceName
		if p, ok := manifest.Policies.NamespacePrefix[sourceName]; ok {
			prefix = p
		}

		repoDir := filepath.Join(hubRoot, "repos", sourceName)
		if !util.DirExists(repoDir) {
			continue
		}

		for _, searchPath := range source.Paths {
			skillsDir := filepath.Join(repoDir, searchPath)
			if !util.DirExists(skillsDir) {
				continue
			}

			entries, err := os.ReadDir(skillsDir)
			if err != nil {
				continue
			}

			for _, entry := range entries {
				if !entry.IsDir() {
					// Check for SKILL.md files directly
					if strings.ToLower(entry.Name()) == "skill.md" {
						continue
					}
					continue
				}

				skillDir := filepath.Join(skillsDir, entry.Name())
				skillMD := filepath.Join(skillDir, "SKILL.md")
				if !util.FileExists(skillMD) {
					// Also check skill.md (case insensitive)
					skillMD = filepath.Join(skillDir, "skill.md")
					if !util.FileExists(skillMD) {
						continue
					}
				}

				skillName := entry.Name()
				skillID := prefix + "-" + skillName
				relPath, _ := filepath.Rel(hubRoot, skillDir)

				allSkills = append(allSkills, Skill{
					ID:        skillID,
					Namespace: prefix,
					Name:      skillName,
					Source:    sourceName,
					Path:      util.NormalizePath(relPath),
				})
			}
		}
	}

	sort.Slice(allSkills, func(i, j int) bool {
		return allSkills[i].ID < allSkills[j].ID
	})

	return &Index{
		Total:  len(allSkills),
		Skills: allSkills,
	}, nil
}

// SyncToTarget copies skill files to a target directory
func SyncToTarget(index *Index, targetPath string) error {
	if err := os.MkdirAll(targetPath, 0o755); err != nil {
		return err
	}

	// Write the index
	indexPath := filepath.Join(targetPath, "skills-index.json")
	data, err := json.MarshalIndent(index, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(indexPath, data, 0o644)
}
