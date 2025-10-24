'use client';
import Link from 'next/link';
import { useCartStore, selectBadgeQty } from '@/lib/store/cartStore';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ToothAccountMenu() {
  const badge = useCartStore(selectBadgeQty);
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    const s = createClient();
    s.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Badge carrito */}
      <Link href="/checkout" className="relative inline-flex">
        <span className="sr-only">Ir al checkout</span>
        <span className="h-6 w-6 rounded-full bg-neutral-900/80 ring-1 ring-white/10 shadow"></span>
        {badge > 0 && (
          <span className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {badge}
          </span>
        )}
      </Link>

      {/* Muela 3D */}
      <div className="relative">
        <button
          aria-label="Cuenta"
          className={[
            'relative h-9 w-9 rounded-full',
            'bg-gradient-to-b from-white to-neutral-200',
            'shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_6px_14px_rgba(0,0,0,0.25)]',
            'ring-1 ring-neutral-300 hover:ring-neutral-400 active:translate-y-[1px] transition'
          ].join(' ')}
        >
          {/* "Muela" estilizada */}
          <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-5 w-5 text-neutral-700">
            <path fill="currentColor" d="M12 2c4 0 7 2.5 7 6.2 0 2.7-1.6 5.2-3.5 6.2-1.3.7-1.8 4.9-2.9 7-1.1-2.1-1.6-6.3-2.9-7C6.6 13.4 5 10.9 5 8.2 5 4.5 8 2 12 2z"/>
          </svg>
        </button>
        
        {/* Menú simple (sin dropdown por ahora) */}
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
          {user ? (
            <div className="py-2">
              <Link href="/cuenta" className="block px-4 py-2 text-sm hover:bg-gray-100">
                Mi cuenta
              </Link>
              <Link href="/cuenta/pedidos" className="block px-4 py-2 text-sm hover:bg-gray-100">
                Mis pedidos
              </Link>
              <Link href="/checkout" className="block px-4 py-2 text-sm hover:bg-gray-100">
                Checkout
              </Link>
              <hr className="my-2" />
              <button
                onClick={async () => {
                  const s = createClient();
                  await s.auth.signOut();
                  location.reload();
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="py-2">
              <Link href="/cuenta/login" className="block px-4 py-2 text-sm hover:bg-gray-100">
                Iniciar sesión
              </Link>
              <Link href="/cuenta/registro" className="block px-4 py-2 text-sm hover:bg-gray-100">
                Crear cuenta
              </Link>
              <hr className="my-2" />
              <Link href="/checkout" className="block px-4 py-2 text-sm hover:bg-gray-100">
                Ir a checkout
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
