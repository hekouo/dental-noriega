"use client";

import { formatE164ToReadable } from "@/lib/utils/phone";
import { formatMXNFromCents } from "@/lib/utils/currency";

type Props = {
  shortId: string;
  totalCents: number | null;
  paymentMethod: "card" | "bank_transfer" | null;
  contactName?: string | null;
  whatsappE164?: string | null;
};

export default function WhatsappContactClient({
  shortId,
  totalCents,
  paymentMethod,
  contactName,
  whatsappE164,
}: Props) {
  // Si no hay número de WhatsApp, mostrar mensaje informativo
  if (!whatsappE164) {
    return (
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Contacto por WhatsApp
        </h3>
        <p className="text-sm text-gray-600">
          Este pedido no tiene número de WhatsApp registrado.
        </p>
      </div>
    );
  }

  // Construir mensaje de WhatsApp
  const paymentMethodLabel =
    paymentMethod === "card"
      ? "Tarjeta de crédito/débito"
      : paymentMethod === "bank_transfer"
        ? "Transferencia / depósito"
        : "Otro método";

  const totalFormatted = totalCents !== null ? formatMXNFromCents(totalCents) : "N/A";

  const message = `Hola${contactName ? ` ${contactName}` : ""}, soy de Depósito Dental Noriega 👋

Tu pedido #${shortId} está registrado con:
• Método de pago: ${paymentMethodLabel}
• Total: ${totalFormatted}

Cuando tengas tu comprobante, por favor mándalo por aquí.`;

  const whatsappUrl = `https://wa.me/${whatsappE164}?text=${encodeURIComponent(message)}`;

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const readablePhone = formatE164ToReadable(whatsappE164);

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">
        Contacto por WhatsApp
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        Escribir a: <span className="font-medium">{readablePhone}</span>
      </p>
      <button
        type="button"
        onClick={handleOpenWhatsApp}
        className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        Abrir chat de WhatsApp
      </button>
    </div>
  );
}

