// src/components/SearchTracker.client.tsx
"use client";

import { useEffect, useRef } from "react";
import { trackSearchPerformed } from "@/lib/analytics/events";

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
      trackedRef.current !== trimmedQuery
    ) {
      trackedRef.current = trimmedQuery;
      trackSearchPerformed({
        query: trimmedQuery,
        resultsCount,
        hasResults: resultsCount > 0,
      });
    }
  }, [query, resultsCount]);

  return null;
}
