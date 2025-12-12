"use client";

import Link from "next/link";
import type { LoyaltyHistoryEntry } from "@/lib/loyalty/history";

type Props = {
  entries: LoyaltyHistoryEntry[];
};

/**
 * Formatea una fecha ISO a formato legible en español
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Componente para mostrar el historial de puntos de lealtad
 */
export default function LoyaltyHistoryTable({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
          Historial de puntos
        </h2>
        <p className="text-sm text-gray-600">
          Aún no tienes historial de puntos. Cuando realices tus compras, verás aquí los puntos que
          ganas y usas.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
        Historial de puntos
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Pedido</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Movimiento</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Puntos</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const hasEarned = entry.pointsEarned > 0;
              const hasSpent = entry.pointsSpent > 0;
              const movementText = hasEarned
                ? hasSpent
                  ? "Compra pagada + Descuento aplicado"
                  : "Compra pagada"
                : hasSpent
                  ? "Descuento aplicado con puntos"
                  : "—";

              return (
                <tr key={entry.orderId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-600">{formatDate(entry.date)}</td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/cuenta/pedidos?orderId=${entry.orderId}`}
                      className="text-primary-600 hover:text-primary-700 underline underline-offset-2 font-mono text-xs"
                    >
                      #{entry.shortId}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{movementText}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      {hasEarned && (
                        <span className="text-green-600 font-medium">
                          +{entry.pointsEarned.toLocaleString()}
                        </span>
                      )}
                      {hasSpent && (
                        <span className="text-red-600 font-medium">
                          -{entry.pointsSpent.toLocaleString()}
                        </span>
                      )}
                      {!hasEarned && !hasSpent && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {entry.balanceAfter !== null ? (
                      <span className="font-semibold text-gray-900">
                        {entry.balanceAfter.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
