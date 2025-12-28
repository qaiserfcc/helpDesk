# Theme Configuration Guide

## Overview
The web-new application uses a **fixed light blue and black color scheme** that remains consistent regardless of system appearance settings (light/dark mode).

## Theme Colors

### Primary Colors
- **Primary Blue**: `#60a5fa` - Main accent color used for buttons, links, and highlights
- **Primary Blue Dark**: `#3b82f6` - Hover state for buttons and interactive elements
- **Primary Blue Light**: `#93c5fd` - Lighter accents and secondary highlights

### Background Colors
- **Background**: `#000000` - Pure black background (always fixed)
- **Foreground**: `#ffffff` - White text color

### Component Colors
- **Card Background**: `rgba(96, 165, 250, 0.08)` - Light blue tint on black
- **Card Border**: `rgba(96, 165, 250, 0.2)` - Light blue border
- **Muted Text**: `rgba(255, 255, 255, 0.7)` - Secondary text color

### Focus States
- **Focus Ring**: `rgba(96, 165, 250, 0.3)` - Outline around focused elements
- **Focus Border**: `rgba(96, 165, 250, 0.8)` - Border color on focus

## How to Change the Theme

The theme is centralized in two locations:

### 1. CSS Variables (`src/app/globals.css`)
All color values are defined in CSS custom properties in the `:root` selector. To change the theme colors:

```css
:root {
  --primary-blue: #60a5fa;        /* Change this to your desired primary color */
  --primary-blue-dark: #3b82f6;   /* Adjust for hover states */
  --primary-blue-light: #93c5fd;  /* Adjust for lighter accents */
  --background: #000000;          /* Background color */
  --foreground: #ffffff;          /* Text color */
  /* ... other variables */
}
```

### 2. Theme Configuration (`src/config/theme.ts`)
For programmatic access to theme values in TypeScript/React components:

```typescript
export const theme = {
  colors: {
    primary: '#60a5fa',
    primaryDark: '#3b82f6',
    primaryLight: '#93c5fd',
    background: '#000000',
    foreground: '#ffffff',
    // ... other colors
  }
}
```

## CSS Classes

### Buttons
- `.primary-btn` - Primary action button with light blue background
- `.theme-btn` - Alternative button style
- `.theme-btn-secondary` - Secondary button with light blue tint

### Cards
- `.card` - Standard card with light blue border and semi-transparent background
- `.card-footer` - Card footer with subtle background

### Links
- `.accent-link` - Link styled with accent color

### Text
- `.muted` - Muted text color for secondary information

## Important Notes

1. **No System Preference Detection**: The theme does NOT change based on system light/dark mode preferences. The `@media (prefers-color-scheme: dark)` query has been intentionally removed.

2. **Consistent Across All Pages**: All pages use the same theme variables, ensuring a uniform look throughout the application.

3. **Tailwind Color Overrides**: Common Tailwind utility classes like `bg-blue-600`, `text-blue-500`, etc., are overridden to use the theme colors automatically.

4. **Easy Maintenance**: To change the entire application's color scheme, simply update the values in `src/app/globals.css` `:root` section.

## Example Theme Change

To change from light blue to another color (e.g., green):

1. Update `src/app/globals.css`:
```css
:root {
  --primary-blue: #10b981;        /* green-500 */
  --primary-blue-dark: #059669;   /* green-600 */
  --primary-blue-light: #34d399;  /* green-400 */
  /* Keep other colors or adjust as needed */
}
```

2. Update `src/config/theme.ts`:
```typescript
export const theme = {
  colors: {
    primary: '#10b981',
    primaryDark: '#059669',
    primaryLight: '#34d399',
    // ... rest remains the same
  }
}
```

The entire application will now use the green color scheme!
