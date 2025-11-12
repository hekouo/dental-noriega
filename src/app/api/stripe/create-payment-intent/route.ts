import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

type CreatePaymentIntentRequest = {
  order_id: string;
  total_cents: number;
};

function validateRequest(body: unknown): CreatePaymentIntentRequest | null {
  if (!body || typeof body !== "object") return null;
  const req = body as Partial<CreatePaymentIntentRequest>;

  if (
    typeof req.order_id !== "string" ||
    typeof req.total_cents !== "number" ||
    req.total_cents < 0
  ) {
    return null;
  }

  return req as CreatePaymentIntentRequest;
}

export async function POST(req: NextRequest) {
  noStore();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe no configurado" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => null);
    const data = validateRequest(body);

    if (!data) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 },
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.total_cents,
      currency: "mxn",
      metadata: {
        order_id: data.order_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al crear payment intent",
      },
      { status: 500 },
    );
  }
}

