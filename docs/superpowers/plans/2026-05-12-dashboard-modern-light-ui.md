# Dashboard Modern Light UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `web/` dashboard default to a modern light admin UI with subtle 8px-radius cards, light surfaces, and lucide line-icon chrome.

**Architecture:** Keep the change concentrated in the existing theme system, global shell, and shared UI primitives. Add a lightweight pytest contract test that guards the default theme, the preserved Hermes Teal legacy theme, backend theme metadata, and shared primitive styling.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, TypeScript, lucide-react, pytest static source checks.

---

## File Structure

- Modify `web/src/themes/presets.ts`: make `defaultTheme` the modern light theme, add `hermesTealTheme`, and keep `defaultLargeTheme` aligned with the new default.
- Modify `web/src/index.css`: remap shadcn-compatible CSS tokens for light UI and make default backdrop behavior non-decorative.
- Modify `web/src/App.tsx`: restyle root shell, sidebar, mobile header, nav links, and system action rows.
- Modify `web/src/components/ui/card.tsx`: centralize modern card radius, surface, typography, and spacing.
- Modify `web/src/components/ui/input.tsx`: modernize input fill, radius, and focus ring.
- Modify `web/src/components/ui/confirm-dialog.tsx`: modernize modal overlay and title/description typography.
- Modify `web/src/components/ThemeSwitcher.tsx`: modernize theme popover and rows.
- Modify `web/src/components/LanguageSwitcher.tsx`: align language popover and label typography.
- Modify `web/src/components/Backdrop.tsx`: make light themes render a quiet canvas while preserving theme override hooks.
- Modify `hermes_cli/web_server.py`: update built-in dashboard theme labels/options to include the new default and `hermes-teal`.
- Create `tests/web/test_dashboard_modern_light_ui.py`: static contract tests for the above behavior.

### Task 1: Add Modern UI Contract Tests

**Files:**
- Create: `tests/web/test_dashboard_modern_light_ui.py`

- [ ] **Step 1: Write failing tests**

Create tests that read source files and assert:

```python
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_default_dashboard_theme_is_modern_light_and_legacy_teal_is_available():
    presets = read("web/src/themes/presets.ts")

    default_block = presets.split("export const defaultTheme", 1)[1].split(
        "export const", 1
    )[0]
    registry_block = presets.split("export const BUILTIN_THEMES", 1)[1]

    assert 'label: "Modern Light"' in default_block
    assert 'background: { hex: "#f6f8fb", alpha: 1 }' in default_block
    assert 'midground: { hex: "#172033", alpha: 1 }' in default_block
    assert 'foreground: { hex: "#2563eb", alpha: 1 }' in default_block
    assert 'radius: "0.5rem"' in default_block
    assert "colorOverrides" in default_block
    assert "hermesTealTheme" in presets
    assert '"hermes-teal": hermesTealTheme' in registry_block


def test_backend_advertises_modern_default_and_legacy_teal_theme():
    web_server = read("hermes_cli/web_server.py")

    assert '"dashboard.theme": {' in web_server
    assert '"options": ["default", "default-large", "hermes-teal"' in web_server
    assert '{"name": "default",       "label": "Modern Light"' in web_server
    assert '{"name": "hermes-teal",   "label": "Hermes Teal"' in web_server


def test_shared_primitives_use_modern_light_card_and_input_styles():
    card = read("web/src/components/ui/card.tsx")
    input_component = read("web/src/components/ui/input.tsx")
    dialog = read("web/src/components/ui/confirm-dialog.tsx")

    assert "rounded-lg" in card
    assert "shadow-[0_1px_2px_rgba(16,24,40,0.06)]" in card
    assert "normal-case" in card
    assert "rounded-lg" in input_component
    assert "bg-white" in input_component
    assert "focus-visible:ring-primary/20" in input_component
    assert "bg-slate-950/35" in dialog
    assert "rounded-xl" in dialog


def test_app_shell_uses_light_surfaces_and_normal_text_case():
    app = read("web/src/App.tsx")
    backdrop = read("web/src/components/Backdrop.tsx")

    assert "bg-[#f6f8fb]" in app
    assert "text-slate-900" in app
    assert "bg-white/95" in app
    assert "normal-case" in app
    assert "rounded-lg" in app
    assert "data-theme-light-canvas" in backdrop
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
python -m pytest tests/web/test_dashboard_modern_light_ui.py -q
```

