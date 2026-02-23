#!/bin/sh
# Agent Ecosystem installer — one-liner for Unix systems
# Usage: curl -fsSL https://raw.githubusercontent.com/sickn33/agent-ecosystem/main/scripts/install.sh | sh
set -e

REPO="sickn33/agent-ecosystem"
BINARY="aeco"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Detect OS and Arch
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    armv7*|armhf)  ARCH="arm" ;;
    *)             echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
    linux)  OS="linux" ;;
    darwin) OS="darwin" ;;
    *)      echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Get latest release tag
echo "[INFO] Fetching latest release..."
LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$LATEST" ]; then
    echo "[WARN] Could not detect latest release, using 'latest'"
    LATEST="latest"
fi

echo "[INFO] Installing ${BINARY} ${LATEST} for ${OS}/${ARCH}..."

# Download
URL="https://github.com/${REPO}/releases/download/${LATEST}/${BINARY}-${OS}-${ARCH}"
if [ "$OS" = "windows" ]; then
    URL="${URL}.exe"
fi

TMP="$(mktemp -d)"
curl -fsSL -o "${TMP}/${BINARY}" "$URL"
chmod +x "${TMP}/${BINARY}"

# Install
if [ -w "$INSTALL_DIR" ]; then
    mv "${TMP}/${BINARY}" "${INSTALL_DIR}/${BINARY}"
else
    echo "[INFO] Need sudo to install to ${INSTALL_DIR}"
    sudo mv "${TMP}/${BINARY}" "${INSTALL_DIR}/${BINARY}"
fi

rm -rf "$TMP"

echo "[OK] ${BINARY} installed to ${INSTALL_DIR}/${BINARY}"
echo ""
echo "Quick start:"
echo "  cd your-repo"
echo "  aeco init              # Initialize in current repo"
echo "  aeco ready --quick     # Bootstrap everything"
echo ""
echo "Or use Go install:"
echo "  go install github.com/${REPO}/cmd/aeco@latest"
