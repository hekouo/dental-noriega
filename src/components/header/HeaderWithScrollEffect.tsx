"use client";

import { useHeaderScroll } from "./HeaderScrollEffect";

/**
 * Wrapper del header que agrega efecto de scroll
 * Mantiene toda la estructura del header original
 */
export function HeaderWithScrollEffect({
  children,
}: {
  children: React.ReactNode;
}) {
  const isScrolled = useHeaderScroll();

  return (
    <header
      className={`border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-200 ${
        isScrolled ? "shadow-md" : "shadow-sm"
      }`}
      id="main-header"
      style={{ zIndex: 40 }}
    >
      {children}
    </header>
  );
}

