"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderShippingAndNotes } from "@/lib/actions/orders.admin";
import { useState, useEffect } from "react";
import { SHIPPING_STATUSES, SHIPPING_STATUS_LABELS, isValidShippingStatus, normalizeShippingStatus } from "@/lib/orders/statuses";

type Props = {
  orderId: string;
  initialAdminNotes: string | null;
  initialShippingStatus: string | null;
  initialShippingTrackingNumber: string | null;
  initialShippingLabelUrl: string | null;
  shippingProvider: string | null;
  hasLabelEvidence: boolean; // Si hay evidencia de guía creada (hasShipmentId || tracking || label_url)
};

export default function EditShippingAndNotesClient({
  orderId,
  initialAdminNotes,
  initialShippingStatus,
  initialShippingTrackingNumber,
  initialShippingLabelUrl,
  shippingProvider,
  hasLabelEvidence,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes || "");
  // Normalizar estado inicial si es legacy
  const normalizedInitialStatus = initialShippingStatus 
    ? (normalizeShippingStatus(initialShippingStatus) || initialShippingStatus)
    : "";
  const [shippingStatus, setShippingStatus] = useState(normalizedInitialStatus);
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState(
    initialShippingTrackingNumber || "",
  );
  const [shippingLabelUrl, setShippingLabelUrl] = useState(initialShippingLabelUrl || "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detectar si hay cambios
  const hasChanges =
    adminNotes !== (initialAdminNotes || "") ||
    shippingStatus !== (initialShippingStatus || "") ||
    shippingTrackingNumber !== (initialShippingTrackingNumber || "") ||
    shippingLabelUrl !== (initialShippingLabelUrl || "");

  // Resetear mensaje cuando cambian los valores
  useEffect(() => {
    setMessage(null);
  }, [adminNotes, shippingStatus, shippingTrackingNumber, shippingLabelUrl]);

  const handleSave = async () => {
    setMessage(null);

    startTransition(async () => {
      // Normalizar shipping_status a valor canónico antes de guardar
      const normalizedShippingStatus = shippingStatus 
        ? (normalizeShippingStatus(shippingStatus) || shippingStatus)
        : null;

      const result = await updateOrderShippingAndNotes(orderId, {
        admin_notes: adminNotes || null,
        shipping_status: normalizedShippingStatus,
        shipping_tracking_number: shippingTrackingNumber || null,
        shipping_label_url: shippingLabelUrl || null,
      });

      if (result.ok) {
        setMessage({ type: "success", text: "Cambios guardados correctamente." });
        // Refrescar la página para sincronizar
        router.refresh();
      } else {
        const errorMessages: Record<string, string> = {
          "access-denied": "No tienes permisos para actualizar esta orden.",
          "invalid-order-id": "ID de orden inválido.",
          "order-not-found": "Orden no encontrada.",
          "fetch-error": "Error al buscar la orden.",
          "update-error": "Error al guardar los cambios.",
          "unexpected-error": "Error inesperado. Intenta de nuevo.",
        };
        setMessage({
          type: "error",
          text: errorMessages[result.error] || "Error al guardar los cambios.",
        });
      }
    });
  };

  // Opciones de estado de envío (valores canónicos + opción para custom)
  const shippingStatusOptions: Array<{ value: string; label: string }> = [
    { value: "", label: "Sin estado" },
    ...SHIPPING_STATUSES.map((status) => ({
      value: status,
      label: SHIPPING_STATUS_LABELS[status],
    })),
  ];

  // Si es Skydropx y hay evidencia de guía, ocultar campos manuales y mostrar sección colapsada de emergencia
  const isSkydropx = shippingProvider === "skydropx" || shippingProvider === "Skydropx";
  const showManualOverride = !(isSkydropx && hasLabelEvidence);

  return (
    <div className="space-y-6">
      {/* Notas internas */}
      <div>
        <label htmlFor="admin-notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notas internas
        </label>
        <textarea
          id="admin-notes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
          placeholder="Escribe notas internas sobre este pedido..."
          disabled={isPending}
        />
      </div>

      {/* Campos de envío - Solo mostrar si no hay evidencia de guía Skydropx */}
      {showManualOverride ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="shipping-status" className="block text-sm font-medium text-gray-700 mb-2">
              Estado de envío
            </label>
            <select
              id="shipping-status"
              value={shippingStatus}
              onChange={(e) => setShippingStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              disabled={isPending}
            >
              {shippingStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {/* Si el estado no es canónico, permitir editarlo como texto libre */}
            {shippingStatus &&
              !isValidShippingStatus(shippingStatus) &&
              shippingStatus !== "" && (
                <p className="mt-1 text-xs text-gray-500">
                  Estado personalizado: {shippingStatus}
                </p>
              )}
          </div>

          <div>
            <label
              htmlFor="shipping-tracking-number"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Número de guía
            </label>
            <input
              id="shipping-tracking-number"
              type="text"
              value={shippingTrackingNumber}
              onChange={(e) => setShippingTrackingNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm font-mono"
              placeholder="Ej: ABC123456789"
              disabled={isPending}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="shipping-label-url" className="block text-sm font-medium text-gray-700 mb-2">
              URL de etiqueta PDF (opcional)
            </label>
            <input
              id="shipping-label-url"
              type="url"
              value={shippingLabelUrl}
              onChange={(e) => setShippingLabelUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              placeholder="https://..."
              disabled={isPending}
            />
          </div>
        </div>
      ) : (
        /* Override manual solo como emergencia (colapsado) */
        <details className="border border-gray-200 rounded-lg">
          <summary className="px-4 py-2 bg-yellow-50 text-sm font-medium text-yellow-800 cursor-pointer hover:bg-yellow-100">
            ⚠️ Override manual (solo emergencia)
          </summary>
          <div className="p-4 space-y-4 bg-white">
            <p className="text-xs text-gray-600 mb-4">
              Esta orden tiene guía creada automáticamente por Skydropx. Solo usa esta sección si necesitas hacer correcciones manuales.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shipping-status-override" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de envío (override)
                </label>
                <select
                  id="shipping-status-override"
                  value={shippingStatus}
                  onChange={(e) => setShippingStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                  disabled={isPending}
                >
                  {shippingStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="shipping-tracking-number-override"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Número de guía (override)
                </label>
                <input
                  id="shipping-tracking-number-override"
                  type="text"
                  value={shippingTrackingNumber}
                  onChange={(e) => setShippingTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm font-mono"
                  placeholder="Ej: ABC123456789"
                  disabled={isPending}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="shipping-label-url-override" className="block text-sm font-medium text-gray-700 mb-2">
                  URL de etiqueta PDF (override)
                </label>
                <input
                  id="shipping-label-url-override"
                  type="url"
                  value={shippingLabelUrl}
                  onChange={(e) => setShippingLabelUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="https://..."
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        </details>
      )}

      {/* Botón guardar y mensajes */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
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

        {!hasChanges && !message && (
          <p className="text-sm text-gray-500">No hay cambios pendientes</p>
        )}
      </div>
    </div>
  );
}

