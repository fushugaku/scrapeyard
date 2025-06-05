#!/bin/bash

echo "🚀 Building Scrapeyard Extension..."

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npm run compile

# Package the extension
echo "📦 Packaging extension..."
npm run package

echo "✅ Extension packaged: scrapeyard-0.0.1.vsix"
echo ""
echo "📖 To install in Cursor:"
echo "   1. Open Cursor"
echo "   2. Go to Extensions (Cmd+Shift+X or Ctrl+Shift+X)"
echo "   3. Click the '...' menu → 'Install from VSIX...'"
echo "   4. Select the file: scrapeyard-0.0.1.vsix"
echo "   5. Restart Cursor"
echo ""
echo "🎯 Or run: cursor --install-extension scrapeyard-0.0.1.vsix" 