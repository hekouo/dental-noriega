import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server-auth";
import ClientPage from "./ClientPage";

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

export default async function Page() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si el usuario ya está autenticado, redirigir a direcciones
  if (user) {
    redirect("/cuenta/direcciones");
  }

  return (
    <Suspense fallback={null}>
      <ClientPage />
    </Suspense>
  );
}
