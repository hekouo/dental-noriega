"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  useCartStore,
  selectCartItems,
  selectCartCount,
} from "@/lib/store/cartStore";
import { formatMXN } from "@/lib/utils/currency";
import Link from "next/link";
import FAB from "@/components/FAB";
import safeAreaStyles from "@/components/ui/safe-area.module.css";
import { buttonPrimary } from "@/lib/styles/button";

const CartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx={9} cy={21} r={1} />
    <circle cx={20} cy={21} r={1} />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <line x1={18} y1={6} x2={6} y2={18} />
    <line x1={6} y1={6} x2={18} y2={18} />
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M14 10v6" />
    <path d="M10 10v6" />
    <path d="M15 6V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2" />
  </svg>
);

function CartDrawer({ onClose }: { onClose: () => void }) {
  const cartItems = useCartStore(selectCartItems);
  const setCartQty = useCartStore((state) => state.setCartQty);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouch;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col overscroll-contain ${safeAreaStyles.pbSafe}`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="cart-title" className="text-lg font-semibold">
            Tu carrito
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Cerrar carrito"
            autoFocus
            type="button"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <div className="grow space-y-3 overflow-y-auto p-4">
          {cartItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <CartIcon
                width={48}
                height={48}
                className="mx-auto mb-4 opacity-30"
              />
              <p>Aún no agregas productos.</p>
            </div>
          )}

          {cartItems.map((it) => {
            const imageSrc =
              it.image_url && it.image_url.length > 0
                ? it.image_url
                : "/img/products/placeholder.png";
            return (
              <div
                key={it.id}
                className="flex items-center gap-3 border rounded-lg p-3"
              >
                <div className="relative h-16 w-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={imageSrc}
                    alt={it.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="grow min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{it.title}</p>
                  <p className="text-xs text-gray-500">{formatMXN(it.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <label
                      htmlFor={`qty-${it.id}`}
                      className="text-xs text-gray-600"
                    >
                      Cant:
                    </label>
                    <input
                      id={`qty-${it.id}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={it.qty}
                      onChange={(e) =>
                        setCartQty(
                          it.id,
                          it.variantId,
                          Number(e.target.value) || 1,
                        )
                      }
                      aria-label={`Cantidad de ${it.title}`}
                      className="w-16 border rounded px-2 py-1 text-sm min-h-[44px]"
                    />
                    <button
                      onClick={() => removeFromCart(it.id, it.variantId)}
                      className="ml-auto text-red-600 hover:bg-red-50 p-2 rounded min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label={`Eliminar ${it.title}`}
                      type="button"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-xl font-bold text-primary-600">
              {formatMXN(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              aria-label="Vaciar carrito"
              className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-100 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              type="button"
            >
              <span>Vaciar</span>
            </button>
            <Link
              href="/checkout"
              className={`${buttonPrimary} flex-1 px-4 py-2 text-center`}
              onClick={onClose}
            >
              <span>Continuar</span>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

// Componente condicional que solo se monta si hay items o tras interacción
// Solo se muestra si el carrito está vacío (si tiene items, se muestra CartSticky)
export default function CartBubble() {
  const count = useCartStore(selectCartCount);
  const [open, setOpen] = useState(false);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    // Si hay items, NO montar este componente (CartSticky se encargará)
    if (count > 0) {
      setShouldMount(false);
      return;
    }

    // Si no hay items, montar tras interacción o requestIdleCallback
    if (typeof window === "undefined") return;

    const scheduleMount = () => {
      if (typeof window.requestIdleCallback !== "undefined") {
        window.requestIdleCallback(() => setShouldMount(true), {
          timeout: 2000,
        });
      } else {
        setTimeout(() => setShouldMount(true), 2000);
      }
    };

    // Montar tras primera interacción
    const events = ["mousedown", "touchstart", "keydown"] as const;
    const handlers = events.map((event) => {
      const handler = () => {
        setShouldMount(true);
        events.forEach((e) =>
          window.removeEventListener(e, handlers[events.indexOf(e)]),
        );
      };
      window.addEventListener(event, handler, { once: true, passive: true });
      return handler;
    });

    // Fallback: montar tras idle
    scheduleMount();

    return () => {
      events.forEach((event, idx) => {
        window.removeEventListener(event, handlers[idx]);
      });
    };
  }, [count]);

  // No mostrar si hay items (CartSticky se encargará)
  if (count > 0 || !shouldMount) return null;

  return (
    <>
      <FAB offset={88}>
        <button
          onClick={() => setOpen(true)}
          className="relative h-14 w-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-xl flex items-center justify-center transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Abrir carrito"
          type="button"
        >
          <CartIcon width={24} height={24} />
        </button>
      </FAB>

      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}
