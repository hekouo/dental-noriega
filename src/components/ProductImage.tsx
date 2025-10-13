"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  resolved?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
};

export default function ProductImage({ src, resolved, alt, sizes, priority }: Props) {
  const [broken, setBroken] = useState(false);
  const finalSrc = broken ? "/img/products/placeholder.png" : (resolved || src);
  
  return (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes || "(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"}
      className="object-cover"
      onError={() => setBroken(true)}
    />
  );
}
