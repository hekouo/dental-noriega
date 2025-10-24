"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, X, Trash2 } from "lucide-react";
import { useCartStore, selectBadgeQty } from "@/lib/store/cartStore";
import { formatPrice } from "@/lib/utils/catalog";
import Link from "next/link";
import FAB from "@/components/FAB";

export default function CartBubble() {
  const count = useCartStore(selectBadgeQty);
  const [open, setOpen] = useState(false);

  return (
    <>
      <FAB offset={88}>
        {" "}
        {/* Más arriba que WhatsApp (16 + 56 + 16 = 88) */}
        <button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-xl flex items-center justify-center transition-all hover:scale-110"
          aria-label="Abrir carrito"
        >
          <ShoppingCart size={24} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 text-xs bg-white text-primary-700 font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow">
              {count}
            </span>
          )}
        </button>
      </FAB>

      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  useEffect(() => {
    document.body.classList.add("body-lock");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.classList.remove("body-lock");
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
        className="drawer absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col pb-safe"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="cart-title" className="text-lg font-semibold">
            Tu carrito
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar carrito"
            autoFocus
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="grow space-y-3 overflow-y-auto p-4">
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
              <p>Aún no agregas productos.</p>
            </div>
          )}

          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 border rounded-lg p-3"
            >
              <div className="h-16 w-16 bg-gray-100 rounded overflow-hidden relative flex-shrink-0">
                <img
                  src={
                    it.image ||
                    "/img/products/placeholder.png"
                  }
                  alt={it.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grow min-w-0">
                <p className="font-medium text-sm line-clamp-1">{it.title}</p>
                <p className="text-xs text-gray-500">{formatPrice(it.price)}</p>
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
                    onChange={(e) => updateQty(it.id, Number(e.target.value) || 1)}
                    className="w-16 border rounded px-2 py-1 text-sm min-h-[44px]"
                  />
                  <button
                    onClick={() => removeItem(it.id)}
                    className="ml-auto text-red-600 hover:bg-red-50 p-2 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Eliminar ${it.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-xl font-bold text-primary-600">
              {formatPrice(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-100 min-h-[44px]"
            >
              <span>Vaciar</span>
            </button>
            <Link
              href="/checkout"
              className="btn btn-primary px-4 py-2 rounded-lg text-sm flex-1 text-center"
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
