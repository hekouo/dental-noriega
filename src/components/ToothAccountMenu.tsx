"use client";
import { useState } from "react";
import { User2 } from "lucide-react";
import Link from "next/link";
import { useCartStore, selectBadgeQty } from "@/lib/store/cartStore";

export function ToothAccountMenu() {
  const qty = useCartStore(selectBadgeQty);
  const [open, setOpen] = useState(false);
  const [toothOk, setToothOk] = useState(true);

  return (
    <div className="relative">
      {/* Badge carrito va a checkout */}
      <button
        aria-label="Ir a checkout"
        onClick={() => (window.location.href = "/checkout")}
        className="absolute -right-2 -top-2 z-10 h-5 min-w-5 rounded-full px-1 text-xs
                   bg-rose-600 text-white shadow ring-1 ring-rose-900/40"
      >
        {qty}
      </button>

      {/* Botón principal: muela o fallback persona */}
      <button
        aria-label="Cuenta"
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 w-10 rounded-full
                   bg-gradient-to-b from-white to-neutral-200
                   shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),0_8px_18px_rgba(0,0,0,0.20)]
                   ring-1 ring-neutral-300 hover:ring-neutral-400 active:translate-y-[1px] transition"
      >
        {toothOk ? (
          <svg
            viewBox="0 0 128 128"
            className="absolute inset-0 m-auto h-7 w-7 text-neutral-700"
            onError={() => setToothOk(false)}
          >
            {/* Corona con "raíces", proporciones reales de molar */}
            <defs>
              <radialGradient id="toothShade" cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#eaeaea" />
                <stop offset="100%" stopColor="#d9d9d9" />
              </radialGradient>
            </defs>
            <path
              fill="url(#toothShade)"
              d="M64 10c24 0 46 14 46 36 0 18-10 32-22 38-5 2.5-8.5 20-14 34-5.5-14-9-31.5-14-34C48 78 34 64 34 46 34 24 50 10 64 10z"
            />
            {/* Hendidura central */}
            <path
              d="M64 22c10 0 18 6 18 14 0 6-4 10-9 12"
              stroke="#c7c7c7"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <User2 className="absolute inset-0 m-auto h-6 w-6 text-neutral-700" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5">
          <Link
            href="/account"
            className="block rounded-xl px-3 py-2 hover:bg-neutral-50"
          >
            Mi cuenta
          </Link>
          <Link
            href="/orders"
            className="block rounded-xl px-3 py-2 hover:bg-neutral-50"
          >
            Mis pedidos
          </Link>
          <Link
            href="/checkout"
            className="block rounded-xl px-3 py-2 hover:bg-neutral-50"
          >
            Ir a checkout
          </Link>
          <button
            className="mt-1 w-full rounded-xl px-3 py-2 text-left hover:bg-neutral-50"
            onClick={() => {
              /* logout real aquí */
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
