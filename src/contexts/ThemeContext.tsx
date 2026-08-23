import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type MivaTheme = "feminino" | "masculino";
export type MivaMode = "claro" | "escuro";

const STORAGE_KEY = "miva:tema";
const MODE_KEY = "miva:modo";

type Ctx = {
  theme: MivaTheme;
  setTheme: (t: MivaTheme) => void;
  mode: MivaMode;
  setMode: (m: MivaMode) => void;
};

const ThemeContext = createContext<Ctx>({
  theme: "feminino",
  setTheme: () => {},
  mode: "claro",
  setMode: () => {},
});

function readStored(): MivaTheme {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "masculino" ? "masculino" : "feminino";
  } catch {
    return "feminino";
  }
}

function readStoredMode(): MivaMode {
  try {
    const v = window.localStorage.getItem(MODE_KEY);
    return v === "escuro" ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MivaTheme>(readStored);
  const [mode, setModeState] = useState<MivaMode>(readStoredMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-masc", theme === "masculino");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage indisponível */
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "escuro");
    try {
      window.localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* storage indisponível */
    }
  }, [mode]);

  const setTheme = (t: MivaTheme) => setThemeState(t);
  const setMode = (m: MivaMode) => setModeState(m);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

