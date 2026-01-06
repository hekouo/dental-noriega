"use client";

import { useEffect } from "react";
import { trackSearchEvent } from "@/lib/telemetry/searchTelemetry";
import { addRecentSearch } from "@/components/search/RecentSearchChips.client";
import RecentSearchChips from "@/components/search/RecentSearchChips.client";

type BuscarClientProps = {
  query: string;
  hasResults: boolean;
  total: number;
};

export default function BuscarClient({
  query,
  hasResults,
  total,
}: BuscarClientProps) {
  // Trackear búsqueda sin resultados
  useEffect(() => {
    if (query && !hasResults && total === 0) {
      trackSearchEvent("search_no_results", { query });
    }
  }, [query, hasResults, total]);

  // Guardar búsqueda en recientes si hay query
  useEffect(() => {
    if (query && query.trim().length >= 2) {
      addRecentSearch(query);
    }
  }, [query]);

  return (
    <div className="mt-4">
      <RecentSearchChips />
    </div>
  );
}

