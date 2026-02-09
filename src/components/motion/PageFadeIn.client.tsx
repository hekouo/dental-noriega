"use client";

import { useEffect, useState } from "react";

interface PageFadeInProps {
  children: React.ReactNode;
}

/**
 * Wrapper one-shot: fade-in suave solo al primer montaje (opacity 0→1, translateY 6px→0, ~200ms).
 * NO reinicia en navegación (evita flicker/percepción de lentitud).
 * Se desactiva si el usuario tiene prefers-reduced-motion.
 */
export default function PageFadeIn({ children }: PageFadeInProps) {
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
    if (reduceMotion) {
      setVisible(true);
      return;
    }
    let innerId: number | null = null;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outerId);
      if (innerId != null) cancelAnimationFrame(innerId);
    };
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
