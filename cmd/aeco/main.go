package main

import (
	"fmt"
	"os"

	"github.com/sickn33/agent-ecosystem/assets"
	"github.com/sickn33/agent-ecosystem/internal/cli"
	"github.com/sickn33/agent-ecosystem/internal/util"
)

func main() {
	// Wire up embedded assets (templates, configs)
	util.SetEmbeddedFS(assets.FS)

	if err := cli.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "[ERROR] %v\n", err)
		os.Exit(1)
	}
}
