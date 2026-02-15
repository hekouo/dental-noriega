/**
 * Utilidad para combinar classNames con Tailwind (evita conflictos).
 * Usado por GlassCard, AnimatedSeparator, BentoSection, CategoryGrid, etc.
 */
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(
  ...inputs: Array<string | undefined | null | false | 0>
) {
  return twMerge(clsx(inputs));
}
