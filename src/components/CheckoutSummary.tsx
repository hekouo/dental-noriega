"use client";

import {
  useCheckoutStore,
  selectSelectedCount,
  selectSelectedTotal,
} from "@/lib/store/checkoutStore";
import { formatMXN } from "@/lib/utils/currency";
import { useRouter } from "next/navigation";

export default function CheckoutSummary() {
  const selectedCount = useCheckoutStore(selectSelectedCount);
  const selectedTotal = useCheckoutStore(selectSelectedTotal);
  const router = useRouter();

  const handleContinue = () => {
    if (selectedCount > 0) {
      router.push("/checkout/pago");
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold">{selectedCount}</span> producto
          {selectedCount !== 1 ? "s" : ""} seleccionado
          {selectedCount !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg font-bold text-primary-600">
              {formatMXN(selectedTotal)}
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
