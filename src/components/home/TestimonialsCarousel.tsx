"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

type Testimonial = {
  name: string;
  city?: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Dra. María González",
    city: "CDMX",
    quote:
      "Atención rápida y productos que piden. Los envíos llegan bien y el soporte por WhatsApp responde.",
  },
  {
    name: "Clínica Dental San José",
    city: "Guadalajara",
    quote:
      "Compramos consumibles y material de ortodoncia. Facturación sin problemas y precios claros.",
  },
  {
    name: "Dr. Carlos Ramírez",
    city: "Monterrey",
    quote:
      "Llevo años comprando aquí. La atención personalizada y el catálogo amplio hacen la diferencia.",
  },
  {
    name: "Dra. Ana López",
    quote: "Envíos a todo México y precios en MXN. Muy práctico para la clínica.",
  },
];

const AUTO_SCROLL_INTERVAL_MS = 7000;
const CARD_WIDTH = 320;
const SCROLL_OFFSET = 340;

/**
 * Carrusel de testimonios: scroll-snap, prev/next, auto-scroll solo si NO reduced motion.
 * Pausa en hover/focus. Accesible (aria-labels, focus visible).
 */
export default function TestimonialsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const scroll = useCallback(
    (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;
      const offset = direction === "left" ? -SCROLL_OFFSET : SCROLL_OFFSET;
      el.scrollBy({
        left: offset,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [prefersReducedMotion]
  );

  // Auto-scroll solo si NO reduced motion y no está pausado
  useEffect(() => {
    if (prefersReducedMotion || isPaused || TESTIMONIALS.length <= 1) return;

    const id = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const next = el.scrollLeft + SCROLL_OFFSET;
      if (next >= maxScroll) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: SCROLL_OFFSET, behavior: "smooth" });
      }
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [prefersReducedMotion, isPaused]);

  return (
    <section
      className="max-w-6xl mx-auto px-4 py-10 sm:py-14"
      aria-labelledby="testimonials-heading"
      aria-roledescription="carousel"
    >
      <h2
        id="testimonials-heading"
        className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-2 text-center"
      >
        Lo que dicen nuestros clientes
      </h2>
      <p className="text-muted-foreground text-center text-sm sm:text-base mb-8 max-w-xl mx-auto">
        Clínicas y profesionales que confían en nosotros.
      </p>

      <div className="relative">
        {/* Botones prev/next */}
        {TESTIMONIALS.length > 1 && (
          <div className="flex justify-center gap-2 mb-4" aria-hidden>
            <button
              type="button"
              onClick={() => scroll("left")}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Testimonio anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Siguiente testimonio"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          className={cn(
            "overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide",
            "focus-within:outline-none"
          )}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollPaddingLeft: "1rem",
            scrollPaddingRight: "1rem",
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex gap-4 w-max">
            {TESTIMONIALS.map((t, i) => (
              <article
                key={i}
                className={cn(
                  "flex-shrink-0 snap-start w-[min(85vw,320px)] sm:w-[320px]",
                  "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-5 shadow-sm",
                  "min-h-[140px] flex flex-col"
                )}
              >
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed flex-1 line-clamp-3">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {t.name}
                  </p>
                  {t.city && (
                    <p className="text-xs text-muted-foreground">{t.city}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
