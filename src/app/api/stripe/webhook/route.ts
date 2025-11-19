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
        // Nota: la tabla orders puede tener 'email' o 'contact_email', verificar ambos
        const { data: order, error: updateError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_id: paymentIntent.id,
            payment_amount: paymentIntent.amount / 100,
          })
          .eq("id", order_id)
          .select("email, contact_email, total_cents, metadata")
          .single();

        // Usar email o contact_email (según el schema real)
        const orderEmail = order ? ((order as { email?: string; contact_email?: string }).email || 
                                     (order as { email?: string; contact_email?: string }).contact_email) : null;

        if (!updateError && order && orderEmail) {
          // Añadir puntos de lealtad (solo si no se han añadido ya)
          try {
            const metadata = (order.metadata as Record<string, unknown>) || {};
            const loyaltyPointsEarned = metadata.loyalty_points_earned;

            // Solo añadir puntos si no se han añadido ya
            if (!loyaltyPointsEarned && order.total_cents) {
              const { addLoyaltyPoints } = await import("@/lib/loyalty/points.server");
              const { LOYALTY_POINTS_PER_MXN } = await import("@/lib/loyalty/config");

              const mxnTotal = Math.max(0, Math.floor(order.total_cents / 100));
              const pointsEarned = mxnTotal * LOYALTY_POINTS_PER_MXN;

              if (pointsEarned > 0) {
                if (process.env.NODE_ENV === "development") {
                  console.log("[LOYALTY] about to add points", {
                    email: orderEmail,
                    pointsToAdd: pointsEarned,
                    mxnTotal,
                    context: "webhook",
                    order_id: order_id,
                  });
                }

                const loyaltySummary = await addLoyaltyPoints(orderEmail, pointsEarned);

                if (process.env.NODE_ENV === "development") {
                  console.log("[LOYALTY] points added successfully", {
                    email: orderEmail,
                    pointsEarned,
                    newBalance: loyaltySummary.pointsBalance,
                  });
                }

                // Actualizar metadata de la orden con información de puntos
                await supabase
                  .from("orders")
                  .update({
                    metadata: {
                      ...metadata,
                      loyalty_points_earned: pointsEarned,
                      loyalty_points_balance_after: loyaltySummary.pointsBalance,
                    },
                  })
                  .eq("id", order_id);
              } else {
                if (process.env.NODE_ENV === "development") {
                  console.log("[LOYALTY] skipping - no points to add (mxnTotal is 0)", {
                    email: orderEmail,
                    mxnTotal,
                    total_cents: order.total_cents,
                  });
                }
              }
            } else {
              if (process.env.NODE_ENV === "development") {
                console.log("[LOYALTY] skipping - points already earned", {
                  email: orderEmail,
                  loyaltyPointsEarned,
                  total_cents: order.total_cents,
                });
              }
            }
          } catch (loyaltyError) {
            // No fallar el webhook si falla la lógica de puntos
            console.error("[webhook] Error al añadir puntos:", loyaltyError);
            if (process.env.NODE_ENV === "development") {
              console.error("[LOYALTY] error details:", {
                email: orderEmail,
                error: loyaltyError instanceof Error ? loyaltyError.message : String(loyaltyError),
                stack: loyaltyError instanceof Error ? loyaltyError.stack : undefined,
              });
            }
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.log("[LOYALTY] skipping - no email or order not found", {
              hasOrder: !!order,
              hasEmail: !!orderEmail,
              updateError: updateError?.message,
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
