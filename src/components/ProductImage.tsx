"use client";

import Image from "next/image";

type Props = {
  src: string;
  resolved?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
};

export default function ProductImage({
  src,
  resolved,
  alt,
  sizes,
  priority,
}: Props) {
  const finalSrc = resolved || src;

  return (
    <Image
      src={finalSrc}
      alt={alt ?? "Producto"}
      width={512}
      height={512}
      priority={priority ?? false}
      sizes={
        sizes ||
        "(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
      }
      className="object-cover"
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (img.src.endsWith("/images/fallback-product.png")) return;
        img.src = "/images/fallback-product.png";
      }}
    />
  );
}
