"use client";

import { useState, useEffect, useTransition } from "react";
import type { AccountAddress } from "@/lib/supabase/addresses.server";

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

  // Cargar direcciones cuando cambia el email
  useEffect(() => {
    if (email.trim()) {
      loadAddresses();
    } else {
      setAddresses([]);
    }
  }, [email]);

  const loadAddresses = async () => {
    if (!email.trim()) return;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar direcciones");
      console.error("[loadAddresses] Error:", err);
    } finally {
      setLoading(false);
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
        const url = editingId
          ? "/api/account/addresses"
          : "/api/account/addresses";
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
    if (!email.trim() || !confirm("¿Eliminar esta dirección?")) return;

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

        await loadAddresses();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar dirección");
        console.error("[handleDelete] Error:", err);
      }
    });
  };

  const handleSetDefault = async (id: string) => {
    if (!email.trim()) return;

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

        await loadAddresses();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al marcar como predeterminada");
        console.error("[handleSetDefault] Error:", err);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Formulario de email */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Ingresa tu email</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoComplete="email"
            aria-label="Email"
          />
          <button
            type="button"
            onClick={loadAddresses}
            disabled={!email.trim() || loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Cargando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Mensaje de error */}
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
                Nombre completo *
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="name"
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="tel"
              />
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) =>
                setFormData({ ...formData, is_default: e.target.checked })
              }
              className="mr-2"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700">
              Usar como dirección predeterminada
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
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
                className="bg-white rounded-lg border p-4 space-y-3"
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

      {/* Estado vacío */}
      {email.trim() && !loading && addresses.length === 0 && !editingId && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No tienes direcciones guardadas aún</p>
          <p className="text-sm text-gray-500">
            Completa el formulario arriba para agregar tu primera dirección
          </p>
        </div>
      )}
    </div>
  );
}

