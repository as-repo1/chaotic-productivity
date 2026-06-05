#!/bin/bash
# Sync web app assets to Android project assets folder

set -e

# Determine the script's directory dynamically to ensure portability and security
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR"
ASSETS_DIR="$WORKSPACE_DIR/android-app/app/src/main/assets"

echo "Creating assets directory: $ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

echo "Copying web assets..."
cp "$WORKSPACE_DIR/web/index.html" "$ASSETS_DIR/"
cp "$WORKSPACE_DIR/web/theme.css" "$ASSETS_DIR/"
cp "$WORKSPACE_DIR/web/main.css" "$ASSETS_DIR/"
cp "$WORKSPACE_DIR/web/main.js" "$ASSETS_DIR/"
cp "$WORKSPACE_DIR/web/pomodoro.html" "$ASSETS_DIR/"
cp "$WORKSPACE_DIR/web/pomodoro.css" "$ASSETS_DIR/"
cp "$WORKSPACE_DIR/web/pomodoro.js" "$ASSETS_DIR/"

echo "Sync completed successfully!"
ls -la "$ASSETS_DIR"
