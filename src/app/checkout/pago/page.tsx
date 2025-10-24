"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useHasSelected,
  useSelectedTotal,
  useSelectedIds,
} from "@/lib/store/checkoutSelectors";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatCurrency } from "@/lib/utils/currency";

export default function PagoPage() {
  const router = useRouter();
  const hasSelected = useHasSelected(); // boolean
  const total = useSelectedTotal(); // number
  const ids = useSelectedIds(); // array (shallow)
  const removeSelected = useCheckoutStore((s) => s.removeSelected);

  const did = useRef(false);
  useEffect(() => {
    if (did.current) return;
    did.current = true;
    if (!hasSelected) router.replace("/checkout");
  }, [hasSelected, router]);

  if (!hasSelected) return <div className="p-6">Redirigiendo a checkout…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Pago</h1>
      <p>Productos a pagar: {ids.length}</p>
      <p>Total: {formatCurrency(total)}</p>

      <button
        onClick={() => {
          // crear orden aquí si aplica, sin mutar múltiples veces
          removeSelected();
          router.push("/checkout/gracias");
        }}
        className="px-4 py-2 rounded bg-black text-white"
      >
        Confirmar pago
      </button>
    </div>
  );
}
