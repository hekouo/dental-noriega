"use client";

import { useEffect, useState } from "react";

/**
 * Componente que agrega efecto de sombra al header cuando se hace scroll
 * Se usa como wrapper o efecto en el header existente
 */
export function useHeaderScroll() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return isScrolled;
}

