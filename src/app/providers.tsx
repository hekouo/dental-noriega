"use client";

import { ToastProvider } from "@/components/ui/ToastProvider.client";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

/**
 * Providers wrapper para toda la aplicación
 * Envuelve componentes que requieren context providers (Toast, Theme, etc.)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

