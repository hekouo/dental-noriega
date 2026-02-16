"use client";

import Image from "next/image";

/**
 * Logo desde /brand/...
 * variant: horizontal (DDN + wordmark) | mark (solo DDN)
 * size: sm ~24px | md ~24-28px (header) | lg ~36-44px (hero)
 */
type LogoProps = {
  variant?: "horizontal" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizePx = {
  sm: 24,
  md: 28,
  lg: 40,
};

export default function Logo({
  variant = "horizontal",
  size = "md",
  className = "",
}: LogoProps) {
  const h = sizePx[size];
  const src =
    variant === "mark"
      ? "/brand/ddn-mark.png"
      : "/brand/ddn-logo-horizontal.png";
  const alt = "Depósito Dental Noriega";

  const w = variant === "mark" ? h : Math.round(h * 4.5);

  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      className={`object-contain ${className}`}
      style={{ height: h, width: "auto" }}
      priority
    />
  );
}
