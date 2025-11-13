import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema Zod para validación
const CreatePaymentIntentRequestSchema = z.object({
  order_id: z.string().uuid(),
});

type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentRequestSchema>;

// Verificar que STRIPE_SECRET_KEY existe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[create-payment-intent] STRIPE_SECRET_KEY no está configurado");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

export async function POST(req: NextRequest) {
  noStore();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe no está configurado. Verifica que STRIPE_SECRET_KEY esté definido en las variables de entorno." },
        { status: 500 },
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Error al inicializar Stripe" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => null);
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Datos inválidos: se espera un objeto JSON" },
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

    const data = validationResult.data;

    // Buscar la orden en DB para obtener amount
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let amount: number;
    
    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Buscar la orden
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("total")
        .eq("id", data.order_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: `Orden no encontrada: ${data.order_id}` },
          { status: 404 },
        );
      }

      // Determinar amount desde orders.total (convertir a centavos)
      amount = Math.round(order.total * 100);

      // Si amount es 0 o negativo, recomputar desde order_items
      if (!amount || amount <= 0) {
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("qty, price")
          .eq("order_id", data.order_id);

        if (itemsError) {
          console.warn("[create-payment-intent] Error al obtener items:", itemsError.message);
          return NextResponse.json(
            { error: "Error al calcular el monto de la orden" },
            { status: 500 },
          );
        }

        if (!items || items.length === 0) {
          console.warn("[create-payment-intent] Orden sin items:", data.order_id);
          return NextResponse.json(
            { error: "Orden sin monto válido" },
            { status: 422 },
          );
        }

        // Recomputar: SUM(qty * price) y convertir a centavos
        const recomputedTotal = items.reduce(
          (sum, item) => sum + (item.qty || 0) * (item.price || 0),
          0,
        );
        amount = Math.round(recomputedTotal * 100);

        if (amount <= 0) {
          console.warn("[create-payment-intent] Orden sin monto válido tras recomputar:", data.order_id);
          return NextResponse.json(
            { error: "Orden sin monto válido" },
            { status: 422 },
          );
        }
      }
    } else {
      // Si no hay Supabase, usar total_cents del body si está disponible
      const totalCents = (body as any).total_cents;
      if (typeof totalCents === "number" && totalCents > 0) {
        amount = totalCents;
      } else {
        return NextResponse.json(
          { error: "No se pudo determinar el monto de la orden" },
          { status: 422 },
        );
      }
    }

    if (amount <= 0) {
      console.warn("[create-payment-intent] Amount inválido:", amount);
      return NextResponse.json(
        { error: "Orden sin monto válido" },
        { status: 422 },
      );
    }

    // Idempotencia: usar order_id como idempotencyKey
    const idempotencyKey = `pi_${data.order_id}`;

    // Crear PaymentIntent con idempotencia
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "mxn",
        metadata: {
          order_id: data.order_id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        idempotencyKey,
      },
    );

    if (!paymentIntent.client_secret) {
      return NextResponse.json(
        { error: "No se recibió client_secret de Stripe" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error al crear payment intent";
    
    // Log controlado sin stack ruidoso
    console.warn("[create-payment-intent]", errorMessage);
    
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
