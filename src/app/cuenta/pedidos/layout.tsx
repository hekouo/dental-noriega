import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis pedidos",
  description:
    "Consulta el estado de tus pedidos, historial de compras y detalles de cada orden en Depósito Dental Noriega.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Mis pedidos | Depósito Dental Noriega",
    description:
      "Consulta el estado de tus pedidos, historial de compras y detalles de cada orden.",
    type: "website",
  },
};

export default function PedidosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

