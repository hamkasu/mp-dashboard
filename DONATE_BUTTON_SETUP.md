# Donate Button Setup Instructions

## Overview
A donate button with QR code modal has been added to the MyParliament Dashboard footer.

## Components Added
1. **DonateButton.tsx** - Component with modal displaying DuitNow QR code
2. **Footer.tsx** - Footer component including the donate button
3. **Home.tsx** - Updated to include the Footer component

## Required: Add QR Code Image

**IMPORTANT:** You need to add the DuitNow QR code image to complete the setup.

### Steps:
1. Save the DuitNow QR code image (the pink/magenta QR code for CALMIC SDN. BHD.) to:
   ```
   /client/public/duitnow-qr.png
   ```

2. The image should be the QR code image you provided showing:
   - DuitNow logo
   - Malaysia National QR
   - QR code for CALMIC SDN. BHD.

### File Location
- The component references: `/duitnow-qr.png`
- This maps to: `client/public/duitnow-qr.png`

## Features
- ☕ Coffee/Kopi themed design
- 🌐 Bilingual support (English & Malay)
- 📱 Responsive modal with QR code
- 🎨 Tailwind CSS styling matching the existing design

## Testing
After adding the QR code image:
1. Run `npm run dev` to start the development server
2. Navigate to the home page
3. Scroll to the footer
4. Click the "Buy Me a Coffee" button
5. Verify the QR code displays correctly in the modal

## Optional: Coffee Icon
The component uses the lucide-react Coffee icon by default. If you want to use the custom coffee cup image you provided (yellow background), you can:
1. Save it as `client/public/coffee-icon.png`
2. Update the DonateButton.tsx component to use the image instead of the lucide icon

---
*This feature was added on: 2025-12-20*
