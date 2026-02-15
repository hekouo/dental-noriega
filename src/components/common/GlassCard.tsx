"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Si en el futuro se usa Slot, se puede delegar; por ahora siempre div */
  asChild?: boolean;
};

/**
 * Card reutilizable para tiles bento: borde suave, sombra ligera, rounded-2xl.
 * Soporta className. asChild reservado para futuro Slot.
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-black/8 dark:border-white/12",
          "bg-white/90 dark:bg-gray-900/90 backdrop-blur-[2px]",
          "shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
          "transition-shadow duration-200 hover:shadow-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
