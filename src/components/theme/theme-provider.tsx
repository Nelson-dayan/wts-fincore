"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = React.PropsWithChildren<{
  /** @deprecated Ignored; kept for drop-in compatibility with next-themes layout props */
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}>;

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  /** For ThemeToggle / next-themes-like API */
  themes: readonly string[];
  systemTheme: "light" | "dark";
};

const STORAGE_KEY = "theme";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyDom(theme: Theme) {
  const r = resolve(theme);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(r);
  root.style.colorScheme = r;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    let initial: Theme = "system";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") initial = raw;
    } catch {
      /* private mode */
    }
    setThemeState(initial);
    const r = resolve(initial);
    setResolvedTheme(r);
    applyDom(initial);
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    applyDom(theme);
    setResolvedTheme(resolve(theme));
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, ready]);

  React.useEffect(() => {
    if (!ready || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolvedTheme(getSystemTheme());
      applyDom("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, ready]);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: ["light", "dark", "system"] as const,
      systemTheme: typeof window === "undefined" ? "light" : getSystemTheme(),
    }),
    [theme, setTheme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
