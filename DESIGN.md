---
name: Calculated Assurance
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747782'
  outline-variant: '#c4c6d2'
  surface-tint: '#3d5ca2'
  primary: '#001a48'
  on-primary: '#ffffff'
  primary-container: '#002d72'
  on-primary-container: '#7a97e2'
  inverse-primary: '#b1c5ff'
  secondary: '#00668a'
  on-secondary: '#ffffff'
  secondary-container: '#40c2fd'
  on-secondary-container: '#004d6a'
  tertiary: '#00211d'
  on-tertiary: '#ffffff'
  tertiary-container: '#003833'
  on-tertiary-container: '#35aa9d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001946'
  on-primary-fixed-variant: '#224489'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  gutter: 16px
  margin: 24px
---

## Brand & Style

The design system is anchored in the concept of **Institutional Precision**. In the context of financial decision-making, the interface must act as a neutral, high-performance tool rather than a marketing vehicle. The aesthetic prioritizes "Quiet Confidence"—a blend of **Modern Corporate** structure and **Minimalist** clarity.

The emotional response is one of reassurance and stability. By utilizing a deep, authoritative navy alongside airy sky blues and grounded teals, the system balances the seriousness of mortgage debt with the optimism of home ownership. Every element is designed to feel intentional, reducing cognitive load and replacing financial anxiety with mathematical clarity.

## Colors

The color strategy for this design system utilizes a high-contrast foundation to ensure legibility and perceived trustworthiness. 

- **Primary Navy (#002D72):** Reserved for core branding, primary actions, and structural headers to instill a sense of tradition and security.
- **Accent Sky Blue (#38bdf8):** Used sparingly for interactive highlights and progress indicators to inject a modern, tech-forward energy.
- **Teal (#0d9488):** Employed for data visualization and secondary metrics, bridging the gap between professional navy and organic green.
- **Surface Strategy:** The system uses a "near-white" background with slightly cooler surface cards (#f8fafc) to create subtle, non-distracting containment for data sets.

## Typography

This design system utilizes **Manrope** for its unique balance of geometric purity and professional warmth. The typeface's open counters ensure that complex numerical data—specifically interest rates and amortization schedules—remains legible at small sizes.

Numerical data should always utilize tabular figures (monospaced numbers) where available to ensure vertical alignment in columns. Headlines are set with slight negative letter-spacing to appear tighter and more "editorial," while small labels use increased tracking and bold weights to maintain hierarchy in high-density utility views.

## Layout & Spacing

The layout philosophy follows a **Modular Grid** approach. Since LoanBee is a utility-first application, the spacing is compact to minimize scrolling while providing enough "breathable" margins to avoid a cluttered "spreadsheet" feel.

A standard 12-column grid is used for desktop layouts, transitioning to a single-column stack on mobile. Components are grouped into logical "pods" or cards, using 20px (md) spacing to separate distinct calculation steps. Internal card padding is consistently 24px to ensure financial data doesn't feel cramped against container edges.

## Elevation & Depth

Visual hierarchy in this design system is achieved through **Tonal Layering** and **Ambient Depth**. We avoid heavy, distracting shadows in favor of a "flat-plus" approach:

1.  **Level 0 (Background):** #fcfdfe. The lowest plane.
2.  **Level 1 (Cards/Surfaces):** #f8fafc. Used for the primary workspace. Elevated by a 1px border (#e2e8f0) and a very soft, diffused shadow (0px 4px 20px rgba(15, 23, 42, 0.04)).
3.  **Level 2 (Modals/Popovers):** Standard white (#ffffff). These use a more pronounced shadow (0px 10px 32px rgba(15, 23, 42, 0.08)) to indicate temporary interaction.

This depth model ensures that calculation results feel physically layered above the input variables, guiding the user's eye toward the outcome.

## Shapes

The shape language is a strategic mix of soft approachability and geometric rigor. 

- **Cards:** 16px radius creates a modern, containerized look that feels friendly yet structured.
- **Input Fields:** 12px radius provides a distinct visual signature that differentiates data-entry zones from static content.
- **Buttons & Pills:** A full 26px "pill" radius is used for all primary actions and interactive chips. This distinct curvature makes touch targets obvious and creates a "friendly utility" vibe that softens the intensity of financial data.

## Components

### Buttons
Primary buttons are pill-shaped (26px radius) using the Primary Navy with white text. Secondary buttons use a Sky Blue ghost style (transparent fill, sky blue border/text) for less critical actions like "Save for Later."

### Input Fields
Inputs use a 12px radius with a 1px border (#e2e8f0). When focused, the border transitions to Sky Blue with a subtle 3px outer glow. Labels sit above the field in Label-MD (SemiBold) to ensure clarity.

### Cards
All calculator modules are housed in cards with a 16px radius. For high-density data, use a "Secondary Card" variant with a subtle Teal top-border (2px) to denote "Results" or "Success" states.

### Data Sliders
Sliders are essential for mortgage apps. The track should be Teal (#0d9488) with a 24px circular white thumb containing a Primary Navy border. This ensures the most frequent interaction point feels tactile and premium.

### Lists & Tables
Amortization schedules use zebra-striping (Surface color vs. Background color) with no vertical borders. This maintains a clean, horizontal flow that is easier for the eye to track across financial columns.

### Success & Error States
Success notifications use Success Green (#046d40) with high-contrast white text. Error states use #ba1a1a, accompanied by an icon to ensure accessibility for users with color vision deficiencies.