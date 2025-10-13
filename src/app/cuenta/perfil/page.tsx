// src/app/cuenta/perfil/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function PerfilPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cuenta"); // si no hay sesión, regresa al login
  }

  const fullName =
    (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.fullName)) || "";
  const phone =
    (user.user_metadata && (user.user_metadata.phone || user.user_metadata.telefono)) || "";

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="text-gray-600">Gestiona tu cuenta y tus datos de contacto.</p>
      </header>

      <section className="rounded-xl border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Correo</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Nombre</span>
          <span className="font-medium">{fullName || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Teléfono</span>
          <span className="font-medium">{phone || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">ID de usuario</span>
          <span className="font-mono text-sm">{user.id}</span>
        </div>
      </section>

      <section className="text-sm text-gray-600">
        <p>
          Próximo: direcciones guardadas, pedidos y puntos. Tranquilo, Roma no se codificó en un día.
        </p>
      </section>
    </main>
  );
}
