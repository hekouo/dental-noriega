// src/components/ui/ImageWithFallback.tsx
/* eslint-disable jsx-a11y/alt-text */
"use client";
import { useState } from "react";

type Props = { src?: string; alt?: string; className?: string };

export default function ImageWithFallback({ src, alt = "", className }: Props) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={`bg-gray-100 text-gray-400 grid place-content-center ${className}`}
      >
        🦷
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}
