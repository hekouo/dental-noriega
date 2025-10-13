"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  offset?: number;
};

export default function FAB({ children, offset = 16 }: Props) {
  const [bottom, setBottom] = useState(offset);

  useEffect(() => {
    const onResize = () => {
      const safeB = Number(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--safe-b")
          .replace("px", "")
      ) || 0;
      
      // Heurística: teclado abierto si altura < 520px
      const kbOpen = window.innerHeight < 520;
      setBottom((kbOpen ? 8 : offset) + safeB);
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [offset]);

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom,
        zIndex: 50,
      }}
    >
      {children}
    </div>
  );
}

