import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeId =
  | "classic"
  | "dark-red"
  | "dark-purple"
  | "dark-green"
  | "soft-mono"
  | "soft-purple"
  | "soft-green";

export type ThemeFamily = "classic" | "dark" | "soft";

export type ThemeOption = {
  id: ThemeId;
  family: ThemeFamily;
  /** i18n key for the colour name; the classic look has none. */
  color?: "themeRed" | "themePurple" | "themeGreen" | "themeMono";
  /** Swatch: page background + accent. Also the browser's theme-color. */
  bg: string;
  accent: string;
};

/**
 * The original look plus the Wallet Dark / Wallet Soft designs, each in its
 * own accents and in the dark green this app adds to both.
 */
export const THEMES: ThemeOption[] = [
  { id: "classic", family: "classic", bg: "#08090a", accent: "#0f9b6e" },
  { id: "dark-red", family: "dark", color: "themeRed", bg: "#000000", accent: "#ff2a1a" },
  { id: "dark-purple", family: "dark", color: "themePurple", bg: "#000000", accent: "#8a3ffc" },
  { id: "dark-green", family: "dark", color: "themeGreen", bg: "#000000", accent: "#1f8a4c" },
  { id: "soft-mono", family: "soft", color: "themeMono", bg: "#f3f3f3", accent: "#111111" },
  { id: "soft-purple", family: "soft", color: "themePurple", bg: "#f3f3f3", accent: "#8a3ffc" },
  { id: "soft-green", family: "soft", color: "themeGreen", bg: "#f3f3f3", accent: "#14532d" },
];

// index.html reads the same key before first paint, so keep the two in step.
const STORAGE_KEY = "wallet.theme";

function readStored(): ThemeId {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (THEMES.some((t) => t.id === v)) return v as ThemeId;
  } catch {
    // Storage blocked — fall back to the default.
  }
  return "classic";
}

/** Points <html> at a palette in styles.css and keeps shadcn's `dark` variant in step. */
function applyTheme(option: ThemeOption) {
  const root = document.documentElement;
  if (option.id === "classic") delete root.dataset.theme;
  else root.dataset.theme = option.id;
  root.classList.toggle("dark", option.family !== "soft");
  root.style.colorScheme = option.family === "soft" ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", option.bg);
}

type ThemeCtx = { theme: ThemeId; option: ThemeOption; setTheme: (id: ThemeId) => void };

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStored);
  const option = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    applyTheme(option);
    try {
      window.localStorage.setItem(STORAGE_KEY, option.id);
    } catch {
      // Private mode — the choice just will not stick.
    }
  }, [option]);

  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);
  const value = useMemo(() => ({ theme, option, setTheme }), [theme, option, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Which design the screens render: the classic layout, Wallet Dark or Wallet Soft. */
export function useFamily(): ThemeFamily {
  return useTheme().option.family;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
