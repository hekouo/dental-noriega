/**
 * Helper SSR-safe para lanzar confeti al agregar productos al carrito
 */

export type CartConfettiOptions = {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let confettiInstance: any = null;

async function loadConfetti() {
  if (typeof window === "undefined") return null;
  
  if (confettiInstance) return confettiInstance;
  
  try {
    confettiInstance = await import("canvas-confetti");
    return confettiInstance;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[confetti] Error loading canvas-confetti:", err);
    }
    return null;
  }
}

/**
 * Lanza confeti al agregar un producto al carrito
 * Solo se muestra una vez por sesión del navegador
 */
export async function launchCartConfetti(
  opts?: CartConfettiOptions,
): Promise<void> {
  // SSR-safe: no hacer nada en servidor
  if (typeof window === "undefined") return;

  // Verificar si ya se mostró confeti en esta sesión
  const shownKey = "ddn_cart_confetti_shown";
  if (sessionStorage.getItem(shownKey) === "1") {
    return;
  }

  try {
    const confetti = await loadConfetti();
    if (!confetti) return;

    const defaultOptions = {
      particleCount: 80,
      spread: 70,
      origin: { y: 0.8 },
    };

    const finalOptions = {
      ...defaultOptions,
      ...opts,
      origin: {
        ...defaultOptions.origin,
        ...opts?.origin,
      },
    };

    confetti.default(finalOptions);

    // Marcar como mostrado en esta sesión
    sessionStorage.setItem(shownKey, "1");
  } catch (err) {
    // Fallar en silencio
    if (process.env.NODE_ENV === "development") {
      console.debug("[confetti] Error launching confetti:", err);
    }
  }
}

