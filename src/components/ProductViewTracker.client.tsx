// src/components/ProductViewTracker.client.tsx
"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics";
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
    track("view_item", {
      id: productId,
      name: productName,
      price: mxnFromCents(priceCents),
    });
  }, [productId, productName, priceCents]);

  return null;
}
