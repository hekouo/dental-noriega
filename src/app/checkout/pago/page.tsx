"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PagoSchema, type PagoInput } from "@/lib/validations/checkout";
import { useCartStore, selectCartCore, selectCartOps } from "@/lib/store/cartStore";

export default function PagoPage() {
  const { items, checkoutMode, overrideItems } = useCartStore(selectCartCore);
  const { clearCart, setCheckoutMode, setOverrideItems } = useCartStore(selectCartOps);
  const router = useRouter();

  const visibleItems = checkoutMode === 'buy-now' && overrideItems?.length
    ? overrideItems
    : items;

  // Redirección en effect (no durante render)
  useEffect(() => {
    if (!visibleItems.length) router.replace("/checkout");
  }, [visibleItems.length, router]);

  const form = useForm<PagoInput>({
    resolver: zodResolver(PagoSchema),
    defaultValues: { method: "card-mock" },
  });

  async function onSubmit(values: PagoInput) {
    try {
      // Obtener datos del localStorage
      const datos = JSON.parse(localStorage.getItem('checkout-datos') || '{}');
      
      const res = await fetch("/api/orders/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: visibleItems, datos, payment: values }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id)
        throw new Error(data?.error || "Error al crear orden mock");

      // limpia checkout y carrito ANTES de navegar
      if (checkoutMode === 'cart') {
        clearCart();
      } else {
        // En modo buy-now, limpiar overrideItems
        setOverrideItems(null);
        setCheckoutMode('cart');
      }

      // evita history rara
      router.replace(
        `/checkout/gracias?order=${encodeURIComponent(String(data.id))}`,
      );
    } catch (e) {
      console.error(e);
      alert("No se pudo confirmar el pago simulado.");
    }
  }

  if (!visibleItems.length) return null;

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Pago</h1>
      <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="card-mock"
            {...form.register("method")}
            defaultChecked
          />
          <span>Tarjeta (simulado)</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" value="oxxo-mock" {...form.register("method")} />
          <span>OXXO (simulado)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="transfer-mock"
            {...form.register("method")}
          />
          <span>Transferencia (simulado)</span>
        </label>

        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" {...form.register("agree")} />
          <span>Acepto términos y política de privacidad</span>
        </label>
        <span className="text-xs text-red-600">
          {form.formState.errors.agree?.message}
        </span>

        <button className="mt-2 rounded-lg border px-4 py-2">
          Confirmar pedido
        </button>
      </form>
    </main>
  );
}
