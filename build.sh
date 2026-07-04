#!/usr/bin/env bash
set -e

VERSION=$(grep 'AppVersion' app.go | grep -o '"[^"]*"' | tr -d '"')
echo "Version: $VERSION"

echo "macOS (arm64)..."
wails build -platform darwin/arm64
rm -rf "build/bin/fcs-viewer-mac-arm64-$VERSION.app"
mv build/bin/fcs-viewer.app "build/bin/fcs-viewer-mac-arm64-$VERSION.app"

echo "macOS (amd64)..."
wails build -platform darwin/amd64
rm -rf "build/bin/fcs-viewer-mac-amd64-$VERSION.app"
mv build/bin/fcs-viewer.app "build/bin/fcs-viewer-mac-amd64-$VERSION.app"

echo "Windows (amd64)..."
wails build -platform windows/amd64
rm -f "build/bin/fcs-viewer-$VERSION.exe"
mv build/bin/fcs-viewer.exe "build/bin/fcs-viewer-$VERSION.exe"

echo ""
echo "Fertig"

