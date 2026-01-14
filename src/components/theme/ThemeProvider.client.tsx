"use client";

import { useEffect, useState } from "react";
import {
  type Theme,
  type ResolvedTheme,
  getInitialTheme,
  resolveTheme,
  applyTheme,
  setStoredTheme,
} from "@/lib/theme/theme";

type ThemeProviderProps = {
  children: React.ReactNode;
  enabled?: boolean;
};

/**
 * Provider de tema (dark mode)
 * Solo funciona si enabled=true (feature flag)
 * Aplica tema al mount y escucha cambios de sistema
 */
export default function ThemeProvider({
  children,
  enabled = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Inicializar tema al mount (default: light)
  useEffect(() => {
    if (!enabled) {
      // Si no está habilitado, asegurar que siempre sea light
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("dark");
      }
      return;
    }
    
    setMounted(true);
    const initial = getInitialTheme();
    setTheme(initial);
    
    // Aplicar tema inicial inmediatamente (evitar flash)
    const resolved = resolveTheme(initial);
    applyTheme(resolved);
  }, [enabled]);

  // Aplicar tema cuando cambia
  useEffect(() => {
    if (!enabled || !mounted) return;
    
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
  }, [enabled, mounted, theme]);

  // Si no está habilitado o no está montado, no hacer nada
  if (!enabled || !mounted) {
    return <>{children}</>;
  }

  // Contexto para componentes hijos (opcional, por ahora solo aplica tema)
  return <>{children}</>;
}

/**
 * Hook para usar el tema (opcional, para componentes que necesiten el estado)
 */
export function useTheme() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_THEME_TOGGLE === "true";
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setMounted(true);
      // Asegurar que siempre sea light si no está habilitado
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("dark");
      }
      return;
    }
    
    setMounted(true);
    const initial = getInitialTheme();
    setThemeState(initial);
  }, [enabled]);

  const setTheme = (newTheme: Theme) => {
    if (!enabled) return;
    
    setThemeState(newTheme);
    setStoredTheme(newTheme);
    const resolved = resolveTheme(newTheme);
    applyTheme(resolved);
  };

  const resolved = mounted && enabled ? resolveTheme(theme) : "light";

  return {
    theme,
    setTheme,
    resolved,
    mounted,
  };
}
