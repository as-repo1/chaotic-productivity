#!/bin/bash
# Sync web app assets to Android project assets folder

set -e

WORKSPACE_DIR="/home/chaos/coding/old-github/chaotic-productivity"
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
