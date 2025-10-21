"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function DireccionesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const addressData: any = {
      user_id: user.id,
      label: formData.get("label"),
      street: formData.get("street"),
      ext_no: formData.get("ext_no"),
      int_no: formData.get("int_no"),
      neighborhood: formData.get("neighborhood"),
      city: formData.get("city"),
      state: formData.get("state"),
      zip: formData.get("zip"),
      is_default: formData.get("is_default") === "on",
    };

    try {
      // PENDIENTE: validar con esquema (zod) si se requiere

      if (editingId) {
        await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", editingId);
      } else {
        await supabase.from("addresses").insert(addressData);
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

    const supabase = createClient();
    await supabase.from("addresses").delete().eq("id", id);
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
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mis Direcciones</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nueva Dirección
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Editar Dirección" : "Nueva Dirección"}
            </h2>
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

        <div className="grid gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white rounded-lg shadow p-6 relative"
            >
              {address.is_default && (
                <span className="absolute top-4 right-4 bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded">
                  Predeterminada
                </span>
              )}
              <h3 className="font-semibold text-lg mb-2">{address.label}</h3>
              <p className="text-gray-600">
                {address.street} {address.ext_no}
                {address.int_no && ` Int. ${address.int_no}`}
                <br />
                {address.neighborhood}, {address.city}
                <br />
                {address.state}, C.P. {address.zip}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setEditingId(address.id);
                    setShowForm(true);
                  }}
                  className="text-primary-600 hover:underline flex items-center gap-1"
                >
                  <Edit size={16} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {addresses.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No tienes direcciones guardadas aún
            </p>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
