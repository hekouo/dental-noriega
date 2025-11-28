import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess } from "@/lib/admin/access";
import { getAdminSectionById } from "@/lib/supabase/sections.admin.server";
import { updateSectionAction } from "@/lib/actions/sections.admin";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Página para editar una sección existente
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
          className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
        >
          ← Volver a secciones
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Editar Sección</h1>
        <p className="text-sm text-gray-500 mt-1">
          ID: <span className="font-mono">{section.id}</span>
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form action={updateSectionAction.bind(null, section.id)}>
          <div className="space-y-6">
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
                defaultValue={section.name}
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
                defaultValue={section.slug}
                placeholder="ej: instrumentos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL amigable (sin espacios, usar guiones)
              </p>
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
                href="/admin/secciones"
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

