import { Suspense } from "react";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server-auth";
import { checkAdminAccess } from "@/lib/admin/access";
import ClientPage from "./ClientPage";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Mi cuenta",
  description:
    "Gestiona tu cuenta, consulta tus pedidos, direcciones y puntos de lealtad en Depósito Dental Noriega.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Mi cuenta | Depósito Dental Noriega",
    description:
      "Gestiona tu cuenta, consulta tus pedidos, direcciones y puntos de lealtad.",
    type: "website",
  },
};

type PageProps = {
  searchParams: Promise<{ verified?: string; error?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;

  // Si el usuario está autenticado, mostrar dashboard
  if (user) {
    // Verificar si el usuario es admin (sin redirigir, solo para mostrar el link)
    const adminAccess = await checkAdminAccess();
    const isAdmin = adminAccess.status === "allowed";

    return (
      <Suspense fallback={null}>
        <DashboardClient
          user={user}
          searchParams={params}
          isAdmin={isAdmin}
        />
      </Suspense>
    );
  }

  // Si no está autenticado, mostrar formularios de login/registro
  return (
    <Suspense fallback={null}>
      <ClientPage searchParams={params} />
    </Suspense>
  );
}
