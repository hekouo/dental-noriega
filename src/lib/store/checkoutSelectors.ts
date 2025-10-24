import { useCheckoutStore } from "./checkoutStore";

export const useSelectedIds = () => {
  const checkoutItems = useCheckoutStore((s) => s.checkoutItems);
  return checkoutItems.filter((i) => i.selected).map((i) => i.id);
};

export const useSelectedCount = () =>
  useCheckoutStore((s) =>
    s.checkoutItems.reduce((a, i) => a + (i.selected ? 1 : 0), 0),
  );

export const useSelectedTotal = () =>
  useCheckoutStore((s) =>
    s.checkoutItems.reduce(
      (a, i) => a + (i.selected ? (i.price ?? 0) * (i.qty ?? 1) : 0),
      0,
    ),
  );

export const useHasSelected = () =>
  useCheckoutStore((s) => s.checkoutItems.some((i) => i.selected));
