# Theme Configuration Guide

## Overview
The web-new application uses a **fixed light blue and glassy dark theme** that remains consistent regardless of system appearance settings (light/dark mode).

The theme features:
- **Lighter background**: Dark gray (#0f1419) with subtle gradient instead of pure black
- **Glassmorphism effects**: Frosted glass appearance with backdrop blur on cards and modals
- **Light blue accents**: Consistent light blue color (#60a5fa) for interactive elements

## Theme Colors

### Primary Colors
- **Primary Blue**: `#60a5fa` - Main accent color used for buttons, links, and highlights
- **Primary Blue Dark**: `#3b82f6` - Hover state for buttons and interactive elements
- **Primary Blue Light**: `#93c5fd` - Lighter accents and secondary highlights

### Background Colors
- **Background**: `#0f1419` - Dark gray background (lighter than pure black)
- **Background Gradient**: Linear gradient from `#0f1419` to `#1a1f26` for depth
- **Foreground**: `#ffffff` - White text color

### Component Colors
- **Card Background**: `rgba(255, 255, 255, 0.05)` - Glassy white overlay with backdrop blur
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
  --background: #0f1419;          /* Background color (dark gray, not pure black) */
  --foreground: #ffffff;          /* Text color */
  /* ... other variables */
}

/* Body background with gradient for depth */
body {
  background: linear-gradient(135deg, #0f1419 0%, #1a1f26 100%);
  background-repeat: no-repeat;
  background-attachment: fixed;
}

/* Cards with glassmorphism effect */
.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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

2. **Glassmorphism Design**: All cards and modals use a frosted glass effect with `backdrop-filter: blur(12px)` for a modern, layered appearance.

3. **Consistent Across All Pages**: All pages use the same theme variables, ensuring a uniform look throughout the application.

4. **Tailwind Color Overrides**: Common Tailwind utility classes like `bg-blue-600`, `text-blue-500`, etc., are overridden to use the theme colors automatically.

5. **Easy Maintenance**: To change the entire application's color scheme, simply update the values in `src/app/globals.css` `:root` section.

## Generic Components

The application now includes reusable generic components for consistent UI across all CRUD operations:

### Modal Component (`src/components/Modal.tsx`)
A reusable modal dialog with glassmorphism design:
```tsx
import { Modal, ModalActions } from "@/components/Modal";

<Modal
  isOpen={isOpen}
  onClose={closeHandler}
  title="Modal Title"
  size="md" // sm, md, lg, xl
>
  {/* Modal content */}
  <ModalActions>
    <Button variant="ghost" onClick={closeHandler}>Cancel</Button>
    <Button variant="primary" onClick={saveHandler}>Save</Button>
  </ModalActions>
</Modal>
```

### DataTable Component (`src/components/DataTable.tsx`)
A reusable table for listing data:
```tsx
import { DataTable, Column } from "@/components/DataTable";

const columns: Column<YourType>[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name", render: (item) => <span>{item.name}</span> },
];

<DataTable
  columns={columns}
  data={items}
  getRowKey={(item) => item.id}
  isLoading={loading}
  emptyMessage="No items found"
  actions={(item) => <button>Edit</button>}
/>
```

### DataList Component (`src/components/DataTable.tsx`)
A card-based alternative to DataTable:
```tsx
import { DataList } from "@/components/DataTable";

<DataList
  data={items}
  getRowKey={(item) => item.id}
  renderItem={(item) => <div className="card">{item.name}</div>}
  isLoading={loading}
/>
```

### Form Components (`src/components/FormField.tsx`)
Consistent form inputs:
```tsx
import { FormField, FormSelect, FormTextArea } from "@/components/FormField";

<FormField
  label="Name"
  type="text"
  value={value}
  onChange={handler}
  error={error}
  required
/>

<FormSelect
  label="Role"
  options={[{ value: "admin", label: "Admin" }]}
  value={role}
  onChange={handler}
/>
```

### Button Component (`src/components/Button.tsx`)
Consistent buttons with variants:
```tsx
import { Button } from "@/components/Button";

<Button variant="primary" size="md" isLoading={saving}>
  Save Changes
</Button>

// Variants: primary, secondary, danger, ghost
// Sizes: sm, md, lg
```

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
