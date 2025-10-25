"use client";
import { useEffect } from "react";

export default function WarmupTrigger() {
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      try {
        const res = await fetch("/api/warmup", { cache: "no-store" });
        if (!aborted && res.ok && process.env.NEXT_PUBLIC_DEBUG === "1") {
          // eslint-disable-next-line no-console
          console.log("[warmup] ok");
        }
      } catch {
        // silencio zen
      }
    };
    run();
    return () => {
      aborted = true;
    };
  }, []);

  return null;
}
