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
      const kbOpen = window.innerHeight < 520;
      setBottom(kbOpen ? 8 : offset);
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
        bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`,
        zIndex: 50,
      }}
    >
      {children}
    </div>
  );
}
