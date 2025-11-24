"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import AccountInfoBanner from "@/components/account/AccountInfoBanner";

type Address = {
  id: string;
  user_id: string;
  label: string;
  street: string;
  ext_no: string;
  int_no?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  is_default: boolean;
};

export default function DireccionesPageClient() {
  const searchParams = useSearchParams();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const showVerified = searchParams?.get("verified") === "1";

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const s = getBrowserSupabase();
    if (!s) {
      setIsLoading(false);
      return;
    }
    const {
      data: { user },
    } = await s.auth.getUser();

    if (user) {
      const { data } = await s
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      setAddresses(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const s = getBrowserSupabase();
    if (!s) return;

    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) return;

    const getString = (key: string): string => {
      const value = formData.get(key);
      return value instanceof File ? "" : (value?.toString() ?? "");
    };

    const addressData: Omit<Address, "id"> = {
      user_id: user.id,
      label: getString("label"),
      street: getString("street"),
      ext_no: getString("ext_no"),
      int_no: formData.get("int_no")?.toString() ?? null,
      neighborhood: getString("neighborhood"),
      city: getString("city"),
      state: getString("state"),
      zip: getString("zip"),
      is_default: formData.get("is_default") === "on",
    };

    try {
      if (editingId) {
        await s
          .from("addresses")
          .update(addressData as never)
          .eq("id", editingId);
      } else {
        await s.from("addresses").insert(addressData as never);
      }

      setShowForm(false);
      setEditingId(null);
      loadAddresses();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("cuenta/direcciones failed:", err);
      alert("Error al guardar dirección");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta dirección?")) return;
    const s = getBrowserSupabase();
    if (!s) return;
    await s.from("addresses").delete().eq("id", id);
    loadAddresses();
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AccountInfoBanner showVerified={showVerified} />
      
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Mis direcciones guardadas
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition text-gray-700"
          >
            <Plus size={16} />
            Agregar dirección
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {editingId ? "Editar Dirección" : "Nueva Dirección"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  Etiqueta (ej. Casa, Consultorio)
                </label>
                <input type="text" name="label" required className="input" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Calle</label>
                  <input type="text" name="street" required className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">No. Ext</label>
                    <input
                      type="text"
                      name="ext_no"
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">No. Int</label>
                    <input type="text" name="int_no" className="input" />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Colonia</label>
                <input
                  type="text"
                  name="neighborhood"
                  required
                  className="input"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Ciudad</label>
                  <input type="text" name="city" required className="input" />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <input type="text" name="state" required className="input" />
                </div>
                <div>
                  <label className="label">C.P.</label>
                  <input type="text" name="zip" required className="input" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_default" id="is_default" />
                <label htmlFor="is_default" className="text-sm">
                  Establecer como predeterminada
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {addresses.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Todavía no tienes direcciones guardadas
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Guarda al menos una dirección para acelerar tus próximas compras.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition"
            >
              <Plus size={16} />
              Agregar dirección
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {address.label}
                    </h3>
                    {address.is_default && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-600">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {address.street} {address.ext_no}
                    {address.int_no && ` Int. ${address.int_no}`}
                    <br />
                    {address.neighborhood}, {address.city}
                    <br />
                    {address.state}, C.P. {address.zip}
                  </p>
                </div>
                <div className="flex gap-2 mt-4 sm:mt-0 sm:ml-4">
                  <button
                    onClick={() => {
                      setEditingId(address.id);
                      setShowForm(true);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

