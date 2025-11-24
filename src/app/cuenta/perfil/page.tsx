// src/app/cuenta/perfil/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server-auth";
import EmailVerificationBanner from "@/components/account/EmailVerificationBanner";
import AccountInfoBanner from "@/components/account/AccountInfoBanner";

export const dynamic = "force-dynamic";

type PerfilPageProps = {
  searchParams: Promise<{ verified?: string }>;
};

export default async function PerfilPage({
  searchParams,
}: PerfilPageProps) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cuenta"); // si no hay sesión, regresa al login
  }

  const fullName =
    (user.user_metadata &&
      (user.user_metadata.full_name || user.user_metadata.fullName)) ||
    "";
  const phone =
    (user.user_metadata &&
      (user.user_metadata.phone || user.user_metadata.telefono)) ||
    "";

  const isEmailVerified = !!user.email_confirmed_at;
  const params = await searchParams;
  const showVerified = params.verified === "1";

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="text-gray-600">
          Gestiona tu cuenta y tus datos de contacto.
        </p>
      </header>

      {user.email && (
        <EmailVerificationBanner
          email={user.email}
          isVerified={isEmailVerified}
        />
      )}

      <AccountInfoBanner showVerified={showVerified} />

      <section className="rounded-xl border border-gray-200 p-6 space-y-4 bg-white">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Correo</span>
            <span className="text-sm font-medium text-gray-900">
              {user.email}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Nombre</span>
            <span className="text-sm font-medium text-gray-900">
              {fullName || "Sin nombre todavía"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Teléfono</span>
            <span className="text-sm font-medium text-gray-900">
              {phone || "No registrado"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">ID de usuario</span>
            <span className="font-mono text-xs text-gray-600">{user.id}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Enlaces principales
        </h2>
        <div className="space-y-2">
          <Link
            href="/cuenta/pedidos"
            className="block px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/cuenta/direcciones"
            className="block px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
          >
            Mis direcciones
          </Link>
          <Link
            href="/cuenta/puntos"
            className="block px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
          >
            Mis puntos de lealtad
          </Link>
        </div>
      </section>

      <section className="text-sm text-gray-600">
        <p>
          Próximo: direcciones guardadas, pedidos y puntos. Tranquilo, Roma no
          se codificó en un día.
        </p>
      </section>
    </main>
  );
}
