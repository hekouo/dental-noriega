"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type ReviewItem = {
  id: string;
  created_at: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string | null;
  is_example: boolean;
  is_published: boolean;
  source: string | null;
  user_id: string | null;
  meta: Record<string, unknown>;
};

type TabStatus = "pending" | "published" | "examples";

const STATUS_TABS: { value: TabStatus; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "published", label: "Publicadas" },
  { value: "examples", label: "Ejemplos" },
];

function truncate(s: string | null, max: number): string {
  if (!s) return "—";
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function AdminReviewsTableClient() {
  const [status, setStatus] = useState<TabStatus>("pending");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchReviews = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status, limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Error ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items ?? []);
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setItems([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: true }),
      });
      if (!res.ok) throw new Error("Error al aprobar");
      await fetchReviews();
    } catch {
      alert("No se pudo aprobar la reseña");
    } finally {
      setActionId(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: false }),
      });
      if (!res.ok) throw new Error("Error al despublicar");
      await fetchReviews();
    } catch {
      alert("No se pudo despublicar");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar esta reseña? Esta acción no se puede deshacer.")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      await fetchReviews();
    } catch {
      alert("No se pudo borrar");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reseñas</h1>
        <p className="text-sm text-gray-500 mt-1">Moderar reseñas de productos</p>
        <Link
          href="/admin/pedidos"
          className="inline-block mt-2 text-sm text-primary-600 hover:text-primary-700"
        >
          ← Volver a admin
        </Link>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                status === tab.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Cargando…</div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => fetchReviews()}
              className="mt-2 text-primary-600 hover:text-primary-700 underline"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {status === "pending" && "No hay reseñas pendientes."}
            {status === "published" && "No hay reseñas publicadas."}
            {status === "examples" && "No hay reseñas de ejemplo."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rating</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Título / Comentario</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Autor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Producto</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">{r.rating} ★</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        {truncate(r.title || r.body, 60)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.author_name?.trim() || "Anónimo"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/admin/productos/${r.product_id}/editar`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {r.product_id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1">
                          {!r.is_published && (
                            <button
                              type="button"
                              onClick={() => handleApprove(r.id)}
                              disabled={actionId === r.id}
                              className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                            >
                              Aprobar
                            </button>
                          )}
                          {r.is_published && !r.is_example && (
                            <button
                              type="button"
                              onClick={() => handleUnpublish(r.id)}
                              disabled={actionId === r.id}
                              className="text-sm text-amber-600 hover:text-amber-700 disabled:opacity-50"
                            >
                              Despublicar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={actionId === r.id}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Borrar
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nextCursor && (
              <div className="px-4 py-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => fetchReviews(nextCursor)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Cargar más
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
