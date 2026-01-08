# Landing Page Background Guide

## Current Implementation

The landing page now uses a blue abstract background with curved light elements that matches the style you provided. This is currently implemented using CSS gradients for optimal performance and no additional file loading.

## Using a Custom Background Image

If you want to use your exact background image file instead of the CSS gradient:

### Step 1: Save Your Image

Save your background image file to:
```
/home/user/mp-dashboard/client/public/landing-bg.png
```

Or:
```
/home/user/mp-dashboard/client/public/landing-bg.jpg
```

### Step 2: Update Home.tsx

Replace the background div in `/home/user/mp-dashboard/client/src/pages/Home.tsx` (around line 410-433) with:

```tsx
{/* Blue Abstract Background with Custom Image */}
<div
  className="fixed inset-0 -z-10"
  style={{
    backgroundImage: 'url(/landing-bg.png)', // or landing-bg.jpg
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
/>
```

### Step 3: Optional - Add Overlay for Better Text Contrast

If you need better text readability, add a semi-transparent overlay:

```tsx
{/* Background Image */}
<div
  className="fixed inset-0 -z-10"
  style={{
    backgroundImage: 'url(/landing-bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
>
  {/* Optional dark overlay for better text contrast */}
  <div className="absolute inset-0 bg-black/20" />
</div>
```

## Current CSS Gradient

The current implementation uses pure CSS for the blue abstract background:
- Base: Blue gradient from dark to lighter blue
- Overlays: Multiple radial and linear gradients to create curved light effects
- Performance: No image loading, instant render
- Responsive: Scales perfectly to any screen size

Choose the CSS gradient for better performance, or use a custom image for exact brand matching!
