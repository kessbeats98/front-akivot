# Akivot (עקבות) Design System 2026

## Design Analysis: Current vs New

### Current Design Issues
1. **Generic Teal Palette**: #14746F is overused in tech apps - lacks personality
2. **Basic Glassmorphism**: Dated 2023 trend, needs refinement
3. **Inconsistent Spacing**: Arbitrary padding values
4. **Limited Typography Hierarchy**: Only 3-4 font sizes used
5. **No Dark Mode Strategy**: Only live walk page has dark background
6. **Missing Micro-interactions**: Flat, static feel
7. **RTL Considerations**: Hebrew support but generic font choices

### 2026 Design Direction: "Nature's Paw"
**Theme**: Organic warmth meets modern precision
**Inspiration**: Forest trails, golden hour walks, playful paws

**Key Differentiators**:
- Warm earth tones with vibrant accents (NOT generic teal)
- Organic shapes with intentional asymmetry
- Playful micro-animations that feel alive
- Premium but approachable aesthetic
- Strong visual identity for brand recognition

---

## Color System

### Primary Palette - "Forest Trail"
```css
--forest-50: #f0fdf4;    /* Lightest */
--forest-100: #dcfce7;
--forest-200: #bbf7d0;
--forest-300: #86efac;
--forest-400: #4ade80;
--forest-500: #22c55e;   /* Base */
--forest-600: #16a34a;   /* Primary Action */
--forest-700: #15803d;
--forest-800: #166534;
--forest-900: #14532d;   /* Darkest */
```

### Secondary Palette - "Golden Hour"
```css
--sunset-50: #fffbeb;
--sunset-100: #fef3c7;
--sunset-200: #fde68a;
--sunset-300: #fcd34d;
--sunset-400: #fbbf24;
--sunset-500: #f59e0b;   /* Base */
--sunset-600: #d97706;   /* Accent Action */
--sunset-700: #b45309;
--sunset-800: #92400e;
--sunset-900: #78350f;
```

### Neutral Palette - "Earth & Stone"
```css
--stone-50: #fafaf9;
--stone-100: #f5f5f4;
--stone-200: #e7e5e4;
--stone-300: #d6d3d1;
--stone-400: #a8a29e;
--stone-500: #78716c;
--stone-600: #57534e;
--stone-700: #44403c;
--stone-800: #292524;
--stone-900: #1c1917;
```

### Semantic Colors
```css
/* Success - Forest */
--success: #16a34a;
--success-bg: #f0fdf4;

/* Warning - Sunset */
--warning: #f59e0b;
--warning-bg: #fffbeb;

/* Error - Rose */
--error: #e11d48;
--error-bg: #fff1f2;

/* Info - Sky */
--info: #0284c7;
--info-bg: #f0f9ff;
```

---

## Typography Scale

### Font Family
```css
/* Primary: Heebo (Hebrew + Latin) */
--font-primary: 'Heebo', system-ui, sans-serif;

/* Display: Plus Jakarta Sans (Numbers & Headings) */
--font-display: 'Plus Jakarta Sans', var(--font-primary);

/* Monospace: JetBrains Mono (Timers, Numbers) */
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
```

### Type Scale
```css
--text-xs: 0.75rem;      /* 12px - Captions, Tags */
--text-sm: 0.875rem;     /* 14px - Body Small */
--text-base: 1rem;       /* 16px - Body */
--text-lg: 1.125rem;     /* 18px - Body Large */
--text-xl: 1.25rem;      /* 20px - H3 */
--text-2xl: 1.5rem;      /* 24px - H2 */
--text-3xl: 1.875rem;    /* 30px - H1 */
--text-4xl: 2.25rem;     /* 36px - Display */
--text-5xl: 3rem;        /* 48px - Hero */
--text-6xl: 3.75rem;     /* 60px - Large Hero */
--text-7xl: 4.5rem;      /* 72px - Giant */
```

### Font Weights
```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
--font-black: 900;
```

---

## Spacing System (8px base)

