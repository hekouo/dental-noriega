"use client";

import Image from "next/image";
import { useCheckoutStore } from "@/lib/store/checkoutStore";

type Props = {
  id: string;
  title: string;
  price: number;
  qty: number;
  selected: boolean;
  imageUrl?: string;
  variantId?: string | null;
};

export default function CheckoutItemRow({
  id,
  title,
  price,
  qty,
  selected,
  imageUrl,
  variantId,
}: Props) {
  const toggle = useCheckoutStore((s) => s.toggleCheckoutSelect);
  const setQty = useCheckoutStore((s) => s.setCheckoutQty);
  const remove = useCheckoutStore((s) => s.removeFromCheckout);

  const onToggle = () => toggle(id);
  const onQtyPlus = () => setQty(id, qty + 1);
  const onQtyMinus = () => setQty(id, Math.max(1, qty - 1));
  const onRemove = () => remove(id);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-3 border-b">
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 bg-neutral-100 rounded">
          <Image
            src={imageUrl || "/images/fallback-product.png"}
            alt={title}
            fill
            sizes="64px"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "/images/fallback-product.png";
            }}
          />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-neutral-500">#{variantId || "std"}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center border rounded">
          <button className="px-2" onClick={onQtyMinus}>
            -
          </button>
          <div className="px-3 tabular-nums">{qty}</div>
          <button className="px-2" onClick={onQtyPlus}>
            +
          </button>
        </div>
        <div className="w-24 text-right tabular-nums">
          ${(price * qty).toFixed(2)}
        </div>
        <button className="text-red-600" onClick={onRemove}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
