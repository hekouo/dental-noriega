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
type Props = {
  searchParams?: {
    success?: string;
    error?: string;
  };
};

export default async function AdminSeccionesPage({ searchParams }: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const sections = await getAdminSections();
  const success = searchParams?.success;
  const error = searchParams?.error;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <Link
          href="/cuenta"
          className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
        >
          ← Volver a cuenta
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Administración de Secciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona las categorías del catálogo
        </p>
      </header>

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success === "created" && "Sección creada correctamente."}
          {success === "updated" && "Sección actualizada correctamente."}
          {!["created", "updated"].includes(success) &&
            "Operación realizada correctamente."}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Ocurrió un error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de creación */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Crear Nueva Sección
          </h2>
          <form action={createSectionAction}>
            <div className="space-y-4">
              {/* Nombre */}
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
                  placeholder="ej: Instrumentos"
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
                  placeholder="ej: instrumentos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  URL amigable (sin espacios, usar guiones)
                </p>
              </div>

              {/* Botón */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Crear Sección
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Listado de secciones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Secciones Existentes ({sections.length})
          </h2>

          {sections.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No hay secciones registradas
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sections.map((section) => (
                    <tr key={section.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {section.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {section.slug}
                        </code>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/admin/secciones/${section.id}/editar`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
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

