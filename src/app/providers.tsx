"use client";

import { ToastProvider } from "@/components/ui/ToastProvider.client";
import ThemeProvider from "@/components/theme/ThemeProvider.client";

/**
 * Providers wrapper para toda la aplicación
 * Envuelve componentes que requieren context providers (Toast, Theme, etc.)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const themeEnabled = process.env.NEXT_PUBLIC_ENABLE_THEME_TOGGLE === "true";
  
  return (
    <ThemeProvider enabled={themeEnabled}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

