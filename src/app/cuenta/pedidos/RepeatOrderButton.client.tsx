"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { repeatOrderAction } from "@/lib/actions/account-repeat-order";

interface RepeatOrderButtonProps {
  orderId: string;
}

/**
 * Botón para repetir un pedido anterior agregando sus productos al carrito
 */
export default function RepeatOrderButton({ orderId }: RepeatOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRepeatOrder = () => {
    startTransition(async () => {
      const result = await repeatOrderAction({ orderId });

      if (result.ok) {
        router.push(result.redirectTo);
      } else {
        // Mostrar error al usuario
        let errorMessage = "Error al repetir el pedido.";
        if (result.code === "unauthenticated") {
          errorMessage = "Debes iniciar sesión para repetir un pedido.";
        } else if (result.code === "order-not-found") {
          errorMessage = "No se encontró el pedido o no tienes permiso para acceder a él.";
        } else if (result.code === "cart-error") {
          errorMessage = "Error al agregar productos al carrito. Intenta de nuevo.";
        }

        alert(errorMessage);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRepeatOrder}
      disabled={isPending}
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label={isPending ? "Repitiendo pedido..." : "Repetir pedido"}
    >
      {isPending ? "Repitiendo pedido..." : "Repetir pedido"}
    </button>
  );
}

