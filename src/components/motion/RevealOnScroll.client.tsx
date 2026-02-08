"use client";

import { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
  children: React.ReactNode;
  /** Umbral de intersección (0–1). Default 0.12 */
  threshold?: number;
  className?: string;
}

/**
 * Envuelve contenido y revela con fade + translateY(10px) cuando entra en viewport.
 * Usa IntersectionObserver (threshold 0.12). Respeta prefers-reduced-motion.
 * Listo para usarse en PRs siguientes; no aplicado masivamente aún.
 */
export default function RevealOnScroll({
  children,
  threshold = 0.12,
  className = "",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
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
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion, threshold]);

  const baseClass = reduceMotion ? "" : "reveal-on-scroll".concat(revealed ? " is-revealed" : "");

  return (
    <div ref={ref} className={[baseClass, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
