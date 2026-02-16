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
      className={`min-h-[56px] border-b border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 transition-shadow duration-200 motion-reduce:transition-none ${
        isScrolled ? "shadow-md" : "shadow-sm"
      }`}
      id="main-header"
      style={{ zIndex: 40 }}
    >
      {children}
    </header>
  );
}

