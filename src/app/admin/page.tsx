import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";

/**
 * Landing del admin: enlaces a todos los paneles.
 */
export default async function AdminPage() {
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const panels: { href: string; label: string }[] = [
    { href: "/admin/pedidos", label: "Panel de Pedidos" },
    { href: "/admin/productos", label: "Panel de Productos" },
    { href: "/admin/secciones", label: "Panel de Secciones" },
    { href: "/admin/reportes/envios", label: "Reporte de Envíos" },
    { href: "/admin/resenas", label: "Panel de Reseñas" },
    { href: "/admin/opiniones", label: "Panel de Opiniones" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <Link
          href="/cuenta"
          className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
        >
          ← Volver a cuenta
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
        <p className="text-sm text-gray-500 mt-1">
          Elige un panel para gestionar el sitio
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Paneles</h2>
        <div className="flex flex-wrap gap-3">
          {panels.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
