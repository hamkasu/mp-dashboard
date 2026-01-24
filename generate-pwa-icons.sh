#!/bin/bash

# PWA Icon Generator Script
# Generates all required PWA icons from a source image

echo "🎨 MyParliament PWA Icon Generator"
echo "===================================="

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found!"
    echo "   Install it with:"
    echo "   - Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "   - macOS: brew install imagemagick"
    echo "   - Or use the Node.js script instead"
    exit 1
fi

# Navigate to public directory
cd "$(dirname "$0")/public" || exit 1

# Check for source icon
SOURCE_ICON=""
if [ -f "android-chrome-512x512.png" ]; then
    SOURCE_ICON="android-chrome-512x512.png"
elif [ -f "calmic-logo.png" ]; then
    SOURCE_ICON="calmic-logo.png"
elif [ -f "logo.png" ]; then
    SOURCE_ICON="logo.png"
else
    echo "❌ No source icon found!"
    echo "   Please place a logo file in /public/ directory:"
    echo "   - android-chrome-512x512.png (preferred)"
    echo "   - calmic-logo.png"
    echo "   - logo.png"
    exit 1
fi

echo "📷 Source icon: $SOURCE_ICON"
echo ""

# Generate PWA icons
SIZES=(72 96 128 144 152 192 384 512)

echo "🔨 Generating PWA icons..."
for size in "${SIZES[@]}"; do
    OUTPUT="icon-${size}x${size}.png"
    echo "   ✓ Creating $OUTPUT"
    convert "$SOURCE_ICON" -resize "${size}x${size}" -quality 100 "$OUTPUT"
done

echo ""
echo "✅ PWA icons generated successfully!"
echo ""
echo "📝 Generated files:"
ls -lh icon-*.png | awk '{print "   - " $9 " (" $5 ")"}'

echo ""
echo "🎉 Done! Your PWA is ready to install."
echo "   Next steps:"
echo "   1. Run 'npm run build' to build the app"
echo "   2. Deploy to HTTPS server or test on localhost"
echo "   3. Open in browser and look for install prompt"
