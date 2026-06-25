import React, { createContext, useContext, useEffect } from "react";

/** Только тёмная тема — светлая отключена. */
interface ThemeContextType {
  theme: "dark";
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    localStorage.setItem("vibe_theme", "dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
