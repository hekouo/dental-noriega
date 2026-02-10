"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch - solo para el icono
  useEffect(() => {
    setMounted(true);
  }, []);

  // Solo alternar light <-> dark (sin system)
  const handleToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Placeholder mientras se monta (solo afecta el icono, no toda la UI)
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-premium"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {mounted ? (
        isDark ? (
          <Sun className="w-5 h-5" aria-hidden="true" />
        ) : (
          <Moon className="w-5 h-5" aria-hidden="true" />
        )
      ) : (
        <Sun className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}

