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
