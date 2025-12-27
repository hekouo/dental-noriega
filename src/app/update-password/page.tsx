import type { Metadata } from "next";
import UpdatePasswordClient from "./UpdatePasswordClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Actualizar contraseña",
  description: "Actualiza tu contraseña de Depósito Dental Noriega",
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient />;
}
