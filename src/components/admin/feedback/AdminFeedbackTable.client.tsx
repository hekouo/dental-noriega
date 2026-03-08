"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type FeedbackItem = {
  id: string;
  created_at: string;
  page_path: string | null;
  type: string;
  message: string;
  rating: number | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  status: string;
  meta: Record<string, unknown>;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "reviewed", label: "Revisado" },
  { value: "closed", label: "Cerrado" },
  { value: "spam", label: "Spam" },
  { value: "all", label: "Todos" },
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

export default function AdminFeedbackTableClient() {
  const [status, setStatus] = useState("new");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchFeedback = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ status, limit: "50" });
        if (qApplied) params.set("q", qApplied);
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/admin/feedback?${params.toString()}`);
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
    },
    [status, qApplied],
  );

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleSearch = () => {
    setQApplied(q.trim());
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      await fetchFeedback();
    } catch {
      alert("No se pudo actualizar el estado");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar este feedback? Esta acción no se puede deshacer.")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      await fetchFeedback();
    } catch {
      alert("No se pudo borrar");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Opiniones / Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">Revisar feedback del sitio</p>
        <Link
          href="/admin"
          className="inline-block mt-2 text-sm text-primary-600 hover:text-primary-700"
        >
          ← Volver a admin
        </Link>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar (mensaje o ruta)
            </label>
            <div className="flex gap-2">
              <input
                id="q"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Texto..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Buscar
              </button>
            </div>
          </div>
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
              onClick={() => fetchFeedback()}
              className="mt-2 text-primary-600 hover:text-primary-700 underline"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No hay feedback con los filtros aplicados.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ruta</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Mensaje</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(f.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate" title={f.page_path ?? ""}>
                        {f.page_path || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{f.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        {truncate(f.message, 50)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{f.status}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-2 flex-wrap">
                          <select
                            value={f.status}
                            onChange={(e) => handleStatusChange(f.id, e.target.value)}
                            disabled={actionId === f.id}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {STATUS_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDelete(f.id)}
                            disabled={actionId === f.id}
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
                  onClick={() => fetchFeedback(nextCursor)}
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
