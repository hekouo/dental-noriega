import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess } from "@/lib/admin/access";
import { getAdminSections } from "@/lib/supabase/sections.admin.server";
import { createSectionAction } from "@/lib/actions/sections.admin";

export const dynamic = "force-dynamic";

/**
 * Página de administración de secciones
 *
 * Requiere que el usuario esté autenticado y su email esté en ADMIN_ALLOWED_EMAILS
 */
export default async function AdminSeccionesPage() {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const sections = await getAdminSections();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Administración de Secciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las categorías del catálogo
          </p>
        </div>
        <Link
          href="/admin/productos"
          className="text-primary-600 hover:text-primary-700 text-sm"
        >
          ← Volver a productos
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de creación */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Nueva Sección
          </h2>
          <form action={createSectionAction} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: Instrumentos"
              />
            </div>
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
                placeholder="ej: instrumentos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL amigable (sin espacios, usar guiones)
              </p>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Crear Sección
            </button>
          </form>
        </div>

        {/* Listado de secciones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Secciones Existentes
            </h2>
          </div>
          {sections.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No hay secciones registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sections.map((section) => (
                    <tr key={section.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {section.name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {section.slug}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/secciones/${section.id}/editar`}
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
          )}
        </div>
      </div>
    </div>
  );
}

