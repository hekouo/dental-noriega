// src/components/ProductViewTracker.client.tsx
"use client";
import { useEffect } from "react";
import { trackViewItem } from "@/lib/utils/analytics";
import { mxnFromCents } from "@/lib/utils/currency";

type Props = {
  productId: string;
  productName: string;
  priceCents: number;
};

export default function ProductViewTracker({
  productId,
  productName,
  priceCents,
}: Props) {
  useEffect(() => {
    trackViewItem({
      id: productId,
      name: productName,
      price: mxnFromCents(priceCents),
    });
  }, [productId, productName, priceCents]);

  return null;
}
