import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type IncomingItem = {
  id?: string;
  title?: string;
  name?: string;
  price?: number; // en pesos (tu cart)
  qty?: number; // cantidad (tu cart)
  unitAmountCents?: number; // en centavos (otra variante)
  quantity?: number; // otra variante de cantidad
};

function toCentsFromItem(it: IncomingItem): number {
  if (Number.isFinite(it?.price)) {
    return Math.round((it!.price as number) * 100);
  }
  if (Number.isFinite(it?.unitAmountCents)) {
    return Math.round(Number(it!.unitAmountCents));
  }
  return 0;
}

function getQty(it: IncomingItem): number {
  const q = Number.isFinite(it?.qty)
    ? Number(it!.qty)
    : Number(it?.quantity ?? 1);
  return Math.max(1, q || 1);
}

function getName(it: IncomingItem): string {
  return String(it.title ?? it.name ?? "Producto");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      items: IncomingItem[];
      datos?: Record<string, unknown> | undefined;
      payment?: Record<string, unknown> | undefined;
    };

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    // total en centavos
    const amount = items.reduce(
      (acc, it) => acc + toCentsFromItem(it) * getQty(it),
      0,
    );

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        status: "mock",
        email: body.datos?.email ?? null,
        amount_total_cents: amount,
        currency: "mxn",
        payload: {
          datos: body.datos,
          payment: body.payment,
          items: body.items,
        },
      })
      .select()
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "No se pudo guardar la orden" },
        { status: 500 },
      );
    }

    const rows = items.map((it) => ({
      order_id: order.id,
      product_id: it.id ?? null,
      name: getName(it),
      unit_amount_cents: toCentsFromItem(it),
      quantity: getQty(it),
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(rows);
    if (itemsErr) {
      return NextResponse.json(
        { error: "No se pudieron guardar los items" },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: String(order.id) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
