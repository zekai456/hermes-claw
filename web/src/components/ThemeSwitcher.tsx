import { useCallback, useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@nous-research/ui/ui/components/button";
import { ListItem } from "@nous-research/ui/ui/components/list-item";
import { Typography } from "@/components/NouiTypography";
import { BUILTIN_THEMES, useTheme } from "@/themes";
import type { DashboardTheme } from "@/themes";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Compact theme picker mounted next to the language switcher in the header.
 * Each dropdown row shows a 3-stop swatch (background / midground / warm
 * glow) so users can preview the palette before committing. User-defined
 * themes from `~/.hermes/dashboard-themes/*.yaml` use their API-provided
 * definitions so they show real palette swatches just like built-ins.
 *
 * When placed at the bottom of a container (e.g. the sidebar rail), pass
 * `dropUp` so the menu opens above the trigger instead of clipping below
 * the viewport.
 */
export function ThemeSwitcher({ dropUp = false }: ThemeSwitcherProps) {
  const { themeName, availableThemes, setTheme } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const current = availableThemes.find((th) => th.name === themeName);
  const label = current?.label ?? themeName;

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        ghost
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg px-2 py-1 normal-case tracking-normal font-normal text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title={t.theme?.switchTheme ?? "Switch theme"}
        aria-label={t.theme?.switchTheme ?? "Switch theme"}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="inline-flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" />

          <Typography
            mondwest
            className="hidden sm:inline text-[0.75rem] normal-case tracking-normal"
          >
            {label}
          </Typography>
        </span>
      </Button>

      {open && (
        <div
          role="listbox"
          aria-label={t.theme?.title ?? "Theme"}
          className={cn(
            "absolute z-50 min-w-[240px]",
            dropUp ? "left-0 bottom-full mb-1" : "right-0 top-full mt-1",
            "overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground",
            "shadow-[0_16px_40px_-18px_rgba(15,23,42,0.45)]",
          )}
        >
          <div className="border-b border-border px-3 py-2">
            <Typography
              mondwest
              className="text-[0.7rem] font-medium normal-case tracking-normal text-muted-foreground"
            >
              {t.theme?.title ?? "Theme"}
            </Typography>
          </div>

          {availableThemes.map((th) => {
            const isActive = th.name === themeName;
            const paletteTheme = BUILTIN_THEMES[th.name] ?? th.definition;

            return (
              <ListItem
                key={th.name}
                active={isActive}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setTheme(th.name);
                  close();
                }}
                className="gap-3 px-3 py-2 text-sm hover:bg-accent"
              >
                {paletteTheme ? (
                  <ThemeSwatch theme={paletteTheme} />
                ) : (
                  <PlaceholderSwatch />
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Typography
                    mondwest
                    className="truncate text-sm font-medium normal-case tracking-normal"
                  >
                    {th.label}
                  </Typography>
                  {th.description && (
                    <Typography className="truncate text-xs normal-case tracking-normal text-muted-foreground">
                      {th.description}
                    </Typography>
                  )}
                </div>

                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-primary",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </ListItem>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemeSwatch({ theme }: { theme: DashboardTheme }) {
  const { background, midground, warmGlow } = theme.palette;
  return (
    <div
      aria-hidden
      className="flex h-4 w-9 shrink-0 overflow-hidden border border-current/20"
    >
      <span className="flex-1" style={{ background: background.hex }} />
      <span className="flex-1" style={{ background: midground.hex }} />
      <span className="flex-1" style={{ background: warmGlow }} />
    </div>
  );
}

function PlaceholderSwatch() {
  return (
    <div
      aria-hidden
      className="h-4 w-9 shrink-0 border border-dashed border-current/20"
    />
  );
}

interface ThemeSwitcherProps {
  dropUp?: boolean;
}
