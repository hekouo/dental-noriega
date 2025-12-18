import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Inicializar Stripe solo si hay secret key (evitar error en build si no está configurado)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Registra un evento de Stripe en la tabla stripe_webhook_events para idempotencia.
 * Retorna true si el evento ya fue procesado (idempotencia), false si es nuevo.
 */
async function registerWebhookEvent(
  supabase: any, // Usar any porque stripe_webhook_events no está en tipos generados
  event: Stripe.Event,
): Promise<{ alreadyProcessed: boolean; orderId: string | null; paymentIntentId: string | null; chargeId: string | null }> {
  const eventId = event.id;
  const eventType = event.type;

  // Extraer order_id, payment_intent_id, charge_id según el tipo de evento
  let orderId: string | null = null;
  let paymentIntentId: string | null = null;
  let chargeId: string | null = null;

  if (event.data.object) {
    const obj = event.data.object as unknown as Record<string, unknown>;

    // Para payment_intent.*, extraer de metadata.order_id y el id del objeto
    if (eventType.startsWith("payment_intent.")) {
      paymentIntentId = typeof obj.id === "string" ? obj.id : null;
      const metadata = obj.metadata as Record<string, unknown> | undefined;
      if (metadata?.order_id && typeof metadata.order_id === "string") {
        orderId = metadata.order_id;
      }
    }

    // Para charge.refunded, extraer charge.id y payment_intent del charge
    if (eventType === "charge.refunded") {
      chargeId = typeof obj.id === "string" ? obj.id : null;
      const paymentIntent = obj.payment_intent;
      if (paymentIntent && typeof paymentIntent === "string") {
        paymentIntentId = paymentIntent;
      }
      // Intentar obtener order_id desde el PaymentIntent (necesitamos consultarlo)
      if (paymentIntentId && stripe) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          const metadata = pi.metadata as Record<string, unknown> | undefined;
          if (metadata?.order_id && typeof metadata.order_id === "string") {
            orderId = metadata.order_id;
          }
        } catch (err) {
          console.warn("[webhook] No se pudo obtener PaymentIntent para charge.refunded:", {
            paymentIntentId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Para charge.refund.updated y refund.updated, extraer información similar
    if (eventType === "charge.refund.updated" || eventType === "refund.updated") {
      const refund = obj as unknown as Stripe.Refund;
      // Refund tiene charge (string) y payment_intent (string | PaymentIntent | null)
      const refundCharge = refund.charge;
      chargeId = typeof refundCharge === "string" ? refundCharge : null;
      
      const refundPaymentIntent = refund.payment_intent;
      if (refundPaymentIntent && typeof refundPaymentIntent === "string") {
        paymentIntentId = refundPaymentIntent;
      } else if (chargeId && stripe) {
        // Intentar obtener payment_intent desde el charge
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          if (charge.payment_intent && typeof charge.payment_intent === "string") {
            paymentIntentId = charge.payment_intent;
          }
        } catch (err) {
          console.warn("[webhook] No se pudo obtener charge para refund.updated:", {
            chargeId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      // Intentar resolver order_id si tenemos payment_intent_id
      if (paymentIntentId && stripe) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          const metadata = pi.metadata as Record<string, unknown> | undefined;
          if (metadata?.order_id && typeof metadata.order_id === "string") {
            orderId = metadata.order_id;
          }
        } catch (err) {
          console.warn("[webhook] No se pudo obtener PaymentIntent para refund.updated:", {
            paymentIntentId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  // Intentar insertar el evento (idempotencia por PRIMARY KEY)
  // Nota: stripe_webhook_events no está en los tipos generados
  const { error: insertError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      id: eventId,
      type: eventType,
      order_id: orderId || null,
      payment_intent_id: paymentIntentId || null,
      charge_id: chargeId || null,
    });

  // Si el error es de violación de clave primaria (evento ya existe), retornar que ya fue procesado
  if (insertError) {
    // En PostgreSQL/Supabase, el código de error para violación de clave única es "23505"
    if (insertError.code === "23505" || insertError.message.includes("duplicate key")) {
      console.log("[webhook] Evento ya procesado (idempotencia):", {
        eventId,
        type: eventType,
        orderId: orderId || "no mapeado",
      });
      return { alreadyProcessed: true, orderId, paymentIntentId, chargeId };
    }
    // Otro error: loguear pero continuar (podría ser un problema de conexión)
    console.error("[webhook] Error al registrar evento:", insertError);
    if (process.env.NODE_ENV === "development") {
      console.error("[webhook] Error details:", {
        eventId,
        error: insertError.message,
        code: insertError.code,
      });
    }
  } else {
    // Evento nuevo registrado exitosamente
    console.log("[webhook] Evento nuevo registrado:", {
      eventId,
      type: eventType,
      orderId: orderId || "no mapeado",
      paymentIntentId: paymentIntentId || null,
      chargeId: chargeId || null,
    });
  }

  return { alreadyProcessed: false, orderId, paymentIntentId, chargeId };
}

/**
 * Obtiene el estado actual de payment_status de una orden.
 * Retorna null si la orden no existe o no tiene payment_status.
 */
async function getOrderPaymentStatus(
  supabase: any, // Usar any para flexibilidad con tipos de Supabase
  orderId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .single();

  if (error || !data) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[webhook] No se pudo obtener payment_status de orden:", {
        orderId,
        error: error?.message,
      });
    }
    return null;
  }

  return (data as { payment_status?: string | null })?.payment_status || null;
}

/**
 * Actualiza el estado de una orden, protegiendo estados finales.
 * No degrada refunded -> paid/pending, ni paid -> pending.
 */
async function updateOrderStatus(
  supabase: any, // Usar any para flexibilidad con tipos de Supabase
  orderId: string,
  newPaymentStatus: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  // Obtener estado actual
  const currentStatus = await getOrderPaymentStatus(supabase, orderId);

  // Protección de estados finales
  if (currentStatus === "refunded") {
    if (process.env.NODE_ENV === "development") {
      console.warn("[webhook] Intento de cambiar estado refunded, ignorado:", {
        orderId,
        currentStatus,
        newPaymentStatus,
      });
    }
    return { success: false, error: "Cannot update order with refunded status" };
  }

  if (currentStatus === "paid" && newPaymentStatus === "pending") {
    if (process.env.NODE_ENV === "development") {
      console.warn("[webhook] Intento de degradar paid -> pending, ignorado:", {
        orderId,
        currentStatus,
        newPaymentStatus,
      });
    }
    return { success: false, error: "Cannot degrade paid status to pending" };
  }

  // Actualizar orden (payment_status existe en el schema pero puede no estar en tipos generados)
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: newPaymentStatus,
      ...updates,
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("[webhook] Error al actualizar orden:", updateError);
    if (process.env.NODE_ENV === "development") {
      console.error("[webhook] Update error details:", {
        orderId,
        error: updateError.message,
        code: updateError.code,
      });
    }
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Resuelve el order_id desde un PaymentIntent.
 * Prioridad: 1) metadata.order_id, 2) buscar por stripe_payment_intent_id en orders.metadata
 */
async function resolveOrderIdFromPaymentIntent(
  supabase: any,
  paymentIntentId: string,
  metadataOrderId?: string,
): Promise<string | null> {
  // Prioridad 1: metadata.order_id
  if (metadataOrderId && typeof metadataOrderId === "string") {
    return metadataOrderId;
  }

  // Prioridad 2: buscar por stripe_payment_intent_id en orders.metadata
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id")
      .eq("metadata->>stripe_payment_intent_id", paymentIntentId)
      .limit(1);

    if (!error && orders && orders.length > 0) {
      return orders[0].id;
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[webhook] Error al buscar orden por stripe_payment_intent_id:", err);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  noStore();
  try {
    if (!process.env.STRIPE_SECRET_KEY || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuración faltante" },
        { status: 500 },
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe no está inicializado" },
        { status: 500 },
      );
    }

    // Leer RAW body como ArrayBuffer para verificación de firma
    const bodyBuffer = await req.arrayBuffer();
    const body = Buffer.from(bodyBuffer);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Falta firma de Stripe" },
        { status: 400 },
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret no configurado" },
        { status: 500 },
      );
    }

    // Verificar firma del webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "development") {
        console.error("[webhook] Signature verification failed:", errorMessage);
      }
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 },
      );
    }

    // Crear cliente de Supabase con service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
  });

    // Registrar evento para idempotencia
    const { alreadyProcessed, orderId } = await registerWebhookEvent(
      supabase,
      event,
    );

    // Si el evento ya fue procesado, responder 200 y salir
    if (alreadyProcessed) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    // Procesar evento según su tipo
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Resolver order_id con fallback
      const extractedOrderId =
        orderId ||
        (await resolveOrderIdFromPaymentIntent(
          supabase,
          paymentIntent.id,
          paymentIntent.metadata.order_id,
        ));

      if (!extractedOrderId) {
        console.warn("[webhook] payment_intent.succeeded sin order_id (evento registrado pero no procesado):", {
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
        });
        return NextResponse.json({ received: true });
      }

      // Obtener metadata actual de la orden
      const { data: orderData } = await supabase
        .from("orders")
        .select("metadata")
        .eq("id", extractedOrderId)
        .single();

      const currentMetadata = (orderData?.metadata as Record<string, unknown>) || {};

      // Actualizar orden a paid (solo payment_status, NO tocar status)
      const updateResult = await updateOrderStatus(
        supabase,
        extractedOrderId,
        "paid",
        {
          payment_id: paymentIntent.id,
          payment_amount: paymentIntent.amount / 100,
          metadata: {
            ...currentMetadata,
            stripe_payment_intent_id: paymentIntent.id,
          },
        },
      );

      if (!updateResult.success) {
        if (process.env.NODE_ENV === "development") {
          console.error("[webhook] Error al actualizar orden a paid:", updateResult.error);
        }
        return NextResponse.json({ received: true }); // Responder 200 aunque falle para no reintentar
      }

      // Procesar puntos de lealtad (idempotente)
      try {
        const { processLoyaltyForOrder } = await import("@/lib/loyalty/processOrder.server");
        await processLoyaltyForOrder(extractedOrderId);
      } catch (loyaltyError) {
        // No fallar el webhook si falla la lógica de puntos
        console.error("[webhook] Error al procesar puntos:", loyaltyError);
        if (process.env.NODE_ENV === "development") {
          console.error("[webhook] Loyalty error details:", {
            order_id: extractedOrderId,
            error: loyaltyError instanceof Error ? loyaltyError.message : String(loyaltyError),
          });
        }
      }

      // Crear envío en Skydropx si está configurado (código existente)
      try {
        const { data: orderDataForShipping } = await supabase
          .from("orders")
          .select("metadata, order_items(*)")
          .eq("id", extractedOrderId)
          .single();

        if (orderDataForShipping?.metadata) {
          const metadata = orderDataForShipping.metadata as Record<string, unknown>;
          const shipping = metadata.shipping as
            | {
                provider?: string;
                option_code?: string;
                rate?: {
                  external_id?: string;
                  provider?: string;
                  service?: string;
                };
              }
            | undefined;

          // Solo crear envío si hay información de Skydropx en metadata
          if (
            shipping?.provider === "skydropx" &&
            shipping.rate?.external_id &&
            metadata.contact_address &&
            metadata.contact_city &&
            metadata.contact_state &&
            metadata.contact_cp
          ) {
            const { createSkydropxShipment } = await import("@/lib/shipping/skydropx.server");

            // Calcular peso total de los productos
            const orderItems = (orderDataForShipping.order_items as Array<{ qty: number }>) || [];
            const totalWeightGrams = orderItems.reduce((sum, item) => sum + (item.qty || 1) * 1000, 0);

            // Construir productos para declarar en el envío
            const products = (orderDataForShipping.order_items as Array<{
              title?: string;
              sku?: string;
              unit_price_cents?: number;
              qty?: number;
            }>).map((item) => ({
              name: item.title || "Producto",
              sku: item.sku || undefined,
              price: item.unit_price_cents ? item.unit_price_cents / 100 : undefined,
              quantity: item.qty || 1,
            }));

            const shipmentResult = await createSkydropxShipment({
              rateId: shipping.rate.external_id,
              destination: {
                postalCode: String(metadata.contact_cp),
                state: String(metadata.contact_state),
                city: String(metadata.contact_city),
                country: "MX",
                name: String(metadata.contact_name || ""),
                phone: metadata.contact_phone ? String(metadata.contact_phone) : undefined,
                email: metadata.contact_email ? String(metadata.contact_email) : undefined,
                addressLine1: metadata.contact_address ? String(metadata.contact_address) : undefined,
              },
              pkg: {
                weightGrams: totalWeightGrams || 1000,
              },
              products,
            });

            if (shipmentResult.success && shipmentResult.shipmentId) {
              // Actualizar metadata con información del envío creado
              const updatedShipping = {
                ...shipping,
                shipment: {
                  id: shipmentResult.shipmentId,
                  tracking_number: shipmentResult.trackingNumber || null,
                  label_url: shipmentResult.labelUrl || null,
                  carrier_name: shipmentResult.carrierName || null,
                  workflow_status: shipmentResult.workflowStatus || null,
                  payment_status: shipmentResult.paymentStatus || null,
                  total: shipmentResult.total || null,
                  packages: shipmentResult.packages || [],
                },
                integration_status: "success" as const,
              };

              await supabase
                .from("orders")
                .update({
                  metadata: {
                    ...metadata,
                    shipping: updatedShipping,
                  },
                })
                .eq("id", extractedOrderId);

              if (process.env.NODE_ENV !== "production") {
                console.log("[webhook] Envío Skydropx creado:", {
                  order_id: extractedOrderId,
                  shipment_id: shipmentResult.shipmentId,
                  tracking_number: shipmentResult.trackingNumber,
                });
              }
            } else {
              // Guardar error en metadata sin romper el flujo
              const updatedShipping = {
                ...shipping,
                integration_status: "error" as const,
                integration_error: shipmentResult.error || "Error desconocido al crear envío",
              };

              await supabase
                .from("orders")
                .update({
                  metadata: {
                    ...metadata,
                    shipping: updatedShipping,
                  },
                })
                .eq("id", extractedOrderId);

              if (process.env.NODE_ENV !== "production") {
                console.warn("[webhook] Error al crear envío Skydropx:", {
                  order_id: extractedOrderId,
                  error: shipmentResult.error,
                });
              }
            }
          }
        }
      } catch (skydropxError) {
        // No fallar el webhook si falla la creación del envío
        console.error("[webhook] Error al crear envío Skydropx:", skydropxError);
        if (process.env.NODE_ENV === "development") {
          console.error("[webhook] Skydropx error details:", {
            order_id: extractedOrderId,
            error: skydropxError instanceof Error ? skydropxError.message : String(skydropxError),
          });
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Resolver order_id con fallback
      const extractedOrderId =
        orderId ||
        (await resolveOrderIdFromPaymentIntent(
          supabase,
          paymentIntent.id,
          paymentIntent.metadata.order_id,
        ));

      if (!extractedOrderId) {
        console.warn("[webhook] payment_intent.payment_failed sin order_id (evento registrado pero no procesado):", {
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
        });
        return NextResponse.json({ received: true });
      }

      // Obtener metadata actual
      const { data: orderData } = await supabase
        .from("orders")
        .select("metadata")
        .eq("id", extractedOrderId)
        .single();

      const currentMetadata = (orderData?.metadata as Record<string, unknown>) || {};

      // Determinar payment_status: si existe columna "failed", usarla; si no, dejar "pending" pero guardar reason
      const failureReason = paymentIntent.last_payment_error?.message || "Payment failed";
      const paymentStatus = "failed"; // Asumiendo que existe en el schema

      await updateOrderStatus(
        supabase,
        extractedOrderId,
        paymentStatus,
        {
          metadata: {
            ...currentMetadata,
            payment_failure_reason: failureReason,
            payment_failed_at: new Date().toISOString(),
          },
        },
      );
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      // Intentar resolver order_id con fallback si no vino de registerWebhookEvent
      let extractedOrderId = orderId;
      if (!extractedOrderId && charge.payment_intent && typeof charge.payment_intent === "string") {
        extractedOrderId = await resolveOrderIdFromPaymentIntent(
          supabase,
          charge.payment_intent,
          undefined,
        );
      }

      if (!extractedOrderId) {
        console.warn("[webhook] charge.refunded sin order_id (evento registrado pero no procesado):", {
          eventId: event.id,
          chargeId: charge.id,
          paymentIntentId: charge.payment_intent || null,
        });
        return NextResponse.json({ received: true });
      }

      // Obtener metadata actual
      const { data: orderData } = await supabase
        .from("orders")
        .select("metadata")
        .eq("id", extractedOrderId)
        .single();

      const currentMetadata = (orderData?.metadata as Record<string, unknown>) || {};

      // Calcular monto reembolsado
      const amountRefunded = charge.amount_refunded || 0;
      const refundData = {
        charge_id: charge.id,
        amount_refunded: amountRefunded,
        amount_refunded_mxn: amountRefunded / 100,
        currency: charge.currency,
        refunded_at: new Date().toISOString(),
        event_id: event.id,
      };

      await updateOrderStatus(
        supabase,
        extractedOrderId,
        "refunded",
        {
          metadata: {
            ...currentMetadata,
            refund: refundData,
          },
        },
      );
    } else if (
      event.type === "charge.refund.updated" ||
      event.type === "refund.updated"
    ) {
      // Eventos de observación: solo registrar, no cambiar order
      // Estos eventos se registran en stripe_webhook_events pero no procesan cambios
      console.log("[webhook] Evento de observación (refund.updated) registrado:", {
        eventId: event.id,
        type: event.type,
        orderId: orderId || "no mapeado",
      });
      // No hacer nada más, solo responder 200
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error procesando webhook";
    console.error("[webhook] Error general:", errorMessage);
    if (process.env.NODE_ENV === "development") {
      console.error("[webhook] Error stack:", error instanceof Error ? error.stack : String(error));
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
