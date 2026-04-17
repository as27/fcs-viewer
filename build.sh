#!/usr/bin/env bash
set -e

VERSION=$(grep 'AppVersion' app.go | grep -o '"[^"]*"' | tr -d '"')
echo "Version: $VERSION"

echo "macOS (arm64)..."
wails build -platform darwin/arm64 -o "fcs-viewer"

#echo "macOS (amd64)..."
#wails build -platform darwin/amd64 -o "fcs-viewer-mac-amd64-$VERSION"

echo "Windows (amd64)..."
wails build -platform windows/amd64 -o "fcs-viewer.exe"

echo ""
echo "Fertig"

