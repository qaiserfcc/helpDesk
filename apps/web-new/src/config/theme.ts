/**
 * Centralized Theme Configuration
 * 
 * This file contains all color definitions for the application.
 * To change the theme, simply update the values in this file.
 * 
 * Current theme: Light Blue and Black
 */

export const theme = {
  colors: {
    // Primary colors
    primary: '#60a5fa',        // light blue
    primaryDark: '#3b82f6',    // darker blue for hover states
    primaryLight: '#93c5fd',   // lighter blue for accents
    
    // Background colors
    background: '#000000',     // pure black
    foreground: '#ffffff',     // white text
    
    // Card colors
    cardBg: 'rgba(96, 165, 250, 0.08)',      // light blue tint on black
    cardBorder: 'rgba(96, 165, 250, 0.2)',   // light blue border
    
    // Text colors
    muted: 'rgba(255, 255, 255, 0.7)',       // muted white text
    
    // Accent colors
    accent: '#60a5fa',         // light blue accent
    
    // Focus colors
    focusRing: 'rgba(96, 165, 250, 0.3)',    // light blue focus ring
    focusBorder: 'rgba(96, 165, 250, 0.8)',  // light blue focus border
  },
  
  // Tailwind class names for consistent usage
  classes: {
    // Primary button
    primaryButton: 'primary-btn',
    
    // Back/navigation links
    backLink: 'accent-link hover:underline',
    
    // Cards
    card: 'card shadow rounded-lg p-6',
    
    // Text colors
    heading: 'text-white',
    subheading: 'text-white/80',
    bodyText: 'text-white/90',
    mutedText: 'muted',
  }
} as const;

export type Theme = typeof theme;