Expected: FAIL because the default theme is still Hermes Teal and the modern light shell/style strings do not exist yet.

### Task 2: Implement Theme Registry and Backend Metadata

**Files:**
- Modify: `web/src/themes/presets.ts`
- Modify: `hermes_cli/web_server.py`

- [ ] **Step 1: Implement theme definitions**

Update `defaultTheme` to Modern Light. Add `hermesTealTheme` with the old default palette. Update `defaultLargeTheme` to use the new light palette. Register `hermes-teal`.

- [ ] **Step 2: Update backend metadata**

Update dashboard theme options and `_BUILTIN_DASHBOARD_THEMES` so the server advertises `default` as Modern Light and includes `hermes-teal`.

- [ ] **Step 3: Run focused tests**

Run:

```bash
python -m pytest tests/web/test_dashboard_modern_light_ui.py -q
```

Expected: Remaining failures only in shell/shared primitive assertions.

### Task 3: Implement Light Tokens and Shared Primitives

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/src/components/ui/card.tsx`
- Modify: `web/src/components/ui/input.tsx`
- Modify: `web/src/components/ui/confirm-dialog.tsx`
- Modify: `web/src/components/ThemeSwitcher.tsx`
- Modify: `web/src/components/LanguageSwitcher.tsx`
- Modify: `web/src/components/Backdrop.tsx`

- [ ] **Step 1: Update CSS token mapping**

Make light semantic tokens first-class through `colorOverrides` and safer fallbacks in `index.css`. Keep the theme component-style escape hatches intact.

- [ ] **Step 2: Update shared primitives**

Apply modern radii, white surfaces, soft borders, readable typography, and light popover/modal shadows.

- [ ] **Step 3: Run focused tests**

Run:

```bash
python -m pytest tests/web/test_dashboard_modern_light_ui.py -q
```

Expected: Remaining failures only in `App.tsx` assertions.

### Task 4: Implement App Shell Styling

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Update root and mobile shell**

Use a light canvas, normal casing, and white mobile header.

- [ ] **Step 2: Update sidebar and nav rows**

Use white sidebar surface, subtle borders, rounded active/hover rows, muted inactive icons, and primary active color.

- [ ] **Step 3: Update system action rows**

Match the nav row style and preserve busy/spinner behavior.

- [ ] **Step 4: Run focused tests**

Run:

```bash
python -m pytest tests/web/test_dashboard_modern_light_ui.py -q
```

Expected: PASS.

### Task 5: Build, Lint, and Browser Verify

**Files:**
- No planned production file changes unless verification reveals a concrete issue.

- [ ] **Step 1: Run web build**

Run:

```bash
cd web
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Run lint**

Run:

```bash
cd web
npm run lint
```

Expected: exit code 0, or report pre-existing unrelated lint failures if present.

- [ ] **Step 3: Launch local dashboard preview**

Run:

```bash
cd web
npm run dev -- --host 127.0.0.1
```

Expected: Vite starts and prints a localhost URL.

- [ ] **Step 4: Browser-check representative routes**

Open the Vite URL and inspect `/sessions`, `/chat`, `/models`, `/config`, and `/skills` at desktop and mobile widths. Verify that the shell is light, cards and inputs are readable, nav states are clear, and `/chat` terminal remains readable.

### Task 6: Final Review

**Files:**
- Review all changed files with `git diff`.

- [ ] **Step 1: Check working tree**

Run:

```bash
git status --short
```

Expected: only planned files changed by this implementation plus the user's pre-existing unrelated work.

- [ ] **Step 2: Review final diff**

Run:

```bash
git diff -- web/src/themes/presets.ts web/src/index.css web/src/App.tsx web/src/components/ui/card.tsx web/src/components/ui/input.tsx web/src/components/ui/confirm-dialog.tsx web/src/components/ThemeSwitcher.tsx web/src/components/LanguageSwitcher.tsx web/src/components/Backdrop.tsx hermes_cli/web_server.py tests/web/test_dashboard_modern_light_ui.py
```

Expected: diff matches the approved design and does not revert unrelated user changes.
