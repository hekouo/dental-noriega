"use client";

import { ToastProvider } from "@/components/ui/ToastProvider.client";
import ThemeProvider from "@/components/theme/ThemeProvider.client";
import dynamic from "next/dynamic";

// Lazy load PWA register (solo se carga si el flag está activo)
const PwaRegister = dynamic(() => import("@/components/pwa/PwaRegister.client"), {
  ssr: false,
});

/**
 * Providers wrapper para toda la aplicación
 * Envuelve componentes que requieren context providers (Toast, Theme, etc.)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const themeEnabled = process.env.NEXT_PUBLIC_ENABLE_THEME_TOGGLE === "true";
  const pwaEnabled = process.env.NEXT_PUBLIC_ENABLE_PWA === "true";
  
  return (
    <ThemeProvider enabled={themeEnabled}>
      <ToastProvider>
        {children}
        {pwaEnabled && <PwaRegister />}
      </ToastProvider>
    </ThemeProvider>
  );
}

