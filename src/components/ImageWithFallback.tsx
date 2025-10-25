"use client";
import { useState } from "react";
import Image from "next/image";

type Props = {
  src: string | undefined;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
};

export default function ImageWithFallback({
  src,
  alt,
  width,
  height,
  sizes = "(min-width: 768px) 33vw, 100vw",
  className = "",
  priority = false,
  placeholder = "empty",
  blurDataURL
}: Props) {
  const [useFallback, setUseFallback] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Si no hay src o hay error, usar fallback
  if (!src || imageError || useFallback) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-gray-400 text-center p-4">
          <div className="text-4xl mb-2">📷</div>
          <div className="text-sm">Imagen no disponible</div>
        </div>
      </div>
    );
  }

  try {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    );
  } catch (error) {
    // Si next/image falla, usar img nativo
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    );
  }
}
