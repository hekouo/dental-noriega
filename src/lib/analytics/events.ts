"use client";

/**
 * Tipo para eventos de analytics
 */
export type AnalyticsEvent = {
  name: string;
  payload?: Record<string, unknown>;
  timestamp: string; // ISO
};

/**
 * Verifica si estamos en el navegador
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Agrega un evento a la cola de analytics
 */
function pushToQueue(event: AnalyticsEvent): void {
  if (!isBrowser()) return;

  try {
    const w = window as unknown as {
      ddnAnalyticsQueue?: AnalyticsEvent[];
    };
    if (!w.ddnAnalyticsQueue) {
      w.ddnAnalyticsQueue = [];
    }
    w.ddnAnalyticsQueue.push(event);
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.info("[analytics]", event.name, event.payload);
    }
  } catch {
    // no-op
  }
}

/**
 * Función base para trackear eventos
 */
export function trackEvent(
  name: string,
  payload?: Record<string, unknown>,
): void {
  const event: AnalyticsEvent = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };
  pushToQueue(event);
}

/**
 * Trackea cuando un producto se agrega al carrito
 */
export function trackAddToCart(params: {
  productId: string;
  section: string;
  slug: string;
  title: string;
  priceCents?: number | null;
  quantity: number;
  source: "card" | "pdp";
}): void {
  trackEvent("add_to_cart", {
    product_id: params.productId,
    section: params.section,
    slug: params.slug,
    title: params.title,
    price_cents: params.priceCents ?? null,
    quantity: params.quantity,
    source: params.source,
  });
}

/**
 * Trackea cuando el usuario inicia el checkout
 */
export function trackBeginCheckout(params: {
  source: "cart" | "checkout-datos" | "checkout-pago";
  cartItemsCount?: number;
  subtotalCents?: number;
}): void {
  trackEvent("begin_checkout", {
    source: params.source,
    cart_items_count: params.cartItemsCount ?? null,
    subtotal_cents: params.subtotalCents ?? null,
  });
}

/**
 * Trackea cuando se completa una compra
 */
export function trackPurchase(params: {
  orderId: string;
  totalCents: number;
  email?: string | null;
  pointsEarned?: number | null;
  pointsSpent?: number | null;
}): void {
  trackEvent("purchase", {
    order_id: params.orderId,
    total_cents: params.totalCents,
    email: params.email ?? null,
    points_earned: params.pointsEarned ?? null,
    points_spent: params.pointsSpent ?? null,
  });
}

/**
 * Trackea cuando el usuario hace clic en WhatsApp
 */
export function trackWhatsappClick(params: {
  context: "pdp" | "floating" | "como-comprar" | "footer";
  productId?: string;
  section?: string;
  slug?: string;
  title?: string;
}): void {
  trackEvent("whatsapp_click", {
    context: params.context,
    product_id: params.productId ?? null,
    section: params.section ?? null,
    slug: params.slug ?? null,
    title: params.title ?? null,
  });
}

