export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const {
    items,
    orderId,
    customerEmail,
    discountMXN = 0,
    allowShipping = false,
  } = await req.json();

  interface CartItem {
    qty: number;
    price?: number;
    name: string;
    sku: string;
  }

  const line_items = items.map((it: CartItem) => ({
    quantity: it.qty,
    price_data: {
      currency: "mxn",
      unit_amount: Math.round((it.price ?? 0) * 100),
      product_data: { name: `${it.name} (SKU ${it.sku})` },
    },
  }));

  if (discountMXN > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "mxn",
        unit_amount: -Math.round(discountMXN * 100),
        product_data: { name: "Descuento por puntos" },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    shipping_address_collection: allowShipping
      ? { allowed_countries: ["MX"] }
      : undefined,
    line_items,
    success_url: `${process.env.SITE_URL}/checkout/gracias?order=${orderId}`,
    cancel_url: `${process.env.SITE_URL}/carrito?cancelled=1`,
    metadata: { order_id: String(orderId) },
  });

  return NextResponse.json({ url: session.url });
}
