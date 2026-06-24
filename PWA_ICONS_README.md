# PWA Icons Generation Guide

This document explains how to generate PWA icons for the MyParliament application.

## Required Icons

The manifest.json requires the following icons:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Using Existing Logo

If you already have a logo (like `/public/calmic-logo.png` or `/public/android-chrome-512x512.png`), use an online tool or command-line tool to resize it:

### Option 1: Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload your logo
3. Download the generated icons
4. Place them in `/public/` directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick if not already installed
# On Ubuntu/Debian: sudo apt-get install imagemagick
# On macOS: brew install imagemagick

# Navigate to your project's public directory
cd public/

# Use your existing 512x512 icon as source
SOURCE_ICON="android-chrome-512x512.png"

# Generate all required sizes
convert $SOURCE_ICON -resize 72x72 icon-72x72.png
convert $SOURCE_ICON -resize 96x96 icon-96x96.png
convert $SOURCE_ICON -resize 128x128 icon-128x128.png
convert $SOURCE_ICON -resize 144x144 icon-144x144.png
convert $SOURCE_ICON -resize 152x152 icon-152x152.png
convert $SOURCE_ICON -resize 192x192 icon-192x192.png
convert $SOURCE_ICON -resize 384x384 icon-384x384.png
convert $SOURCE_ICON -resize 512x512 icon-512x512.png
```

### Option 3: Using Node.js Script
Create a file `generate-icons.js` in the project root:

```javascript
const sharp = require('sharp');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceIcon = './public/android-chrome-512x512.png';

sizes.forEach(size => {
  sharp(sourceIcon)
    .resize(size, size)
    .toFile(`./public/icon-${size}x${size}.png`, (err) => {
      if (err) {
        console.error(`Error generating ${size}x${size}:`, err);
      } else {
        console.log(`Generated icon-${size}x${size}.png`);
      }
    });
});
```

Then run:
```bash
npm install sharp
node generate-icons.js
```

## iOS Splash Screens (Optional)

For better iOS PWA experience, you can also generate splash screens. The manifest.json references these, but they're optional:

- apple-splash-2048-2732.png (iPad Pro 12.9")
- apple-splash-1668-2388.png (iPad Pro 11")
- apple-splash-1536-2048.png (iPad)
- apple-splash-1125-2436.png (iPhone X/XS)
- apple-splash-1242-2688.png (iPhone XS Max)
- apple-splash-828-1792.png (iPhone XR)
- apple-splash-1242-2208.png (iPhone 8 Plus)
- apple-splash-750-1334.png (iPhone 8)
- apple-splash-640-1136.png (iPhone SE)

Use tools like https://appsco.pe/developer/splash-screens to generate these.

## Quick Symlink Approach (Temporary)

If you already have icons and want to quickly test PWA functionality:

```bash
cd public/
# Create symlinks to existing icons
ln -s android-chrome-512x512.png icon-512x512.png
ln -s android-chrome-512x512.png icon-384x384.png
ln -s android-chrome-192x192.png icon-192x192.png
ln -s android-chrome-192x192.png icon-152x152.png
ln -s android-chrome-192x192.png icon-144x144.png
ln -s android-chrome-192x192.png icon-128x128.png
ln -s favicon-32x32.png icon-96x96.png
ln -s favicon-32x32.png icon-72x72.png
```

Note: This is not ideal as the icons won't be properly sized, but it will allow PWA installation for testing.

## Testing PWA

After generating icons:

1. Build the application: `npm run build`
2. Serve it: `npm run preview` or deploy to a server
3. Open in browser (must be HTTPS or localhost)
4. Check for install prompt
5. Test on mobile devices
6. Verify icons appear correctly

## Lighthouse Audit

Run a Lighthouse audit to verify PWA installation:

```bash
# Using Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select "Progressive Web App" category
4. Click "Generate report"
```

The audit will tell you if any icons are missing or incorrectly sized.
