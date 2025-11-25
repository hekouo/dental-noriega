"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore, selectCartCount } from "@/lib/store/cartStore";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function ToothAccountMenu() {
  const qty = useCartStore(selectCartCount);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const s = getBrowserSupabase();
    if (!s) return;

    s.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      // Migrar carrito cuando el usuario inicia sesión
      if (user?.id) {
        import("@/lib/cart/migrateToSupabase").then(({ migrateCartToSupabase }) => {
          migrateCartToSupabase(user.id).catch(() => {
            // Silenciar errores de migración para no interrumpir UX
          });
        });
      }
    });

    const {
      data: { subscription },
    } = s.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      // Migrar carrito cuando el usuario inicia sesión
      if (session?.user?.id) {
        const { migrateCartToSupabase } = await import("@/lib/cart/migrateToSupabase");
        migrateCartToSupabase(session.user.id).catch(() => {
          // Silenciar errores de migración
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const s = getBrowserSupabase();
    if (!s) return;
    await s.auth.signOut();
    setUser(null);
    router.push("/");
  };

  return (
    <div className="relative">
      {/* Badge carrito va a checkout */}
      {qty > 0 && (
        <button
          aria-label={`Carrito (${qty} ${qty === 1 ? "producto" : "productos"})`}
          onClick={() => (window.location.href = "/checkout")}
          className="absolute -right-2 -top-2 z-10 h-5 min-w-5 rounded-full px-1 text-xs
                     bg-rose-600 text-white shadow ring-1 ring-rose-900/40"
        >
          {qty}
        </button>
      )}

      {/* Botón principal: avatar o "Iniciar sesión" */}
      {user ? (
        <button
          aria-label="Mi cuenta"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg px-2 py-1 hover:bg-gray-50 transition"
        >
          <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
            {user.email?.[0]?.toUpperCase() || user.user_metadata?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <span className="hidden sm:inline-block ml-2 text-sm font-medium text-gray-700">
            Cuenta
          </span>
        </button>
      ) : (
        <Link
          href="/cuenta"
          className="inline-flex items-center rounded-full border border-blue-500 text-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-50 transition"
          aria-label="Iniciar sesión"
        >
          Iniciar sesión
        </Link>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-3 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 z-50"
          role="menu"
          aria-label="Menú de cuenta"
        >
          {user ? (
            <>
              <Link
                href="/cuenta/perfil"
                className="block rounded-xl px-3 py-2 hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Mi perfil
              </Link>
              <Link
                href="/cuenta/pedidos"
                className="block rounded-xl px-3 py-2 hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Mis pedidos
              </Link>
              <Link
                href="/cuenta/direcciones"
                className="block rounded-xl px-3 py-2 hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Mis direcciones
              </Link>
              <div className="my-1 border-t border-neutral-100" />
              <button
                className="w-full rounded-xl px-3 py-2 text-left hover:bg-neutral-50 transition-colors text-gray-700"
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
                role="menuitem"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/cuenta"
                className="block rounded-xl px-3 py-2 hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/cuenta?mode=register"
                className="block rounded-xl px-3 py-2 hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Crear cuenta
              </Link>
              <div className="my-1 border-t border-neutral-100" />
              <Link
                href="/cuenta/pedidos"
                className="block rounded-xl px-3 py-2 hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Buscar mis pedidos
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
