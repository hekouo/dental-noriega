import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess } from "@/lib/admin/access";
import {
  getAdminProductById,
  getAdminSections,
} from "@/lib/supabase/products.admin.server";
import { updateProductAction } from "@/lib/actions/products.admin";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Página para editar un producto existente
 */
export default async function AdminProductosEditarPage({ params }: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const { id } = await params;
  const product = await getAdminProductById(id);
  const sections = await getAdminSections();

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-800 mb-2">
            Producto no encontrado
          </h1>
          <p className="text-red-600 mb-4">
            No se encontró un producto con el ID proporcionado.
          </p>
          <Link
            href="/admin/productos"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            ← Volver a productos
          </Link>
        </div>
      </div>
    );
  }

  // Convertir priceCents a MXN para el formulario
  const priceMxn = product.priceCents / 100;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <Link
          href="/admin/productos"
          className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
        >
          ← Volver a productos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Editar Producto</h1>
        <p className="text-sm text-gray-500 mt-1">
          ID: <span className="font-mono">{product.id}</span>
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form action={updateProductAction.bind(null, product.id)}>
          <div className="space-y-6">
            {/* Sección */}
            <div>
              <label
                htmlFor="section_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Sección <span className="text-red-500">*</span>
              </label>
              <select
                id="section_id"
                name="section_id"
                required
                defaultValue={product.sectionId || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Seleccionar sección</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Título */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                defaultValue={product.title}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                required
                defaultValue={product.slug}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL amigable (sin espacios, usar guiones)
              </p>
            </div>

            {/* Precio */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Precio (MXN) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="price"
                name="price"
                step="0.01"
                min="0"
                required
                defaultValue={priceMxn}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Stock */}
            <div>
              <label
                htmlFor="stock_qty"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Stock (cantidad)
              </label>
              <input
                type="number"
                id="stock_qty"
                name="stock_qty"
                min="0"
                defaultValue={product.stockQty ?? ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Dejar vacío si no aplica
              </p>
            </div>

            {/* SKU */}
            <div>
              <label
                htmlFor="sku"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                SKU
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                defaultValue={product.sku || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Descripción */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={product.description || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Image URL */}
            <div>
              <label
                htmlFor="image_url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                URL de Imagen
              </label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                defaultValue={product.image_url || ""}
                placeholder="https://lh3.googleusercontent.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              {product.image_url && (
                <div className="mt-2">
                  <img
                    src={product.image_url}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded border"
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Pegar URL completa de la imagen (ej: Google Drive)
              </p>
            </div>

            {/* Activo */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                name="active"
                defaultChecked={product.active}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label
                htmlFor="active"
                className="ml-2 block text-sm text-gray-700"
              >
                Producto activo (visible en catálogo)
              </label>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Guardar Cambios
              </button>
              <Link
                href="/admin/productos"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
