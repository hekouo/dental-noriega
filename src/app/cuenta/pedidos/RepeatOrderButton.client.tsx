"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrderItemsForRepeat } from "@/lib/actions/account-repeat-order";
import { useCartStore } from "@/lib/store/cartStore";
import { trackLoyaltyRepeatOrderClicked } from "@/lib/analytics/events";

interface RepeatOrderButtonProps {
  orderId: string;
  itemsCount?: number;
  subtotalCents?: number;
}

const DEFAULT_ITEMS_COUNT = 0;
const DEFAULT_SUBTOTAL_CENTS = 0;

/**
 * Botón para repetir un pedido agregando sus productos al carrito
 */
export default function RepeatOrderButton({
  orderId,
  itemsCount,
  subtotalCents,
}: RepeatOrderButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);

  const handleRepeatOrder = () => {
    startTransition(async () => {
      try {
        // 1. Validar y obtener items de la orden
        const items = await getOrderItemsForRepeat(orderId);

        if (!items || items.length === 0) {
          alert("No se pudieron cargar los productos de este pedido.");
          return;
        }

        // Trackear evento después de obtener items (para tener el count real)
        const actualItemsCount = items.length;
        const actualSubtotalCents = items.reduce((sum, item) => sum + (item.price_cents * item.qty), 0);
        trackLoyaltyRepeatOrderClicked({
          orderId,
          itemsCount: (itemsCount ?? DEFAULT_ITEMS_COUNT) > 0 ? (itemsCount ?? DEFAULT_ITEMS_COUNT) : actualItemsCount,
          subtotalCents: (subtotalCents ?? DEFAULT_SUBTOTAL_CENTS) > 0 ? (subtotalCents ?? DEFAULT_SUBTOTAL_CENTS) : actualSubtotalCents,
        });

        // 2. Agregar cada item al carrito
        for (const item of items) {
          addToCart({
            id: item.productId,
            title: item.title,
            price: item.price,
            price_cents: item.price_cents,
            qty: item.qty,
            image_url: item.image_url || undefined,
            selected: true,
          });
        }

        // 3. Redirigir al carrito
        router.push("/carrito");
      } catch (error) {
        console.error("[RepeatOrderButton] Error:", error);
        alert("Ocurrió un error al repetir el pedido. Intenta de nuevo.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRepeatOrder}
      disabled={isPending}
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-lg hover:bg-primary-50 hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isPending ? "Repitiendo pedido..." : "Repetir pedido"}
    </button>
  );
}

