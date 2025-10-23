"use client";
import Link from "next/link";
import { useCheckout } from "@/lib/store/checkoutStore";

export default function CheckoutIndex() {
  const { items } = useCheckout();

  const total = items.reduce((a, it) => a + (it.price ?? 0) * (it.qty ?? 1), 0);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Checkout</h1>
      <ul className="mt-4 divide-y">
        {items.map((it) => (
          <li key={it.id} className="py-3 flex justify-between">
            <span>
              {it.title} × {it.qty}
            </span>
            <span>${((it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} MXN</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between mt-4 font-semibold">
        <span>Total</span>
        <span>${total.toFixed(2)} MXN</span>
      </div>
      <Link
        href="/checkout/datos"
        className="mt-6 inline-block w-full rounded-lg border px-4 py-2 text-center"
      >
        Continuar
      </Link>
    </main>
  );
}
