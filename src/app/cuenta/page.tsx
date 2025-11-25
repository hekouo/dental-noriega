import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server-auth";
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
    return (
      <Suspense fallback={null}>
        <DashboardClient user={user} searchParams={params} />
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
