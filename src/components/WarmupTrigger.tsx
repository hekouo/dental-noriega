"use client";
import { useEffect } from "react";

export default function WarmupTrigger() {
  useEffect(() => {
    // Solo en desarrollo y con debug activado
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEBUG === "1") {
      const warmup = async () => {
        try {
          const response = await fetch("/api/_warmup");
          if (response.ok) {
            const data = await response.json();
            console.info("🔥 Catalog index warmed up:", data.stats);
          } else {
            console.warn("⚠️ Warmup failed:", response.status);
          }
        } catch (error) {
          console.warn("⚠️ Warmup error:", error);
        }
      };

      // Warmup después de 2 segundos para no bloquear el render inicial
      const timeoutId = setTimeout(warmup, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  return null; // No renderiza nada
}
