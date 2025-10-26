// src/components/ui/ImageWithFallback.tsx
/* eslint-disable jsx-a11y/alt-text */
"use client";
import { useState } from "react";
import Image from "next/image";
import { driveToLh3 } from "@/lib/utils/images";

type Props = {
  src?: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

export default function ImageWithFallback({
  src,
  alt = "",
  className,
  width = 300,
  height = 300,
}: Props) {
  const [useNativeImg, setUseNativeImg] = useState(false);
  const [errored, setErrored] = useState(false);

  const srcFixed = src ? driveToLh3(src) : undefined;

  if (!srcFixed || errored) {
    return (
      <div
        className={`bg-gray-100 text-gray-400 grid place-content-center ${className}`}
        style={{ width, height }}
      >
        🦷
      </div>
    );
  }

  if (useNativeImg) {
    return (
      <img
        src={srcFixed}
        alt={alt}
        className={className}
        width={width}
        height={height}
        onError={() => setErrored(true)}
        loading="lazy"
      />
    );
  }

  return (
    <Image
      src={srcFixed}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={() => setUseNativeImg(true)}
      loading="lazy"
    />
  );
}
