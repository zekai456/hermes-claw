# Dashboard Modern Light UI Design

Date: 2026-05-12

## Goal

Modernize the `web/` dashboard so the default experience is a light, product-grade admin UI with subtle 8px-radius cards, soft borders, restrained shadows, clear hierarchy, and lucide line icons. The existing embedded chat terminal remains the real `hermes --tui` surface; this work does not rebuild the chat transcript or composer in React.

## Scope

This design covers the browser dashboard under `web/`.

In scope:

- Make the new modern light style the dashboard default.
- Preserve the current Hermes Teal look as a selectable legacy theme.
- Restyle the global app shell: sidebar, mobile header, main content area, and navigation states.
- Restyle shared primitives so existing pages inherit the new look: cards, inputs, dialogs, popovers, and small shared chrome.
- Keep lucide-react as the standard line-icon language.
- Verify representative pages across desktop and mobile.

Out of scope:

- Reimplementing `/chat` in React.
- Redesigning the Ink TUI in `ui-tui/`.
- Reworking backend APIs, routes, plugin loading, or data models.
- Deep per-page business-logic refactors.

## Current Context

The dashboard is a React/Vite app in `web/`. It already uses Tailwind v4, `lucide-react`, `@nous-research/ui`, shadcn-compatible token names, a theme provider, and local UI primitives in `web/src/components/ui/`.

The default visual language is currently dark Hermes Teal with decorative backdrop treatment, uppercase display typography, and theme tokens derived from `background`, `midground`, and `foreground`. `App.tsx` owns the global shell and routing. `/chat` is mounted carefully so the PTY child and xterm instance can persist while the user navigates.

## Recommended Approach

Use a theme-system plus shared-component update. This gives the broadest visual coverage with a limited and understandable edit surface.

1. Update `web/src/themes/presets.ts`.
   - Replace the current `defaultTheme` with a new modern light theme.
   - Move the current Hermes Teal palette into a new built-in theme, likely `hermes-teal`.
   - Keep the theme registry backward-compatible enough that existing theme switching still works.

2. Update `web/src/index.css`.
   - Remap shadcn-compatible tokens for a light UI.
   - Provide semantic colors for background, card, popover, primary, muted, border, input, ring, success, warning, and destructive.
   - Remove global visual assumptions that make the dashboard feel dark, decorative, or terminal-first.

3. Update `web/src/App.tsx`.
   - Restyle the root app shell to use light backgrounds and natural text casing.
   - Give the sidebar a white surface, subtle right border, compact nav rows, and clear active state.
   - Give the main content region a quiet light-gray canvas.
   - Preserve mobile navigation behavior and plugin slots.

4. Update shared UI primitives.
   - `Card`: white surface, 8px radius, soft border, subtle shadow.
   - `Input`: white background, 8px radius, clear focus ring.
   - `ConfirmDialog`: modern modal surface and overlay.
   - Menus/popovers such as language and theme switchers: light popover surface with shadow and soft border.

## Visual System

Default palette:

- App background: `#f6f8fb`
- Surface/card: `#ffffff`
- Elevated surface: `#ffffff`
- Primary text: `#172033`
- Secondary text: `#667085`
- Border: `#d9e2ec`
- Muted fill: `#eef3f8`
- Primary accent: `#2563eb` or a restrained Hermes teal such as `#0f8f8c`
- Success: softened green suitable for light backgrounds
- Warning: softened amber suitable for light backgrounds
- Destructive: softened red suitable for light backgrounds

Typography:

- Use the system sans stack for dashboard chrome and page UI.
- Preserve monospace for terminal, logs, code, IDs, and dense technical readouts.
- Remove global uppercase styling from the app shell. Use uppercase only for small labels where it improves scanability.
- Keep letter spacing at `0` unless a local label intentionally needs a small amount.

Shape and elevation:

- Default card radius: 8px.
- Inputs, nav active pills, dialogs, and popovers should use the same radius scale.
- Prefer 1px borders and very soft shadows. Avoid heavy glassmorphism, decorative clipping, and dramatic glow.

Icons:

- Continue using `lucide-react`.
- Keep navigation icons around `16px`.
- Use muted icon color by default and primary/accent only for active or semantic states.

## Component Details

### App Shell

The root app should use a light background and normal text casing. The persistent plugin slots remain in place. The sidebar becomes a stable white navigation rail with a subtle border and enough width for translated labels. Mobile header uses the same white surface and border treatment.

Active nav rows should use a light primary tint and a clear text/icon color. Hover states should use muted fill, not opacity-only changes. This improves discoverability on light backgrounds.

### Cards

The shared `Card` primitive becomes the main surface primitive. It should own the default radius, border, background, text color, and shadow. Card headers keep compact spacing and avoid oversized display typography.

### Inputs and Forms

Inputs should read as standard dashboard controls: white fill, border, placeholder muted text, and a visible focus ring. Textareas in `AutoField` and similar components should inherit compatible shape and focus behavior.

### Dialogs and Popovers

Dialogs and dropdown menus should use white popover surfaces, soft shadows, and clear focus styles. Overlays should dim without turning the whole app into a dark-themed screen.

### Chat Page

The surrounding dashboard shell may be light, but the embedded terminal must remain readable. The design should avoid forcing light dashboard tokens into xterm internals unless a dedicated terminal palette is intentionally configured. The implementation should read the existing `ChatPage.tsx` first because the working tree already contains changes there.

## Data Flow and Compatibility

No new API contracts are needed. Theme application continues through the existing `ThemeProvider`, which writes CSS variables into the document. Most pages already use token classes such as `bg-card`, `text-muted-foreground`, `border-border`, and `text-primary`, so global token updates should propagate broadly.

Plugin pages inherit the same token system. Plugin-specific custom CSS is not guaranteed to become fully modernized, but it should remain readable against the new default surface.

## Risks and Mitigations

- Risk: Existing page-level classes assume a dark background.
  Mitigation: Verify representative pages and patch only the highest-impact shared classes or obvious local conflicts.

- Risk: The embedded xterm surface loses contrast.
  Mitigation: Preserve terminal-specific font and palette behavior. Do not replace the chat terminal with React.

- Risk: Existing uncommitted user changes are present.
  Mitigation: Read files before editing, keep patches focused, and avoid reverting unrelated changes.

- Risk: Backend built-in theme names are mirrored in `hermes_cli/web_server.py`.
  Mitigation: Update the backend theme list if the frontend adds or renames built-ins.

## Verification Plan

Run:

```bash
cd web
npm run build
```

Run lint if build succeeds and lint is reasonably scoped:

```bash
cd web
npm run lint
```

Manual/browser verification:

- `/sessions`: card list, filters, badges, empty/loading/error states.
- `/chat`: terminal remains readable and persistent.
- `/models`: dense cards and model picker controls.
- `/config`: forms, inputs, nested panels.
- `/skills`: sidebar panel, cards, tabs, search controls.
- Mobile width: sidebar drawer, header, nav labels, card text wrapping.

## Acceptance Criteria

- Opening the dashboard defaults to the new modern light style.
- The previous Hermes Teal appearance remains available as a selectable theme.
- Main dashboard pages read as a cohesive light admin UI.
- Cards use subtle radius, border, and elevation.
- Controls and popovers are readable on light backgrounds.
- Lucide line icons remain the standard icon language.
- `/chat` still embeds the real TUI and remains readable.
- `npm run build` succeeds for `web/`.
