import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Recupera tu contraseña de Depósito Dental Noriega",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
