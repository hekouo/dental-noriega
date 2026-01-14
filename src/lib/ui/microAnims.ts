/**
 * Helpers para micro-interacciones móviles (tap feedback)
 * Solo activo si NEXT_PUBLIC_MOBILE_MICRO_ANIMS === "true"
 * Respeta prefers-reduced-motion
 */

type TapKind = "button" | "icon";

type TapClassOptions = {
  kind: TapKind;
  enabled?: boolean;
  reducedMotion?: boolean;
  className?: string;
};

/**
 * Obtiene clases CSS para tap feedback según el tipo de botón
 * @param options Configuración del tap feedback
 * @returns String de clases CSS para aplicar
 */
export function getTapClass({
  kind,
  enabled = false,
  reducedMotion = false,
  className = "",
}: TapClassOptions): string {
  // Si no está habilitado, retornar className sin cambios
  if (!enabled) {
    return className;
  }

  // Base: transición suave
  const baseTransition = "transition-transform duration-150";

  // Si hay reduced motion, no aplicar scale (o mínimo sin animación)
  if (reducedMotion) {
    // Solo transición base sin scale
    return `${className} ${baseTransition}`.trim();
  }

  // Tap feedback según tipo
  if (kind === "button") {
    // Botones principales: scale-[0.98] + opacity-90
    return `${className} ${baseTransition} active:scale-[0.98] active:opacity-90`.trim();
  } else if (kind === "icon") {
    // Icon buttons: scale-95
    return `${className} ${baseTransition} active:scale-95`.trim();
  }

  return className;
}

/**
 * Trigger haptic feedback (vibración corta)
 * Solo se ejecuta si está habilitado y el navegador lo soporta
 * @param duration Duración en ms (default: 10ms, suave)
 */
export function triggerHaptic(duration = 10): void {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_MOBILE_MICRO_ANIMS !== "true") return;

  try {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  } catch {
    // Silenciar errores de vibrate (puede no estar disponible)
  }
}
