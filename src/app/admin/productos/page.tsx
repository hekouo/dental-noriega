import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess } from "@/lib/admin/access";
import { getAdminProducts } from "@/lib/supabase/products.admin.server";
import { formatMXNFromCents } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    page?: string;
  }>;
};

/**
 * Página de administración de productos
 * 
 * Requiere que el usuario esté autenticado y su email esté en ADMIN_ALLOWED_EMAILS
 */
export default async function AdminProductosPage({ searchParams }: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const { products, total } = await getAdminProducts({ limit, offset });
  const totalPages = Math.ceil(total / limit);

  // Log en desarrollo para debugging
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[AdminProductosPage] Productos cargados: ${products.length}, Total: ${total}`,
    );
  }

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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {products.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 mb-4">
              {total === 0
                ? "No hay productos registrados"
                : "No se pudieron cargar los productos. Revisa los logs del servidor."}
            </p>
            <Link
              href="/admin/productos/nuevo"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              Crear primer producto
            </Link>
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
                  {products.map((product) => (
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
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.sectionName || product.sectionSlug || "Sin sección"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMXNFromCents(product.priceCents)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            product.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {product.active ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/productos/${product.id}/editar`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} productos
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`/admin/productos?page=${page - 1}`}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Anterior
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin/productos?page=${page + 1}`}
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

