"use client";

import { useState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";
import Toast from "@/components/ui/Toast";

type EditProfileFormProps = {
  initialFullName: string;
  initialPhone: string;
};

export default function EditProfileForm({
  initialFullName,
  initialPhone,
}: EditProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setToast(null);

    try {
      const result = await updateProfileAction({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });

      if (result?.error) {
        setToast({
          message: result.error,
          type: "error",
        });
      } else if (result?.success) {
        setToast({
          message: result.message || "Perfil actualizado correctamente",
          type: "success",
        });
        // Recargar la página después de un breve delay para mostrar los cambios
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      setToast({
        message: "Ocurrió un error al actualizar el perfil",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Teléfono (opcional)
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="5512345678"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

