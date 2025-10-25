// src/components/dev/WarmupTrigger.tsx
"use client";
import { useEffect } from "react";

export default function WarmupTrigger() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      fetch("/api/_warmup").catch(() => {});
    }
  }, []);
  return null;
}
