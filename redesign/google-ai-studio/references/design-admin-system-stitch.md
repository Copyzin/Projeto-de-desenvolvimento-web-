# Design System Document

## 1. Overview & Creative North Star
The complexity of academic administration—managing intricate schedules, faculty assignments, and vast datasets—requires more than just a functional interface; it demands a "Digital Curator." This design system is built to transform high-density information into a serene, editorial experience. 

Our **Creative North Star is "The Academic Archive."** We move away from the "busy dashboard" aesthetic toward a sophisticated, layered environment that mimics high-end architectural plans and fine print journals. We break the traditional grid-template look by using intentional white space (`spacing-10` and higher) to separate major logical flows, while employing high-contrast typography to anchor the eye. The interface feels light and breathable (`background: #f9faf5`) yet authoritative, using deep slates and muted blues to provide a sense of institutional permanence.

---

## 2. Colors
Our palette is curated to minimize cognitive load. We use "Professional Neutrals" and "Deep Administrative Blues" to establish a hierarchy of trust.

- **Primary & Secondary Roles:** `primary` (#545e76) and `secondary` (#48617e) act as our "Ink." They are reserved for active states, primary actions, and key identifiers.
- **The "No-Line" Rule:** We explicitly prohibit 1px solid borders for sectioning large layout areas. Instead, boundaries are defined by shifting from `surface` to `surface-container-low` (#f2f4ef) or `surface-container` (#ebefe9). 
- **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of vellum. 
    - Base layer: `background` (#f9faf5).
    - Content Sections: `surface-container-low`.
    - Interactive Cards: `surface-container-lowest` (#ffffff).
- **The "Glass & Gradient" Rule:** For floating administrative panels or modal overlays, utilize a `surface-container-lowest` color at 80% opacity with a `12px` backdrop-blur. To add "soul" to primary CTAs, apply a subtle linear gradient from `primary` (#545e76) to `primary_dim` (#48526a).

---

## 3. Typography
We use a dual-font strategy to balance character with legibility.

- **Display & Headlines (Manrope):** Chosen for its geometric precision and modern academic feel. Use `headline-md` for section titles to create a strong, editorial anchor.
- **Body & Labels (Inter):** The workhorse for data density. `body-sm` (0.75rem) is our standard for table cells and list items, providing extreme clarity even when data is packed tightly.
- **Hierarchy as Identity:** By pairing a `display-sm` (Manrope) page title with a `label-sm` (Inter, uppercase) category tag, we create a high-contrast "Editorial" header that feels custom-built for high-level decision-makers.

---

## 4. Elevation & Depth
In this system, depth is a function of light and layering, not heavy shadows.

- **The Layering Principle:** Rather than using borders to separate a list of faculty members, place each "row" on a `surface-container-lowest` card nested within a `surface-container` background.
- **Ambient Shadows:** For elements that truly float (like a dropdown or a "Quick Edit" scheduling popover), use a shadow tinted with `on_surface`: `box-shadow: 0 10px 30px -5px rgba(45, 52, 47, 0.08)`. 
- **The "Ghost Border" Fallback:** In high-density grids where content might bleed, use a "Ghost Border": `outline_variant` (#acb4ac) at **15% opacity**. This provides a guide for the eye without creating visual "noise."

---

## 5. Components

### 5.1 Buttons
- **Primary:** `primary` background with `on_primary` text. `rounded-md` (0.375rem). Use a subtle 2px bottom-heavy ambient shadow on hover.
- **Secondary:** `surface-container-highest` background with `on_surface` text. No border.

### 5.2 Assignment Grids & Tables
- **Grid Layout:** Forbid the use of vertical divider lines. Use `spacing-4` (0.9rem) horizontal gutters. 
- **Row States:** Active rows use `secondary_container` (#d1e4ff) with a 2px `primary` left-accent bar. 
- **Header:** Sticky headers use `surface-dim` with `label-md` bolded text.

### 5.3 Chips & Status Indicators
- **Status:** Use "Professional Mutes." 
    - *Error:* `error_container` (#fe8983) with `on_error_container` text.
    - *Success/Warning:* Use tertiary tones (`tertiary_container`).
- **Filter Chips:** `rounded-full`, using `surface-variant` with a transition to `primary_container` on selection.

### 5.4 Input Fields
- **Refined Inputs:** Soft-filled backgrounds (`surface-container-highest`) rather than outlined boxes. On focus, the background shifts to `surface-container-lowest` with a `primary` 1px bottom-border.

### 5.5 Scheduling Slots
- Use `rounded-sm` for time-block components. When a slot is "Unassigned," use a subtle `outline` dash pattern at 20% opacity rather than a solid fill.

---

## 6. Do's and Don'ts

### Do
- **Do** use `spacing-12` (2.75rem) for margins between unrelated administrative modules to ensure the "Editorial" feel.
- **Do** use `on_surface_variant` for secondary metadata (e.g., "Last updated: 12:40").
- **Do** lean on `tertiary` tones for "In-Progress" states—it provides a sophisticated middle ground between success and error.

### Don't
- **Don't** use pure black (#000000) for text. Always use `on_surface` (#2d342f) to maintain the "Ink on Paper" softness.
- **Don't** use vibrant, "neon" colors for status indicators. Academic systems require a "Steady-Hand" aesthetic—muted, reliable, and calm.
- **Don't** use standard `1px` borders for card separation; if the `surface` shift isn't enough, increase the `spacing` scale first.