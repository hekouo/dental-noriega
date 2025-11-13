import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Verificar que STRIPE_SECRET_KEY existe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[create-payment-intent] STRIPE_SECRET_KEY no configurado");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

// Schema Zod para validación
const CreatePaymentIntentRequestSchema = z.object({
  order_id: z.string().min(1, "order_id requerido"),
});

type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentRequestSchema>;

export async function POST(req: NextRequest) {
  noStore();
  try {
    // Verificar que STRIPE_SECRET_KEY existe
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe no configurado. Verifica STRIPE_SECRET_KEY en variables de entorno." },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Cuerpo de la petición inválido" },
        { status: 400 },
      );
    }

    // Validar con Zod
    const validationResult = CreatePaymentIntentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return NextResponse.json(
        { error: `Datos inválidos: ${errors}` },
        { status: 400 },
      );
    }

    const { order_id } = validationResult.data;

    // Buscar la orden en DB para obtener total_cents
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let amount: number;
    let currency = "mxn";

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("total, currency")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: `Orden no encontrada: ${order_id}` },
          { status: 404 },
        );
      }

      amount = Math.round(order.total * 100); // Convertir a centavos
      currency = order.currency || "mxn";
    } else {
      // Si no hay Supabase, usar un valor por defecto (el frontend debería pasar total_cents)
      // Por ahora, retornamos error si no hay DB
      return NextResponse.json(
        { error: "Base de datos no configurada. No se puede obtener el total de la orden." },
        { status: 500 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "El total de la orden debe ser mayor a 0" },
        { status: 422 },
      );
    }

    // Idempotencia: usar order_id como idempotency key
    const idempotencyKey = `pi_${order_id}`;

    // Crear PaymentIntent con automatic_payment_methods
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        metadata: {
          order_id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        idempotencyKey,
      },
    );

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error al crear payment intent";
    
    // Log controlado
    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.error("[create-payment-intent] Error:", errorMessage);
    }

    // Si es un error de Stripe, devolver mensaje más legible
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Error de Stripe: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
