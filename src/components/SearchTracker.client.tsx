// src/components/SearchTracker.client.tsx
"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

type Props = {
  query: string;
  resultsCount: number;
};

export default function SearchTracker({ query, resultsCount }: Props) {
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    // Solo trackear una vez por query
    if (
      trimmedQuery &&
      resultsCount > 0 &&
      trackedRef.current !== trimmedQuery
    ) {
      trackedRef.current = trimmedQuery;
      track("search", {
        q: trimmedQuery,
        total: resultsCount,
      });
    }
  }, [query, resultsCount]);

  return null;
}
