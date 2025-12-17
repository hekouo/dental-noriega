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

    const body = await req.text();
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

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err}` },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
  });

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const order_id = paymentIntent.metadata.order_id;

      if (order_id) {
        // Actualizar orden a paid
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_id: paymentIntent.id,
            payment_amount: paymentIntent.amount / 100,
          })
          .eq("id", order_id);

        // Procesar puntos de lealtad después de actualizar la orden a "paid"
        // El helper processLoyaltyForOrder es idempotente y maneja todo el flujo
        if (!updateError) {
          try {
            const { processLoyaltyForOrder } = await import("@/lib/loyalty/processOrder.server");
            await processLoyaltyForOrder(order_id);
          } catch (loyaltyError) {
            // No fallar el webhook si falla la lógica de puntos
            console.error("[webhook] Error al procesar puntos:", loyaltyError);
            if (process.env.NODE_ENV === "development") {
              console.error("[webhook] Error details:", {
                order_id,
                error: loyaltyError instanceof Error ? loyaltyError.message : String(loyaltyError),
              });
            }
          }

          // Crear envío en Skydropx si está configurado y hay información de shipping
          try {
            const { data: orderData } = await supabase
              .from("orders")
              .select("metadata, order_items(*)")
              .eq("id", order_id)
              .single();

            if (orderData?.metadata) {
              const metadata = orderData.metadata as Record<string, unknown>;
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
                const orderItems = (orderData.order_items as Array<{ qty: number }>) || [];
                const totalWeightGrams = orderItems.reduce((sum, item) => sum + (item.qty || 1) * 1000, 0);

                // Construir productos para declarar en el envío
                const products = (orderData.order_items as Array<{
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
                    .eq("id", order_id);

                  if (process.env.NODE_ENV !== "production") {
                    console.log("[webhook] Envío Skydropx creado:", {
                      order_id,
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
                    .eq("id", order_id);

                  if (process.env.NODE_ENV !== "production") {
                    console.warn("[webhook] Error al crear envío Skydropx:", {
                      order_id,
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
                order_id,
                error: skydropxError instanceof Error ? skydropxError.message : String(skydropxError),
              });
            }
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error("[webhook] Error al actualizar orden a paid:", {
              order_id,
              error: updateError.message,
            });
          }
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const order_id = paymentIntent.metadata.order_id;

      if (order_id) {
        await supabase
          .from("orders")
          .update({
            status: "failed",
          })
          .eq("id", order_id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error procesando webhook",
      },
      { status: 500 },
    );
  }
}
