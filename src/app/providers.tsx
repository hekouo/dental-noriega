"use client";

import { ToastProvider } from "@/components/ui/ToastProvider.client";

/**
 * Providers wrapper para toda la aplicación
 * Envuelve componentes que requieren context providers (Toast, etc.)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

