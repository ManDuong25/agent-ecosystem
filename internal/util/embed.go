package util

import (
	"io/fs"
	"os"
	"path/filepath"
)

var embeddedAssets fs.FS

// SetEmbeddedFS sets the embedded filesystem for template/config access
func SetEmbeddedFS(fsys fs.FS) {
	embeddedAssets = fsys
}

// GetEmbeddedFS returns the current embedded filesystem
func GetEmbeddedFS() fs.FS {
	return embeddedAssets
}

// WriteEmbeddedFile writes a single embedded file to disk
func WriteEmbeddedFile(embeddedPath string, destPath string) error {
	if embeddedAssets == nil {
		return os.ErrNotExist
	}

	data, err := fs.ReadFile(embeddedAssets, embeddedPath)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
		return err
	}

	return os.WriteFile(destPath, data, 0o644)
}

// WriteEmbeddedDir copies an embedded directory tree to disk
func WriteEmbeddedDir(embeddedDir string, destDir string) error {
	if embeddedAssets == nil {
		return os.ErrNotExist
	}

	return fs.WalkDir(embeddedAssets, embeddedDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Calculate relative path
		rel, err := filepath.Rel(embeddedDir, path)
		if err != nil {
			return err
		}

		destPath := filepath.Join(destDir, rel)

		if d.IsDir() {
			return os.MkdirAll(destPath, 0o755)
		}

		data, err := fs.ReadFile(embeddedAssets, path)
		if err != nil {
			return err
		}

		if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
			return err
		}

		return os.WriteFile(destPath, data, 0o644)
	})
}

// ReadEmbeddedFile reads a file from the embedded FS
func ReadEmbeddedFile(path string) ([]byte, error) {
	if embeddedAssets == nil {
		return nil, os.ErrNotExist
	}
	return fs.ReadFile(embeddedAssets, path)
}

// ListEmbeddedDir lists files in an embedded directory
func ListEmbeddedDir(dir string) ([]string, error) {
	if embeddedAssets == nil {
		return nil, os.ErrNotExist
	}

	var files []string
	err := fs.WalkDir(embeddedAssets, dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			files = append(files, path)
		}
		return nil
	})
	return files, err
}
