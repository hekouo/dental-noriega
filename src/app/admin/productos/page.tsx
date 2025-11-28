import { notFound, redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/access";
import { getAdminProducts } from "@/lib/supabase/products.admin.server";
import { getAdminSections } from "@/lib/supabase/sections.admin.server";
import AdminProductosClient from "./AdminProductosClient";

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

  const [{ products, total }, sections] = await Promise.all([
    getAdminProducts({ limit, offset }),
    getAdminSections(),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Log en desarrollo para debugging
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[AdminProductosPage] Productos cargados: ${products.length}, Total: ${total}`,
    );
  }

  return (
    <AdminProductosClient
      products={products}
      sections={sections}
      total={total}
      currentPage={page}
      totalPages={totalPages}
    />
  );
}

