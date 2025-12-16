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

/**
 * Trackea cuando el usuario realiza una búsqueda
 */
export function trackSearchPerformed(params: {
  query: string;
  resultsCount: number;
  hasResults: boolean;
}): void {
  trackEvent("search_performed", {
    query: params.query,
    results_count: params.resultsCount,
    has_results: params.hasResults,
  });
}

/**
 * Trackea cuando el usuario hace clic en un resultado de búsqueda
 */
export function trackSearchClickResult(params: {
  query: string;
  productId: string;
  sectionSlug?: string;
  position: number;
}): void {
  trackEvent("search_click_result", {
    query: params.query,
    product_id: params.productId,
    section_slug: params.sectionSlug ?? null,
    position: params.position,
  });
}

/**
 * Trackea cuando se muestran productos relacionados
 */
export function trackRelatedProductsShown(params: {
  source: "cart" | "checkout" | "search_no_results" | "search_low_results";
  productsCount: number;
  cartItemsCount?: number;
  query?: string;
}): void {
  trackEvent("related_products_shown", {
    source: params.source,
    products_count: params.productsCount,
    cart_items_count: params.cartItemsCount ?? null,
    query: params.query ?? null,
  });
}

/**
 * Trackea cuando el usuario hace clic en un producto relacionado
 */
export function trackRelatedProductClicked(params: {
  source: "cart" | "checkout" | "search_no_results" | "search_low_results";
  productId: string;
  sectionSlug?: string;
  position: number;
}): void {
  trackEvent("related_product_clicked", {
    source: params.source,
    product_id: params.productId,
    section_slug: params.sectionSlug ?? null,
    position: params.position,
  });
}

/**
 * Trackea cuando el usuario agrega un producto relacionado al carrito desde checkout
 */
export function trackRelatedProductAddToCart(params: {
  source: "checkout";
  productId: string;
  cartItemsBefore: number;
}): void {
  trackEvent("related_product_add_to_cart", {
    source: params.source,
    product_id: params.productId,
    cart_items_before: params.cartItemsBefore,
  });
}

/**
 * Trackea cuando el usuario gana puntos de lealtad
 */
export function trackLoyaltyPointsEarned(params: {
  orderId: string;
  points: number;
  estimatedValueMxn: number;
  status: "earned" | "pending";
}): void {
  trackEvent("loyalty_points_earned", {
    order_id: params.orderId,
    points: params.points,
    estimated_value_mxn: params.estimatedValueMxn,
    status: params.status,
  });
}

/**
 * Trackea cuando el usuario ve su página de puntos de lealtad
 */
export function trackLoyaltyAccountViewed(params: {
  currentPoints: number;
  totalPoints: number;
  tierId: string;
  tierName: string;
}): void {
  trackEvent("loyalty_account_viewed", {
    current_points: params.currentPoints,
    total_points: params.totalPoints,
    tier_id: params.tierId,
    tier_name: params.tierName,
  });
}

/**
 * Trackea cuando el usuario hace clic en repetir pedido
 */
export function trackLoyaltyRepeatOrderClicked(params: {
  orderId: string;
  itemsCount: number;
  subtotalCents: number;
}): void {
  trackEvent("loyalty_repeat_order_clicked", {
    order_id: params.orderId,
    items_count: params.itemsCount,
    subtotal_cents: params.subtotalCents,
  });
}

/**
 * Trackea cuando se muestra el header de beneficios en checkout
 */
export function trackCheckoutBenefitsShown(params: {
  subtotalCents: number;
  hasFreeShipping: boolean;
  freeShippingRemainingCents: number;
  estimatedPoints: number;
  estimatedValueMxn: number;
  shippingMethod: "pickup" | "standard" | "express";
}): void {
  trackEvent("checkout_benefits_shown", {
    subtotal_cents: params.subtotalCents,
    has_free_shipping: params.hasFreeShipping,
    free_shipping_remaining_cents: params.freeShippingRemainingCents,
    estimated_points: params.estimatedPoints,
    estimated_value_mxn: params.estimatedValueMxn,
    shipping_method: params.shippingMethod,
  });
}

/**
 * Trackea cuando el usuario hace clic en WhatsApp para ayuda en checkout
 */
export function trackWhatsAppCheckoutHelpClick(params: {
  source: "checkout_payment";
  subtotalCents: number;
  itemsCount: number;
  shippingMethod?: string | null;
}): void {
  trackEvent("whatsapp_checkout_help_click", {
    source: params.source,
    subtotal_cents: params.subtotalCents,
    items_count: params.itemsCount,
    shipping_method: params.shippingMethod ?? null,
  });
}

/**
 * Trackea cuando el usuario hace clic en WhatsApp para soporte de pedido
 */
export function trackWhatsAppOrderSupportClick(params: {
  source: "thankyou_paid" | "thankyou_pending" | "account_order";
  orderId: string;
  shortId?: string | null;
  totalCents: number;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
}): void {
  trackEvent("whatsapp_order_support_click", {
    source: params.source,
    order_id: params.orderId,
    short_id: params.shortId ?? null,
    total_cents: params.totalCents,
    payment_method: params.paymentMethod ?? null,
    payment_status: params.paymentStatus ?? null,
  });
}

