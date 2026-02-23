BINARY = aeco
MODULE = github.com/sickn33/agent-ecosystem
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS = -s -w -X '$(MODULE)/internal/cli.version=$(VERSION)'

.PHONY: build install test clean release-all

build:
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY) ./cmd/aeco

install:
	go install -ldflags "$(LDFLAGS)" ./cmd/aeco

test:
	go test ./...

clean:
	rm -rf bin/ dist/

# Cross-compile for all platforms
release-all: clean
	@mkdir -p dist
	GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-linux-amd64     ./cmd/aeco
	GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-linux-arm64     ./cmd/aeco
	GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-darwin-amd64    ./cmd/aeco
	GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-darwin-arm64    ./cmd/aeco
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-windows-amd64.exe ./cmd/aeco
	GOOS=windows GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/$(BINARY)-windows-arm64.exe ./cmd/aeco
	@echo "Built all platform binaries in dist/"
	@ls -la dist/
