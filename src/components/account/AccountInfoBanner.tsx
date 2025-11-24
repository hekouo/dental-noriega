"use client";

import { useEffect, useState } from "react";
import Toast from "@/components/ui/Toast";

type AccountInfoBannerProps = {
  showVerified: boolean;
};

export default function AccountInfoBanner({
  showVerified,
}: AccountInfoBannerProps) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showVerified) {
      setShowToast(true);
    }
  }, [showVerified]);

  if (!showVerified) {
    return null;
  }

  return (
    <>
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-800 mb-1">
              Tu correo fue verificado correctamente
            </h3>
            <p className="text-sm text-green-700">
              Bienvenido a Depósito Dental Noriega. Ya puedes acumular puntos y
              ver tus pedidos.
            </p>
          </div>
        </div>
      </div>
      {showToast && (
        <Toast
          message="Tu correo fue verificado correctamente"
          type="success"
          duration={5000}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}

