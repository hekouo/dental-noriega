import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Revisa y completa tu pedido en Depósito Dental Noriega",
  robots: { index: false, follow: true },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