```css
--space-0: 0;
--space-px: 1px;
--space-0.5: 0.125rem;  /* 2px */
--space-1: 0.25rem;     /* 4px */
--space-1.5: 0.375rem;  /* 6px */
--space-2: 0.5rem;      /* 8px */
--space-2.5: 0.625rem;  /* 10px */
--space-3: 0.75rem;     /* 12px */
--space-3.5: 0.875rem;  /* 14px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-7: 1.75rem;     /* 28px */
--space-8: 2rem;        /* 32px */
--space-9: 2.25rem;     /* 36px */
--space-10: 2.5rem;     /* 40px */
--space-11: 2.75rem;    /* 44px */
--space-12: 3rem;       /* 48px */
--space-14: 3.5rem;     /* 56px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */
--space-24: 6rem;       /* 96px */
--space-28: 7rem;       /* 112px */
--space-32: 8rem;       /* 128px */
```

---

## Border Radius System

```css
/* Organic & Playful */
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px - Badges */
--radius-md: 0.5rem;     /* 8px - Buttons */
--radius-lg: 0.75rem;    /* 12px - Inputs */
--radius-xl: 1rem;       /* 16px - Cards */
--radius-2xl: 1.5rem;    /* 24px - Large Cards */
--radius-3xl: 2rem;      /* 32px - Sections */
--radius-4xl: 2.5rem;    /* 40px - Hero Cards */
--radius-full: 9999px;   /* Pills, Avatars */

/* Special Shapes */
--radius-organic: 2rem 2rem 1.75rem 2.25rem;  /* Organic blob */
--radius-paw: 40% 60% 60% 40% / 60% 40% 60% 40%;  /* Paw shape */
```

---

## Shadow System

```css
/* Elevation Levels */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

/* Colored Shadows (Brand) */
--shadow-forest: 0 10px 40px -10px rgb(22 163 74 / 0.35);
--shadow-sunset: 0 10px 40px -10px rgb(245 158 11 / 0.35);
--shadow-rose: 0 10px 40px -10px rgb(225 29 72 / 0.35);

/* Glow Effects */
--glow-forest: 0 0 20px rgb(22 163 74 / 0.4);
--glow-sunset: 0 0 20px rgb(245 158 11 / 0.4);
```

---

## Animation System

### Durations
```css
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;
```

### Easing Functions
```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Key Animations
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes bounce-in {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes slide-up {
  0% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes paw-print {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(0deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
```

---

## Component Design Patterns

### Cards
- Default: White background, subtle shadow, rounded-xl
- Hover: Lift effect (translateY -2px), shadow increase
- Active: Scale slightly (0.98)

### Buttons
- Primary: Forest gradient, white text, shadow-forest
- Secondary: Sunset gradient, white text, shadow-sunset
- Ghost: Transparent, forest text, hover background
- Size: sm (36px), md (44px), lg (52px)

### Inputs
- Default: stone-100 background, stone-300 border
- Focus: forest-500 border, forest-100 ring
- Error: rose-500 border, rose-100 ring

### Navigation
- Bottom nav: Glass morphism, backdrop blur
- Active state: Pill with forest background
- Badges: Sunset dot for notifications

---

## RTL Considerations

```css
/* Use logical properties */
margin-inline-start: var(--space-4);  /* Instead of margin-right */
padding-inline-end: var(--space-2);   /* Instead of padding-left */
border-inline-start: 2px solid;       /* Instead of border-right */

/* Flip animations */
[dir="rtl"] .slide-in {
  animation-name: slide-in-rtl;
}
```

---

## Dark Mode Strategy

```css
/* Dark mode colors */
[data-theme="dark"] {
  --bg-primary: #0c0a09;      /* stone-950 */
  --bg-secondary: #1c1917;    /* stone-900 */
  --bg-elevated: #292524;     /* stone-800 */
  
  --text-primary: #fafaf9;    /* stone-50 */
  --text-secondary: #a8a29e;  /* stone-400 */
  --text-muted: #78716c;      /* stone-500 */
  
  --border: #44403c;          /* stone-700 */
  --border-subtle: #57534e;   /* stone-600 */
}
```

---

## Iconography

- Use Lucide Icons for consistency
- Size: sm (16px), md (20px), lg (24px), xl (32px)
- Weight: 2px stroke for clarity
- Color: Inherit from parent or semantic color

---

## Accessibility Requirements

- Contrast ratio: 4.5:1 minimum (WCAG AA)
- Focus indicators: 2px forest-500 ring with offset
- Touch targets: Minimum 44x44px
- Motion: Respect prefers-reduced-motion
- Screen reader: Semantic HTML + ARIA labels
