"use client";

import { useState, useEffect, useTransition } from "react";
import type { AccountAddress } from "@/lib/supabase/addresses.server";
import { isValidEmail } from "@/lib/validation/email";
import { getBrowserSupabase } from "@/lib/supabase/client";

type AddressFormData = {
  full_name: string;
  phone: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_default: boolean;
};

export default function DireccionesClient() {
  const [email, setEmail] = useState("");
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<AddressFormData>({
    full_name: "",
    phone: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    country: "México",
    is_default: false,
  });

  // Cargar email del usuario autenticado al montar
  useEffect(() => {
    const loadUserEmail = async () => {
      const s = getBrowserSupabase();
      if (!s) return;

      try {
        const { data: { user } } = await s.auth.getUser();
        if (user?.email && isValidEmail(user.email)) {
          // Pre-llenar el email solo si el campo está vacío
          setEmail((prev) => prev || user.email || "");
        }
      } catch (err) {
        // Ignorar errores de autenticación
        if (process.env.NODE_ENV === "development") {
          console.debug("[DireccionesClient] Error de autenticación ignorado:", err);
        }
      }
    };

    loadUserEmail();
  }, []);

  // NO cargar direcciones automáticamente al escribir
  // Solo se cargan cuando el usuario hace clic en "Buscar" o presiona Enter
  const loadAddresses = async () => {
    // Validar email antes de hacer la llamada
    if (!isValidEmail(email)) {
      setError("Ingresa un correo electrónico válido para buscar tus direcciones.");
      setAddresses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch(
        `/api/account/addresses?email=${encodeURIComponent(normalizedEmail)}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al cargar direcciones");
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
      
      // Si no hay direcciones, mostrar mensaje amigable
      if (!data.addresses || data.addresses.length === 0) {
        setError(null); // No es un error, solo no hay direcciones
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar direcciones");
      console.error("[loadAddresses] Error:", err);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  // Manejar Enter en el input de email
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadAddresses();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Ingresa tu email primero");
      return;
    }

    startTransition(async () => {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const url = "/api/account/addresses";
        const method = editingId ? "PUT" : "POST";

        const body = editingId
          ? { id: editingId, email: normalizedEmail, ...formData }
          : { email: normalizedEmail, ...formData };

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al guardar dirección");
        }

        // Limpiar formulario y recargar
        setFormData({
          full_name: "",
          phone: "",
          street: "",
          neighborhood: "",
          city: "",
          state: "",
          zip_code: "",
          country: "México",
          is_default: false,
        });
        setEditingId(null);
        await loadAddresses();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar dirección");
        console.error("[handleSubmit] Error:", err);
      }
    });
  };

  const handleEdit = (address: AccountAddress) => {
    setFormData({
      full_name: address.full_name,
      phone: address.phone,
      street: address.street,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      country: address.country,
      is_default: address.is_default,
    });
    setEditingId(address.id);
    // Scroll suave al formulario
    document.getElementById("address-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id: string) => {
    if (!email.trim() || !isValidEmail(email)) return;
    
    const addressToDelete = addresses.find((a) => a.id === id);
    const isDefault = addressToDelete?.is_default;
    const hasOtherAddresses = addresses.length > 1;
    
    if (!confirm(`¿Eliminar esta dirección${isDefault && hasOtherAddresses ? "? Se marcará otra como predeterminada" : ""}?`)) return;

    startTransition(async () => {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const response = await fetch("/api/account/addresses", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, email: normalizedEmail }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al eliminar dirección");
        }

        // Actualizar estado local inmediatamente (optimistic update)
        const remainingAddresses = addresses.filter((a) => a.id !== id);
        
        // Si se eliminó la predeterminada y hay otras, marcar la primera como predeterminada
        if (isDefault && remainingAddresses.length > 0) {
          const firstRemaining = remainingAddresses[0];
          try {
            await fetch("/api/account/addresses", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: firstRemaining.id, email: normalizedEmail }),
            });
          } catch (err) {
            // Si falla, no importa, se corregirá al recargar
            console.warn("[handleDelete] Error al marcar nueva predeterminada:", err);
          }
        }
        
        setAddresses(remainingAddresses);
        setError(null);
        
        // Recargar para asegurar consistencia
        await loadAddresses();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar dirección");
        console.error("[handleDelete] Error:", err);
        // Recargar en caso de error para restaurar estado
        await loadAddresses();
      }
    });
  };

  const handleSetDefault = async (id: string) => {
    if (!email.trim() || !isValidEmail(email)) return;

    startTransition(async () => {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const response = await fetch("/api/account/addresses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, email: normalizedEmail }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error al marcar como predeterminada");
        }

        // Actualizar estado local inmediatamente (optimistic update)
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            is_default: a.id === id,
          })),
        );
        setError(null);
        
        // Recargar para asegurar consistencia
        await loadAddresses();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al marcar como predeterminada");
        console.error("[handleSetDefault] Error:", err);
        // Recargar en caso de error para restaurar estado
        await loadAddresses();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Formulario de email */}
      <div className="bg-white rounded-lg border p-4 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight mb-2 text-gray-900">Ingresa tu email</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ingresa el correo con el que haces tus compras para ver y administrar tus direcciones guardadas.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // Limpiar error cuando el usuario empieza a escribir
              if (error) setError(null);
            }}
            onKeyDown={handleEmailKeyDown}
            placeholder="tu@email.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoComplete="email"
            aria-label="Email"
          />
          <button
            type="button"
            onClick={loadAddresses}
            disabled={!email.trim() || loading || !isValidEmail(email)}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Cargando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Mensaje de error o información */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Formulario de dirección */}
      {email.trim() && (
        <form
          id="address-form"
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Editar dirección" : "Nueva dirección"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo (nombre y apellidos) *
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
                placeholder="Ej: Juan Pérez García"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="name"
              />
              <p className="text-gray-500 text-xs mt-1">
                Incluye tu nombre y apellidos completos
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })
                }
                required
                maxLength={10}
                placeholder="5512345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="tel"
              />
              <p className="text-gray-500 text-xs mt-1">
                10 dígitos, solo números
              </p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                Calle y número *
              </label>
              <input
                type="text"
                id="street"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="street-address"
              />
            </div>

            <div>
              <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">
                Colonia *
              </label>
              <input
                type="text"
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) =>
                  setFormData({ ...formData, neighborhood: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="address-line2"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad *
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="address-level2"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <input
                type="text"
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="address-level1"
              />
            </div>

            <div>
              <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                Código postal *
              </label>
              <input
                type="text"
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) =>
                  setFormData({ ...formData, zip_code: e.target.value.replace(/\D/g, "").slice(0, 5) })
                }
                required
                maxLength={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="postal-code"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                País
              </label>
              <input
                type="text"
                id="country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="country"
              />
            </div>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) =>
                setFormData({ ...formData, is_default: e.target.checked })
              }
              className="mt-1 mr-2"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700">
              Usar como dirección predeterminada
              <span className="block text-xs text-gray-500 mt-1">
                Esta dirección se seleccionará automáticamente en futuros pedidos
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(() => {
                if (isPending) return "Guardando...";
                if (editingId) return "Actualizar";
                return "Guardar";
              })()}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    full_name: "",
                    phone: "",
                    street: "",
                    neighborhood: "",
                    city: "",
                    state: "",
                    zip_code: "",
                    country: "México",
                    is_default: false,
                  });
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {/* Lista de direcciones */}
      {email.trim() && addresses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Direcciones guardadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-lg border p-4 space-y-3 ${
                  address.is_default
                    ? "border-blue-500 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {address.is_default && (
                      <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded mb-2">
                        Predeterminada
                      </span>
                    )}
                    <h3 className="font-semibold text-lg mb-1">{address.full_name}</h3>
                    <p className="text-sm text-gray-600">{address.phone}</p>
                  </div>
                </div>

                <div className="text-sm text-gray-700 space-y-1">
                  <p>{address.street}</p>
                  <p>
                    {address.neighborhood}, {address.city}
                  </p>
                  <p>
                    {address.state}, C.P. {address.zip_code}
                  </p>
                  {address.country && <p>{address.country}</p>}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => handleEdit(address)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  {!address.is_default && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      disabled={isPending}
                      className="flex-1 px-3 py-1.5 text-sm border border-primary-300 text-primary-700 rounded-md hover:bg-primary-50 disabled:opacity-50"
                    >
                      Predeterminada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(address.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío: solo mostrar si el email es válido y ya se buscó */}
      {email.trim() && isValidEmail(email) && !loading && addresses.length === 0 && !editingId && !error && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-700 font-medium mb-2">No tienes direcciones guardadas todavía</p>
          <p className="text-sm text-gray-600">
            Puedes guardar una dirección desde el checkout o crear una nueva aquí arriba. Las direcciones guardadas te ayudan a completar tus pedidos más rápido.
          </p>
        </div>
      )}
    </div>
  );
}

