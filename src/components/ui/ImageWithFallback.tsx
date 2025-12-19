"use client";
import Image, { ImageProps } from "next/image";
import { useMemo, useState, useEffect } from "react";
import { normalizeImageUrl } from "@/lib/utils/images";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt: string; // Obligatorio
  fallbackSrc?: string;
  // opcional: forzar cuadrado en cards
  square?: boolean;
};

export default function ImageWithFallback({
  src,
  alt,
  fallbackSrc = "/images/fallback-product.png",
  square = true,
  className,
  width = 512,
  height = 512,
  sizes,
  loading,
  priority = false,
  ...rest
}: Props) {
  const norm = useMemo(() => normalizeImageUrl(src), [src]);
  const [current, setCurrent] = useState<string>(norm ?? fallbackSrc);
  const [failed, setFailed] = useState<boolean>(!norm);

  // Resetear estado cuando cambia src para permitir reintentos
  useEffect(() => {
    const normalized = normalizeImageUrl(src);
    setCurrent(normalized ?? fallbackSrc);
    setFailed(!normalized);
  }, [src, fallbackSrc]);

  const wrapperStyle = square ? { aspectRatio: "1 / 1" } : undefined;
  const resolvedSizes =
    sizes ?? "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";
  // Si priority es true, no usar loading (undefined). Si no, usar loading explícito o "lazy" por defecto
  const resolvedLoading = priority ? undefined : (loading ?? "lazy");

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
        loading={resolvedLoading}
        priority={priority}
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
