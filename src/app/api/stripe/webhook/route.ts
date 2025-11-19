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
