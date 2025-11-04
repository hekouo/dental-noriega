// src/components/SearchTracker.client.tsx
"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

type Props = {
  query: string;
  resultsCount: number;
};

export default function SearchTracker({ query, resultsCount }: Props) {
  useEffect(() => {
    if (query.trim() && resultsCount > 0) {
      track("search", {
        q: query,
        total: resultsCount,
      });
    }
  }, [query, resultsCount]);

  return null;
}
