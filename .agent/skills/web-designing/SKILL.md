---
name: web-designing
description: Designs and implements beautiful, responsive, and modern web interfaces using HTML, CSS (Vanilla or Tailwind), and JavaScript/React. Use when the user asks for web design, UI improvements, or creating new web pages.
---

# Web Designing

## When to use this skill
- The user asks to "design" a page or component.
- The user wants to "make it look good" or "improve the UI".
- The user requests a new feature that requires a visual interface.
- The user mentions "responsive", "mobile-first", "animations", or "modern UI".

## Workflow
1.  **Analyze**: Understand the user's requirements and the current technology stack (Vanilla CSS vs Tailwind, React vs HTML/JS).
2.  **Concept**: Plan the improved design, focusing on color palettes, typography, spacing, and modern aesthetics (glassmorphism, gradients, micro-animations).
3.  **Implement**: Write the code.
    - If modifying existing CSS, ensure consistency or introduce a new design system variable set.
    - If creating new components, ensure they are self-contained and reusable.
4.  **Refine**: Add polish (hover states, transitions, responsive adjustments).

## Instructions

### Design Philosophy
- **WOW Factor**: The design must be visually stunning immediately. Avoid "developer art" or generic Bootstrap looks.
- **Modern Aesthetics**: Use vibrant colors, deep dark modes, subtle shadows, rounded corners, and glassmorphism.
- **Typography**: Suggest and use modern fonts (Inter, Roboto, Poppins) over system defaults.
- **Motion**: Always include subtle transitions (`transition: all 0.3s ease`) on interactive elements.

### Technical Guidelines
- **CSS**: Prefer Vanilla CSS variables for theming unless Tailwind is explicitly requested.
    - Define colors in `:root` for easy theming (e.g., `--primary-color`, `--bg-surface`).
- **Responsive**: Mobile-first approach. Ensure layouts break down gracefully on smaller screens.
- **Accessibility**: Ensure sufficient contrast and proper ARIA labels where necessary, but prioritize visual impact for this skill.
- **No Placeholders**: Use `generate_image` or realistic data instead of "lorem ipsum" or gray boxes if possible.

### Implementation Details
1.  **Colors**: Do not use `red`, `blue`, `green`. Use specific hex codes or HSL values (e.g., `hsl(220, 15%, 20%)` for a dark background).
2.  **Spacing**: Use a consistent spacing scale (4px, 8px, 16px, 32px, etc.).
3.  **Components**:
    - **Buttons**: Subtle gradient or shadow, hover lift effect.
    - **Card**: White or dark-gray background, light border or subtle shadow, rounded-lg or xl.
    - **Inputs**: Clean borders, focus rings that match the primary color.

## Resources
- [Tailwind CSS Docs](https://tailwindcss.com/docs) (if using Tailwind)
- [MDN Web Docs - CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)
