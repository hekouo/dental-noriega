"use client";
import Image, { ImageProps } from "next/image";
import { useMemo, useState } from "react";
import { normalizeImageUrl } from "@/lib/utils/images";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string;
  fallbackSrc?: string;
  // opcional: forzar cuadrado en cards
  square?: boolean;
};

export default function ImageWithFallback({
  src,
  alt = "Producto",
  fallbackSrc = "/images/fallback-product.png",
  square = true,
  className,
  width = 512,
  height = 512,
  sizes,
  ...rest
}: Props) {
  const norm = useMemo(() => normalizeImageUrl(src), [src]);
  const [current, setCurrent] = useState<string>(norm ?? fallbackSrc);
  const [failed, setFailed] = useState<boolean>(!norm);

  const wrapperStyle = square ? { aspectRatio: "1 / 1" } : undefined;
  const resolvedSizes =
    sizes ?? "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";

  return (
    <div
      className={`relative w-full overflow-hidden ${square ? "aspect-square" : ""}`}
      style={wrapperStyle}
    >
      <Image
        src={current}
        alt={alt}
        width={Number(width)}
        height={Number(height)}
        sizes={resolvedSizes}
        // object-contain evita corte. Cambia a object-cover si prefieres recorte.
        className={`w-full h-auto object-contain ${className ?? ""}`}
        onError={() => {
          if (!failed) {
            setFailed(true);
            setCurrent(fallbackSrc);
            // Log útil para depurar en consola:
            // console.warn("Image fallback:", { src, normalized: norm });
          }
        }}
        {...rest}
      />
    </div>
  );
}
