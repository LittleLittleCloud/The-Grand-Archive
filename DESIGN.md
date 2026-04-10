# Design System: The Digital Curator

## 1. Overview & Creative North Star
This design system is built upon the **"Digital Curator"** North Star. We are not building a standard news feed; we are architecting a living archive. The aesthetic rejects the ephemeral nature of "scrolling content" in favor of the permanence and authority of a high-end editorial publication or a modern scholarly library.

To move beyond the generic "template" look, this system utilizes **Intellectual Asymmetry**. Layouts should avoid perfect bilateral symmetry, opting instead for weighted compositions where large serif headlines are balanced by dense, meticulously organized metadata. We embrace high information density, but manage it through a sophisticated hierarchy of "tonal layering" rather than rigid boxes and lines.

---

## 2. Colors & Surface Architecture
The palette is rooted in the academic tradition: deep navies and charcoals represent the ink and binding, while parchment tones provide a comfortable, long-form reading experience.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts or tonal transitions. Use `surface-container-low` against a `surface` background to denote a sidebar, or `surface-container-highest` to highlight a featured article.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of vellum. 
- **Base Level:** `surface` (#fcf9f2) for the primary reading environment.
- **Deep Nesting:** Use `surface-container` tiers (Lowest to Highest) to create "inset" or "raised" sections. A search bar should feel "cut" into the header using `surface-dim`, while a featured quote should feel "laid" on top using `surface-container-lowest`.

### The "Glass & Gradient" Rule
To prevent the design from feeling static or "old-world," incorporate **Glassmorphism**. Floating menus or navigation bars should use `primary` at 85% opacity with a `20px` backdrop-blur. This allows the parchment background to bleed through, creating a "frosted ink" effect. 

### Signature Textures
Main CTAs and hero headers should utilize a subtle linear gradient from `primary` (#041926) to `primary-container` (#1a2e3b) at a 135-degree angle. This adds a "silk-bound" depth that flat hex codes cannot achieve.

---

## 3. Typography
The typography is the voice of the system. It balances the authoritative weight of the **Newsreader** serif with the clinical precision of **Inter** and **Work Sans**.

| Category | Token | Font Family | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Newsreader | 3.5rem | Editorial front-page headlines. |
| **Headline** | `headline-md` | Newsreader | 1.75rem | Section headers and article titles. |
| **Title** | `title-md` | Inter | 1.125rem | Sub-headings and card titles. |
| **Body** | `body-lg` | Inter | 1rem | Long-form reading (high legibility). |
| **Label** | `label-md` | Work Sans | 0.75rem | Metadata, timestamps, and categories. |

**Editorial Note:** Use `tertiary_fixed_dim` (#e9c176) for `label-md` text when placed against `primary` backgrounds to evoke gold-leaf embossing.

---

## 4. Elevation & Depth
In this system, depth is a function of light and material, not digital "drop shadows."

*   **The Layering Principle:** Stacking `surface-container-low` on `surface` creates a natural lift. Do not add shadows to cards that are flush with the layout.
*   **Ambient Shadows:** For floating elements (Modals, Popovers), use a "Whisper Shadow": `0px 12px 32px rgba(28, 28, 24, 0.06)`. The shadow color is derived from `on-surface` to ensure it feels like a natural obstruction of light on parchment.
*   **The "Ghost Border" Fallback:** If a container requires a boundary (e.g., in high-density data tables), use a "Ghost Border": `outline-variant` (#c3c7cc) at **15% opacity**. Never use a 100% opaque border.
*   **Sharpness as Sophistication:** All corners are set to `0px`. This "archival" sharpness conveys a sense of structure and mathematical precision.

---

## 5. Components

### Cards & Lists
*   **Rule:** Forbid the use of divider lines.
*   **Implementation:** Separate list items using vertical white space (`spacing-8`) or by alternating background tones between `surface` and `surface-container-low`. For "The Grand Archive" feed, use a "Block-Style" layout where the date (`label-sm`) sits in a column of white space to the left of the headline, creating a clear vertical axis of navigation.

### Buttons
*   **Primary:** `primary` (#041926) background with `on-primary` (#ffffff) text. Sharp corners. Use a subtle `tertiary` (#211500) 2px bottom-accent on hover to simulate a physical button press.
*   **Tertiary (Ghost):** No background. `primary` text. Hover state uses `surface-container-high` background.

### Input Fields
*   **Style:** Underline only. Use `outline` (#73777c) at 30% opacity for the default state. On focus, the underline transitions to `primary` (#041926) at 2px thickness. Labels should be `label-md` in `on-surface-variant`.

### The "Archive Tag" (Chips)
*   Instead of rounded pills, use "Document Tags." Rectangular shapes with a `tertiary_container` (#3b2900) background and `tertiary_fixed` (#ffdea5) text. These should look like library catalog labels.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme letter-spacing (0.05em) for `label` styles to enhance the scholarly feel.
*   **Do** use "Parchment Transitions": when a user hovers over a card, shift the background from `surface` to `surface-container-lowest` to create a "highlighted paper" effect.
*   **Do** prioritize vertical rhythm. Use a strict 8px grid to ensure dense information remains scannable.

### Don't
*   **Don't** use "Blue" for links. Use `secondary` (#4e6073) or `primary` with a 1px underline.
*   **Don't** use icons as primary navigation. This system is "Typographically Driven"; use text labels in `label-md` whenever possible.
*   **Don't** use standard "Material Design" shadows. If it looks like a standard app, it has failed the "Digital Library" test.
*   **Don't** round any corners. The `0px` radius is a non-negotiable signature of this design system’s structural integrity.