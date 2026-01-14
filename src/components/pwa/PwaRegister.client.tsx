"use client";

import { useEffect } from "react";

/**
 * Componente para registrar el Service Worker de PWA
 * Solo se ejecuta si:
 * - NEXT_PUBLIC_ENABLE_PWA === "true"
 * - Está en producción (NODE_ENV === "production")
 * - El navegador soporta Service Workers
 */
export default function PwaRegister() {
  useEffect(() => {
    // Verificar feature flag
    const isPwaEnabled = process.env.NEXT_PUBLIC_ENABLE_PWA === "true";
    if (!isPwaEnabled) {
      return;
    }

    // Solo en producción
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // Verificar soporte de Service Worker
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Registrar Service Worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Log para debugging (solo en desarrollo local si se necesita)
        if (process.env.NODE_ENV === "development") {
          console.log("[PWA] Service Worker registrado:", registration);
        }

        // Escuchar actualizaciones del SW
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Hay una nueva versión disponible
                // Por ahora no mostramos notificación, solo actualizamos en background
                if (process.env.NODE_ENV === "development") {
                  console.log("[PWA] Nueva versión del SW disponible");
                }
              }
            });
          }
        });
      } catch (error) {
        // Silenciar errores de registro (puede fallar en algunos contextos)
        if (process.env.NODE_ENV === "development") {
          console.warn("[PWA] Error al registrar Service Worker:", error);
        }
      }
    };

    registerSW();
  }, []);

  // Este componente no renderiza nada
  return null;
}
