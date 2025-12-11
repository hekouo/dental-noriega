"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAdminNotes } from "@/lib/actions/orders.admin";
import { useState } from "react";

type Props = {
  orderId: string;
  initialNotes: string | null;
};

export default function AdminNotesClient({ orderId, initialNotes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes || "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateAdminNotes(orderId, notes || null);

      if (result.ok) {
        setMessage({ type: "success", text: "Notas guardadas correctamente." });
        // Refrescar la página para sincronizar
        router.refresh();
      } else {
        const errorMessages: Record<string, string> = {
          "access-denied": "No tienes permisos para actualizar esta orden.",
          "invalid-order-id": "ID de orden inválido.",
          "order-not-found": "Orden no encontrada.",
          "fetch-error": "Error al buscar la orden.",
          "update-error": "Error al guardar las notas.",
          "unexpected-error": "Error inesperado. Intenta de nuevo.",
        };
        setMessage({
          type: "error",
          text: errorMessages[result.error] || "Error al guardar las notas.",
        });
      }
    });
  };

  return (
    <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas internas</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="admin-notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notas (solo visibles para administradores)
          </label>
          <textarea
            id="admin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            placeholder="Escribe notas internas sobre este pedido..."
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Guardando…" : "Guardar notas"}
          </button>

          {message && (
            <div
              className={`text-sm ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

