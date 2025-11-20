import type { Metadata } from "next";
import DatosPageClient from "./ClientPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Datos de envío",
  description:
    "Completa tus datos de contacto y dirección de envío para finalizar tu pedido en Depósito Dental Noriega.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Datos de envío | Depósito Dental Noriega",
    description:
      "Completa tus datos de contacto y dirección de envío para finalizar tu pedido.",
    type: "website",
  },
};

export default function DatosPage() {
  return <DatosPageClient />;
}
