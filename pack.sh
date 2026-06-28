#!/bin/bash
# Pack llm-wiki plugin into a distributable ZIP
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION=$(grep '"version"' "$SCRIPT_DIR/dashboard/manifest.json" | head -1 | grep -o '"[0-9.]*"' | tr -d '"')
OUTFILE="$SCRIPT_DIR/../llm-wiki-plugin-v${VERSION}.zip"

echo "Building plugin frontend..."
cd "$SCRIPT_DIR/dashboard"
npm run build

echo "Packing plugin v${VERSION}..."
cd "$SCRIPT_DIR/.."
rm -f "llm-wiki-plugin-v${VERSION}.zip"

zip -r "llm-wiki-plugin-v${VERSION}.zip" llm-wiki/ \
  --exclude "llm-wiki/dashboard/node_modules/*" \
  --exclude "llm-wiki/dashboard/src/*" \
  --exclude "llm-wiki/dashboard/package-lock.json" \
  --exclude "llm-wiki/pack.sh" \
  --exclude "llm-wiki/__pycache__/*" \
  --exclude "llm-wiki/dashboard/__pycache__/*"

echo ""
echo "✓ Packed: llm-wiki-plugin-v${VERSION}.zip"
echo ""
echo "Installation on another Hermes:"
echo "  unzip llm-wiki-plugin-v${VERSION}.zip -d ~/.hermes/hermes-agent/plugins/"
echo "  # Then restart: hermes dashboard"
