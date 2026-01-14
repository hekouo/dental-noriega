"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastOptions = {
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  actionHref?: string;
  durationMs?: number;
};

type ToastState = {
  open: boolean;
  message: string;
  variant: ToastVariant;
  actionLabel?: string;
  actionHref?: string;
};

type ToastContextType = {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Hook para usar el sistema de toasts
 * @example
 * const { showToast } = useToast();
 * showToast({ message: "Agregado al carrito", actionLabel: "Ver carrito", actionHref: "/checkout" });
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

/**
 * Provider de toasts global
 * Montar una sola vez en el layout principal
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    variant: "success",
  });
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  const showToast = useCallback(
    ({ message, variant = "success", actionLabel, actionHref, durationMs = 1400 }: ToastOptions) => {
      // Si ya hay un toast abierto, reiniciar el timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      setToast({
        open: true,
        message,
        variant,
        actionLabel,
        actionHref,
      });

      // Auto-close después de durationMs
      const id = setTimeout(() => {
        hideToast();
      }, durationMs);

      setTimeoutId(id);
    },
    [timeoutId, hideToast],
  );

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const variantStyles = {
    success: "bg-emerald-600 text-white border-emerald-700",
    error: "bg-red-600 text-white border-red-700",
    info: "bg-blue-600 text-white border-blue-700",
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Toast container */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`fixed z-50 transition-all duration-300 ease-out ${
          toast.open
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        } ${
          // Posición: bottom-center en móvil, bottom-right en desktop
          // Con micro-anims activo, ajustar más arriba para no tapar bottom nav
          process.env.NEXT_PUBLIC_MOBILE_MICRO_ANIMS === "true"
            ? "bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6"
            : "bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:bottom-6 md:right-6"
        }`}
        style={{
          paddingBottom:
            process.env.NEXT_PUBLIC_MOBILE_MICRO_ANIMS === "true"
              ? "calc(env(safe-area-inset-bottom, 0px) + 1rem)"
              : "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
        }}
      >
        {toast.open && (
          <div
            className={`min-w-[280px] max-w-[90vw] md:max-w-md px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 ${variantStyles[toast.variant]}`}
          >
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            {toast.actionLabel && toast.actionHref && (
              <Link
                href={toast.actionHref}
                onClick={hideToast}
                className="text-sm font-semibold underline underline-offset-2 hover:opacity-90 transition-opacity min-h-[44px] flex items-center"
              >
                {toast.actionLabel}
              </Link>
            )}
            <button
              onClick={hideToast}
              aria-label="Cerrar notificación"
              className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-current"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

