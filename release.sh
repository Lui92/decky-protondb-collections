#!/bin/bash
# Release packaging script for the plugin
PLUGIN_NAME="decky-protondb-collections"
BUILD_DIR="dist"
OUTPUT="${PLUGIN_NAME}.zip"

echo "Building plugin..."
npm install --no-audit --no-fund
npm run build

echo "Packaging..."
mkdir -p $BUILD_DIR
cp -r plugin.json $BUILD_DIR/
cp -r assets $BUILD_DIR/

cd $BUILD_DIR
zip -r ../$OUTPUT .
cd - >/dev/null

echo "Done! Created $OUTPUT"
