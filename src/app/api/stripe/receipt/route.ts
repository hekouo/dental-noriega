import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import Stripe from "stripe";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Verificar que STRIPE_SECRET_KEY existe (server-only, no NEXT_PUBLIC)
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[stripe/receipt] STRIPE_SECRET_KEY no está configurado");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

/**
 * GET /api/stripe/receipt?orderId=UUID
 * 
 * Endpoint READ-ONLY para obtener receipt_url desde Stripe.
 * 
 * Seguridad:
 * - Requiere sesión autenticada (user logueado)
 * - Valida ownership: orders.user_id === auth.user.id
 * - Solo lectura en Stripe (no crea ni modifica nada)
 * 
 * Casos que devuelven { receiptUrl: null }:
 * - bank_transfer (no tiene PaymentIntent)
 * - payment_id null
 * - payment_status != 'paid'
 * - Stripe error (no expone detalles)
 */
export async function GET(req: NextRequest) {
  noStore();

  try {
    // 1. Verificar Stripe configurado
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { receiptUrl: null },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-cache",
          },
        },
      );
    }

    // 2. Obtener orderId de query params
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
      return NextResponse.json(
        { error: "orderId es requerido" },
        { status: 400 },
      );
    }

    // 3. Autenticación: obtener usuario de sesión
    const authSupabase = createActionSupabase();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      );
    }

    // 4. Consultar orden en Supabase y validar ownership
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[stripe/receipt] Faltan variables de Supabase");
      return NextResponse.json(
        { receiptUrl: null },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-cache",
          },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, payment_provider, payment_id, payment_status, metadata")
      .eq("id", orderId.trim())
      .maybeSingle();

    if (orderError || !order) {
      // 404 si no existe (no filtrar existencia)
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    // 5. Validar ownership: orders.user_id === auth.user.id
    if (order.user_id !== user.id) {
      // 404 para no filtrar existencia (mejor UX que 403)
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    // 6. Resolver PaymentIntent ID
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const paymentIntentId =
      (metadata.stripe_payment_intent_id as string | undefined) ||
      order.payment_id ||
      null;

    // 7. Si no hay PaymentIntent ID o no es Stripe, devolver null
    if (!paymentIntentId || order.payment_provider !== "stripe") {
      return NextResponse.json(
        { receiptUrl: null },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, max-age=60",
          },
        },
      );
    }

    // 8. Si no está pagado, devolver null (no filtrar existencia)
    if (order.payment_status !== "paid") {
      return NextResponse.json(
        { receiptUrl: null },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, max-age=60",
          },
        },
      );
    }

    // 9. Consultar Stripe READ-ONLY: PaymentIntent con expand latest_charge
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        {
          expand: ["latest_charge"],
        },
      );

      // 10. Obtener receipt_url desde Charge
      let receiptUrl: string | null = null;

      if (paymentIntent.latest_charge) {
        // latest_charge puede ser string (id) u objeto Charge (si expand funcionó)
        if (typeof paymentIntent.latest_charge === "string") {
          // Si es string, hacer otra llamada para obtener el Charge
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
          receiptUrl = charge.receipt_url || null;
        } else {
          // Si es objeto Charge (expand funcionó), leer receipt_url directamente
          receiptUrl = (paymentIntent.latest_charge as Stripe.Charge).receipt_url || null;
        }
      }

      return NextResponse.json(
        { receiptUrl },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, max-age=60",
          },
        },
      );
    } catch (stripeError) {
      // Si hay error de Stripe, devolver null (no exponer detalles)
      if (process.env.NODE_ENV === "development") {
        console.warn("[stripe/receipt] Error al consultar Stripe:", stripeError);
      }
      return NextResponse.json(
        { receiptUrl: null },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-cache",
          },
        },
      );
    }
  } catch (error) {
    // Error inesperado: devolver null (no romper UI)
    if (process.env.NODE_ENV === "development") {
      console.error("[stripe/receipt] Error inesperado:", error);
    }
    return NextResponse.json(
      { receiptUrl: null },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache",
        },
      },
    );
  }
}
