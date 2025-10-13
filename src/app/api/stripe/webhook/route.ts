// src/app/api/stripe/webhook/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

/**
 * Webhook de Stripe
 * Recibe eventos y confirma la orden cuando checkout.session.completed
 * Requiere:
 *   STRIPE_WEBHOOK_SECRET en .env.local
 */
export async function POST(req: Request) {
  // Firma del encabezado
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing stripe-signature", { status: 400 });
  }

  // Stripe necesita el cuerpo RAW, no JSON parseado
  const rawBody = Buffer.from(await req.arrayBuffer());

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (e: any) {
    // Firma inválida o secreto incorrecto
    return new NextResponse(`Webhook Error: ${e.message}`, { status: 400 });
  }

  // Maneja los eventos que te interesan
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    const orderId = session.metadata?.order_id;
    // TODO:
    // 1) Marcar la orden en tu DB como 'paid'
    // 2) Aplicar puntos canjeados y acreditar puntos ganados
    // 3) Notificación opcional (email/WhatsApp)
    // Nota: session contiene amount_total, customer_email, etc.
  }

  // Responder 200 rápido; Stripe reintenta si no devuelves 2xx
  return NextResponse.json({ received: true });
}

/**
 * (Opcional) GET para verificar que la ruta existe
 * Abre /api/stripe/webhook en el navegador → debe devolver {ok: true}
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
