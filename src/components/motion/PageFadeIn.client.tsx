"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface PageFadeInProps {
  children: React.ReactNode;
}

/**
 * Wrapper que aplica fade-in suave al contenido de la página (opacity 0→1, translateY 6px→0, ~200ms).
 * Se desactiva si el usuario tiene prefers-reduced-motion.
 * No depende de data fetching ni lógica de negocio.
 */
export default function PageFadeIn({ children }: PageFadeInProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(t);
  }, [pathname]);

  useEffect(() => {
    if (reduceMotion) setVisible(true);
  }, [reduceMotion]);

  return (
    <div
      className={reduceMotion ? "" : "page-fade-in".concat(visible ? " is-visible" : "")}
      aria-hidden={false}
    >
      {children}
    </div>
  );
}
