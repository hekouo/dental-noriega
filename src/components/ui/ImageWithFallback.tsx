"use client";
import Image, { ImageProps } from "next/image";
import { useMemo, useState } from "react";
import { normalizeImageUrl } from "@/lib/utils/images";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string;
  fallbackSrc?: string;
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
  ...rest
}: Props) {
  const norm = useMemo(() => normalizeImageUrl(src), [src]);
  const [current, setCurrent] = useState<string>(norm ?? fallbackSrc);
  const [failed, setFailed] = useState<boolean>(!norm);

  return (
    <div
      className={`relative w-full ${square ? "aspect-square" : ""} bg-white overflow-hidden`}
    >
      <Image
        key={current}
        src={current}
        alt={alt}
        width={Number(width)}
        height={Number(height)}
        className={`w-full h-full object-contain ${className ?? ""}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (!failed) {
            setFailed(true);
            setCurrent(fallbackSrc);
          }
        }}
        {...rest}
      />
    </div>
  );
}
