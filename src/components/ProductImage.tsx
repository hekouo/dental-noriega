"use client";
import Image from "next/image";
import { normalizeImageUrl } from "@/lib/img/normalizeImageUrl";

type Props = {
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
};

export default function ProductImage({
  src,
  alt = "Producto",
  width = 512,
  height = 512,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: Props) {
  const url = normalizeImageUrl(src, Math.max(width, height));
  return (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (!img.src.endsWith("/images/fallback-product.png")) {
          img.src = "/images/fallback-product.png";
        }
      }}
      placeholder="empty"
    />
  );
}
