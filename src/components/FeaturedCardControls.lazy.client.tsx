"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

const skeletonButtonClass =
  "inline-flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2 text-white opacity-60 h-9";

function scheduleIdle(cb: () => void) {
  if (typeof window === "undefined") return undefined;
  const win = window as typeof window & {
    requestIdleCallback?: (
      cb: IdleRequestCallback,
      opts?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (win.requestIdleCallback) {
    const handle = win.requestIdleCallback(cb, { timeout: 500 });
    return () => win.cancelIdleCallback?.(handle);
  }

  const timeout = window.setTimeout(cb, 120);
  return () => window.clearTimeout(timeout);
}

async function loadControls() {
  const mod = await import("./FeaturedCardControls");
  return mod.default as ComponentType<{
    item: FeaturedItem;
    compact?: boolean;
  }>;
}

type LazyProps = {
  item: FeaturedItem;
  compact?: boolean;
};

export default function FeaturedCardControlsLazy({
  item,
  compact = false,
}: LazyProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [Controls, setControls] = useState<ComponentType<{
    item: FeaturedItem;
    compact?: boolean;
  }> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let cleanupIdle: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;

    const run = () => {
      if (!cancelled) {
        cleanupIdle?.();
        setReady(true);
      }
    };

    const node = containerRef.current;
    if (node && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            cleanupIdle = scheduleIdle(run);
            observer?.disconnect();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(node);
    } else {
      cleanupIdle = scheduleIdle(run);
    }

    return () => {
      cancelled = true;
      cleanupIdle?.();
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!ready || Controls) return;
    let mounted = true;
    loadControls().then((component) => {
      if (mounted) setControls(() => component);
    });
    return () => {
      mounted = false;
    };
  }, [ready, Controls]);

  const skeletonQty = (
    <div className="flex items-center rounded-lg border h-9 px-3 opacity-70">
      <span className="h-9 w-6 text-base font-medium flex items-center justify-center">
        –
      </span>
      <span className="w-10 text-center text-base">1</span>
      <span className="h-9 w-6 text-base font-medium flex items-center justify-center">
        +
      </span>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={compact ? "mt-2 space-y-2" : "mt-auto pt-3 space-y-2"}
    >
      {Controls ? (
        <Controls item={item} compact={compact} />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {skeletonQty}
            <button type="button" className={skeletonButtonClass} disabled>
              Agregar
            </button>
          </div>
          <span className="text-sm underline text-muted-foreground block opacity-60">
            Consultar por WhatsApp
          </span>
        </div>
      )}
    </div>
  );
}
