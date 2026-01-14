"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider.client";

type ThemeToggleProps = {
  className?: string;
};

/**
 * Toggle de tema (dark mode)
 * Solo se muestra si NEXT_PUBLIC_ENABLE_THEME_TOGGLE === "true"
 * Usa el theme engine propio (no next-themes)
 */
export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, resolved, mounted } = useTheme();

  // No renderizar si no está montado (evitar hydration mismatch)
  if (!mounted) {
    return (
      <button
        type="button"
        className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${className ?? ""}`}
        aria-label="Cambiar tema"
        disabled
      >
        <Sun className="w-5 h-5" aria-hidden="true" />
      </button>
    );
  }

  const isDark = resolved === "dark";

  const handleToggle = () => {
    // Alternar: light <-> dark (sin system en el toggle)
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${className ?? ""}`}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? (
        <Sun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}
