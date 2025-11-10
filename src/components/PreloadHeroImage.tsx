"use client";

import { useEffect } from "react";

type Props = {
  imageUrl: string | null | undefined;
};

export default function PreloadHeroImage({ imageUrl }: Props) {
  useEffect(() => {
    if (!imageUrl || typeof window === "undefined") return;

    // Verificar si ya existe un preload para esta imagen
    const existing = document.querySelector(`link[rel="preload"][href="${imageUrl}"]`);
    if (existing) return;

    // Preload con formato moderno (AVIF primero, luego WebP, luego fallback)
    // Next.js Image optimiza automáticamente, pero el preload debe apuntar a la URL original
    // El navegador elegirá el mejor formato disponible
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = imageUrl;
    link.setAttribute("fetchpriority", "high");
    
    // Agregar type hints para formatos modernos
    if (imageUrl.includes("lh3.googleusercontent.com") || imageUrl.includes("drive.google.com")) {
      // Google Drive/Images ya optimiza, pero podemos ayudar con hints
      link.setAttribute("type", "image/webp");
    }
    
    // Insertar al inicio del head para máxima prioridad
    const firstChild = document.head.firstChild;
    if (firstChild) {
      document.head.insertBefore(link, firstChild);
    } else {
      document.head.appendChild(link);
    }
  }, [imageUrl]);

  return null;
}



