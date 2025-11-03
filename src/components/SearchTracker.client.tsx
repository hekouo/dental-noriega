// src/components/SearchTracker.client.tsx
"use client";
import { useEffect } from "react";
import { trackSearch } from "@/lib/utils/analytics";

type Props = {
  query: string;
  resultsCount: number;
};

export default function SearchTracker({ query, resultsCount }: Props) {
  useEffect(() => {
    if (query.trim()) {
      trackSearch(query, resultsCount);
    }
  }, [query, resultsCount]);

  return null;
}
