#!/usr/bin/env bash
# ==============================================================================
# SwitchBack Ubuntu — Release Packaging Script
# Generates release archives for GitHub Releases (.tar.gz and .zip)
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-2.3.0}"

DIST_DIR="$PROJECT_DIR/dist"
STAGE_DIR="$DIST_DIR/SwitchBack-Ubuntu-v$VERSION"

echo "📦 Packaging SwitchBack Ubuntu v$VERSION for GitHub Releases..."

rm -rf "$DIST_DIR"
mkdir -p "$STAGE_DIR"

# Copy essential files
cp -f "$PROJECT_DIR/install.sh" "$STAGE_DIR/"
cp -f "$PROJECT_DIR/install-gui" "$STAGE_DIR/"
cp -f "$PROJECT_DIR/SwitchBack-Installer.desktop" "$STAGE_DIR/"
cp -f "$PROJECT_DIR/uninstall.sh" "$STAGE_DIR/"
cp -f "$PROJECT_DIR/README.md" "$STAGE_DIR/"
cp -f "$PROJECT_DIR/README.ru.md" "$STAGE_DIR/"
cp -f "$PROJECT_DIR/CONTRIBUTORS.md" "$STAGE_DIR/"
cp -f "$PROJECT_DIR/LICENSE" "$STAGE_DIR/"

# Ensure executable permissions
chmod +x "$STAGE_DIR/install.sh"
chmod +x "$STAGE_DIR/install-gui"
chmod +x "$STAGE_DIR/SwitchBack-Installer.desktop"
chmod +x "$STAGE_DIR/uninstall.sh"

# Copy directories
cp -rf "$PROJECT_DIR/extension" "$STAGE_DIR/"
cp -rf "$PROJECT_DIR/daemon" "$STAGE_DIR/"
cp -rf "$PROJECT_DIR/desktop" "$STAGE_DIR/"
cp -rf "$PROJECT_DIR/po" "$STAGE_DIR/"
cp -rf "$PROJECT_DIR/scripts" "$STAGE_DIR/"
mkdir -p "$STAGE_DIR/docs"
cp -rf "$PROJECT_DIR/docs/screenshots" "$STAGE_DIR/docs/"
cp -f "$PROJECT_DIR"/docs/architecture-*.svg "$STAGE_DIR/docs/" 2>/dev/null || true

# Clean up unwanted temp files if any
find "$STAGE_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "$STAGE_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$STAGE_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# Create .tar.gz
cd "$DIST_DIR"
tar -czf "SwitchBack-Ubuntu-v$VERSION.tar.gz" "SwitchBack-Ubuntu-v$VERSION"
echo "✅ Created: dist/SwitchBack-Ubuntu-v$VERSION.tar.gz ($(du -h SwitchBack-Ubuntu-v$VERSION.tar.gz | cut -f1))"

# Create .zip if zip command is available
if command -v zip >/dev/null 2>&1; then
    zip -r -q "SwitchBack-Ubuntu-v$VERSION.zip" "SwitchBack-Ubuntu-v$VERSION"
    echo "✅ Created: dist/SwitchBack-Ubuntu-v$VERSION.zip ($(du -h SwitchBack-Ubuntu-v$VERSION.zip | cut -f1))"
fi

echo ""
echo "🎉 Release archives ready in: $DIST_DIR"
