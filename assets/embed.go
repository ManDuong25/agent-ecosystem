package assets

import "embed"

// FS contains all embedded templates and config files.
// This is the single source of truth for portable assets.
//
//go:embed all:templates configs
var FS embed.FS
