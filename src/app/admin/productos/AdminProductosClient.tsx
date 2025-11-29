"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMXNFromCents } from "@/lib/utils/currency";
import {
  quickUpdatePriceAction,
  quickToggleActiveAction,
} from "@/lib/actions/products.admin";
import type { AdminProductListItem } from "@/lib/supabase/products.admin.server";
import type { AdminSection } from "@/lib/supabase/sections.admin.server";

type Props = {
  products: AdminProductListItem[];
  sections: AdminSection[];
  total: number;
  currentPage: number;
  totalPages: number;
};

export default function AdminProductosClient({
  products: initialProducts,
  sections,
  total: initialTotal,
  currentPage,
  totalPages,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>("");

  // Filtrado client-side
  const filteredProducts = useMemo(() => {
    let filtered = [...initialProducts];

    // Búsqueda por título o SKU
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.sku && p.sku.toLowerCase().includes(query)),
      );
    }

    // Filtro por sección
    if (sectionFilter !== "all") {
      filtered = filtered.filter((p) => p.sectionId === sectionFilter);
    }

    // Filtro por estado activo
    if (activeFilter === "active") {
      filtered = filtered.filter((p) => p.active);
    } else if (activeFilter === "inactive") {
      filtered = filtered.filter((p) => !p.active);
    }

    return filtered;
  }, [initialProducts, searchQuery, sectionFilter, activeFilter]);

  const handleStartEditPrice = (product: AdminProductListItem) => {
    setEditingPriceId(product.id);
    setPriceInput((product.priceCents / 100).toFixed(2));
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setPriceInput("");
  };

  const handleSavePrice = async (productId: string) => {
    const formData = new FormData();
    formData.append("price", priceInput);
    const result = await quickUpdatePriceAction(productId, formData);
    if (result.success) {
      setEditingPriceId(null);
      setPriceInput("");
      startTransition(() => {
        router.refresh();
      });
    } else {
      alert(result.error || "Error al actualizar precio");
    }
  };

  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    const formData = new FormData();
    formData.append("active", String(!currentActive));
    const result = await quickToggleActiveAction(productId, formData);
    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      alert(result.error || "Error al actualizar estado");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Administración de Productos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona productos del catálogo
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          + Nuevo producto
        </Link>
      </header>

      {/* Búsqueda y filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Buscar
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Título o SKU..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filtro por sección */}
          <div>
            <label
              htmlFor="section"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Sección
            </label>
            <select
              id="section"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Todas las secciones</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por estado activo */}
          <div>
            <label
              htmlFor="active"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Estado
            </label>
            <select
              id="active"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Todos</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
        </div>

        {/* Resultados del filtro */}
        {searchQuery || sectionFilter !== "all" || activeFilter !== "all" ? (
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredProducts.length} de {initialTotal} productos
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 mb-4">
              {initialTotal === 0
                ? "No hay productos registrados"
                : "No se encontraron productos con los filtros aplicados."}
            </p>
            {initialTotal > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSectionFilter("all");
                  setActiveFilter("all");
                }}
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Imagen
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Sección
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Activo
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="h-12 w-12 object-cover rounded"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                            Sin imagen
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {product.title}
                        </p>
                        {product.sku && (
                          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.sectionName || product.sectionSlug || "Sin sección"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingPriceId === product.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePrice(product.id)}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEditPrice}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium">
                              {formatMXNFromCents(product.priceCents)}
                            </span>
                            <button
                              onClick={() => handleStartEditPrice(product)}
                              className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                            >
                              Editar
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(product.id, product.active)}
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                            product.active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {product.active ? "Sí" : "No"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/productos/${product.id}/editar`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          Editar
                        </Link>
                        {product.sectionSlug &&
                          product.slug &&
                          product.active && (
                            <div className="mt-1">
                              <Link
                                href={`/catalogo/${product.sectionSlug}/${product.slug}`}
                                target="_blank"
                                className="text-xs text-gray-500 hover:text-primary-600 underline"
                              >
                                Ver en tienda
                              </Link>
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación (solo si no hay filtros activos) */}
            {totalPages > 1 &&
              !searchQuery &&
              sectionFilter === "all" &&
              activeFilter === "all" && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando página {currentPage} de {totalPages} ({initialTotal}{" "}
                    productos)
                  </p>
                  <div className="flex gap-2">
                    {currentPage > 1 && (
                      <Link
                        href={`/admin/productos?page=${currentPage - 1}`}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Anterior
                      </Link>
                    )}
                    {currentPage < totalPages && (
                      <Link
                        href={`/admin/productos?page=${currentPage + 1}`}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Siguiente
                      </Link>
                    )}
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

