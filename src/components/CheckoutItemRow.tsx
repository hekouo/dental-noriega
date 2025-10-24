"use client";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useShallow } from "zustand/react/shallow";
import ProductImage from "./ProductImage";

type Props = {
  id: string;
};

function useRowState(id: string) {
  return useCheckoutStore(
    useShallow((s) => {
      const item = s.checkoutItems.find((it) => it.id === id);
      return {
        qty: item?.qty ?? 1,
        selected: !!item?.selected,
        price: item?.price ?? 0,
        title: item?.title ?? "",
        imageUrl: item?.imageUrl ?? null,
        variantId: item?.variantId ?? null,
        remove: s.removeFromCheckout,
        setQty: s.setCheckoutQty,
        toggle: s.toggleCheckoutSelect,
      };
    }),
  );
}

export default function CheckoutItemRow({ id }: Props) {
  const {
    qty,
    selected,
    price,
    title,
    imageUrl,
    variantId,
    remove,
    setQty,
    toggle,
  } = useRowState(id);

  const onToggle = () => toggle(id);
  const onQtyPlus = () => setQty(id, qty + 1);
  const onQtyMinus = () => setQty(id, Math.max(1, qty - 1));
  const onRemove = () => remove(id);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-3 border-b">
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 bg-neutral-100 rounded">
          <ProductImage
            src={imageUrl}
            alt={title}
            width={64}
            height={64}
            sizes="64px"
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
