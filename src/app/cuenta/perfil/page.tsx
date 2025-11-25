// src/app/cuenta/perfil/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server-auth";
import EmailVerificationBanner from "@/components/account/EmailVerificationBanner";
import AccountInfoBanner from "@/components/account/AccountInfoBanner";
import AccountSectionHeader from "@/components/account/AccountSectionHeader";
import EditProfileForm from "./EditProfileForm";

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
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tu cuenta y tus datos de contacto.
        </p>
      </header>

      <AccountSectionHeader
        user={{ email: user.email, fullName }}
        currentSection="perfil"
      />

      {user.email && (
        <EmailVerificationBanner
          email={user.email}
          isVerified={isEmailVerified}
        />
      )}

      <AccountInfoBanner showVerified={showVerified} />

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Datos de cuenta
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Correo</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {user.email}
                </span>
                {isEmailVerified ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pendiente de verificación
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Nombre</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {fullName || (
                  <span className="text-gray-400">Sin nombre todavía</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Teléfono</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {phone || <span className="text-gray-400">No registrado</span>}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">ID de usuario</span>
              <p className="font-mono text-xs text-gray-600 mt-1">{user.id}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Editar perfil
          </h2>
          <EditProfileForm
            initialFullName={fullName}
            initialPhone={phone}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Accesos rápidos
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cuenta/direcciones"
              className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition text-gray-700"
            >
              Mis direcciones
            </Link>
            <Link
              href="/cuenta/pedidos"
              className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition text-gray-700"
            >
              Mis pedidos
            </Link>
            <Link
              href="/cuenta/puntos"
              className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition text-gray-700"
            >
              Ver puntos de lealtad
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
