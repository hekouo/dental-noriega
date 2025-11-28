import { notFound, redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/access";
import { getAdminSectionById } from "@/lib/supabase/sections.admin.server";
import { updateSectionAction } from "@/lib/actions/sections.admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Página de edición de sección
 *
 * Requiere que el usuario esté autenticado y su email esté en ADMIN_ALLOWED_EMAILS
 */
export default async function AdminSeccionesEditarPage({ params }: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const { id } = await params;
  const section = await getAdminSectionById(id);

  if (!section) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <Link
          href="/admin/secciones"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-4 inline-block"
        >
          ← Volver a secciones
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Editar Sección
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Modifica los datos de la sección
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form action={updateSectionAction} className="space-y-6">
          <input type="hidden" name="id" value={section.id} />

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={section.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Slug
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              required
              defaultValue={section.slug}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly identifier (sin espacios, minúsculas)
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Link
              href="/admin/secciones"
              className="text-gray-600 hover:text-gray-700 text-sm font-medium"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

