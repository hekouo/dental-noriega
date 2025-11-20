import { Suspense } from "react";
import type { Metadata } from "next";
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

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientPage />
    </Suspense>
  );
}
