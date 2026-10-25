import type { CSSProperties } from "react";
import { Check, Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "../../lib/i18n";
import { THEMES, useTheme, type ThemeFamily, type ThemeOption } from "../../lib/theme";

const FAMILIES: { family: ThemeFamily; key: "themeClassic" | "themeDark" | "themeSoft" }[] = [
  { family: "classic", key: "themeClassic" },
  { family: "dark", key: "themeDark" },
  { family: "soft", key: "themeSoft" },
];

function Swatch({ option }: { option: ThemeOption }) {
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center"
      style={{
        width: 22,
        height: 22,
        borderRadius: 99,
        background: option.bg,
        border: "1px solid rgb(var(--ink-rgb) / .16)",
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: option.accent }} />
    </span>
  );
}

/** Top-bar chip that switches between the classic, Dark and Soft palettes. */
export default function ThemePicker({ style, compact = false }: { style?: CSSProperties; compact?: boolean }) {
  const { t } = useI18n();
  const { theme, option, setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t.theme}
        title={t.theme}
        className="flex items-center"
        style={{
          gap: 6,
          padding: compact ? "3px 8px" : "6px 10px",
          border: "1px solid rgb(var(--fg-rgb) / .16)",
          borderRadius: 99,
          color: "rgb(var(--fg-rgb) / .65)",
          fontSize: compact ? 10.5 : 12,
          fontWeight: 700,
          lineHeight: 1,
          ...style,
        }}
      >
        <Palette size={compact ? 12 : 14} />
        <span style={{ width: 8, height: 8, borderRadius: 99, background: option.accent }} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        {FAMILIES.map(({ family, key }) => (
          <div key={family} style={{ padding: "4px 0" }}>
            <div style={{ fontSize: 11, padding: "4px 8px", color: "rgb(var(--fg-rgb) / .45)" }}>{t[key]}</div>
            {THEMES.filter((o) => o.family === family).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setTheme(o.id)}
                aria-pressed={theme === o.id}
                className="flex w-full items-center hover:bg-muted"
                style={{ gap: 10, padding: "7px 8px", borderRadius: 10, fontSize: 13, textAlign: "start" }}
              >
                <Swatch option={o} />
                <span className="flex-1">{o.color ? t[o.color] : t.themeClassic}</span>
                {theme === o.id && <Check size={15} style={{ color: "var(--c-primary)" }} />}
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
