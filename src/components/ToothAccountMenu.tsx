"use client";
import Link from "next/link";
import { useCartStore, selectBadgeQty } from "@/lib/store/cartStore";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ToothAccountMenu() {
  const badge = useCartStore(selectBadgeQty);
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    const s = createClient();
    s.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Badge carrito - clic redirige a /checkout */}
      <Link href="/checkout" className="relative inline-flex">
        <span className="sr-only">Ir al checkout</span>
        <span className="h-6 w-6 rounded-full bg-neutral-900/80 ring-1 ring-white/10 shadow"></span>
        {badge > 0 && (
          <span className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {badge}
          </span>
        )}
      </Link>

      {/* Muela 3D - clic abre menú de cuenta */}
      <div className="relative">
        <button
          aria-label="Cuenta"
          className="relative h-9 w-9 rounded-full
            bg-gradient-to-b from-white to-neutral-200
            shadow-[inset_0_2px_4px_rgba(255,255,255,0.85),0_6px_14px_rgba(0,0,0,0.20)]
            ring-1 ring-neutral-300 hover:ring-neutral-400 active:translate-y-[1px] transition"
        >
          {/* Muela mejorada */}
          <svg
            viewBox="0 0 64 64"
            className="absolute inset-0 m-auto h-6 w-6 text-neutral-700"
          >
            <path
              fill="currentColor"
              d="M32 6c12 0 22 7 22 18 0 8-4.9 15.2-10.6 18.1-3.9 2-5.4 14.2-8.6 20.9-3.2-6.7-4.7-18.9-8.6-20.9C14.9 39.2 10 32 10 24 10 13 20 6 32 6z"
            />
          </svg>
        </button>

        {/* Menú dropdown */}
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
          {user ? (
            <div className="py-2">
              <Link
                href="/cuenta"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Mi cuenta
              </Link>
              <Link
                href="/cuenta/pedidos"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Mis pedidos
              </Link>
              <Link
                href="/checkout"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Checkout
              </Link>
              <hr className="my-2" />
              <button
                onClick={async () => {
                  const s = createClient();
                  await s.auth.signOut();
                  // No usar location.reload() en useEffect, solo en onClick
                  window.location.href = "/";
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="py-2">
              <Link
                href="/cuenta/login"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/cuenta/registro"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Crear cuenta
              </Link>
              <hr className="my-2" />
              <Link
                href="/checkout"
                className="block px-4 py-2 text-sm hover:bg-gray-100"
              >
                Ir a checkout
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
