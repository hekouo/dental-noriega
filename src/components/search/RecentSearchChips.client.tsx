"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, X } from "lucide-react";

const STORAGE_KEY = "ddn_recent_searches_v1";
const MAX_SEARCHES = 6;
const MIN_QUERY_LENGTH = 2;

/**
 * Obtiene búsquedas recientes desde localStorage
 */
function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const searches: string[] = JSON.parse(raw);
    return searches.filter((q) => q && q.trim().length >= MIN_QUERY_LENGTH);
  } catch {
    return [];
  }
}

/**
 * Guarda una búsqueda en el historial
 */
function saveRecentSearch(query: string): void {
  if (typeof window === "undefined") return;

  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return;

  try {
    const current = getRecentSearches();
    // Remover duplicados y agregar al inicio
    const filtered = current.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, MAX_SEARCHES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silenciar errores de localStorage
  }
}

type RecentSearchChipsProps = {
  onSearch?: (query: string) => void;
  className?: string;
};

export default function RecentSearchChips({
  onSearch,
  className = "",
}: RecentSearchChipsProps) {
  const router = useRouter();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Cargar búsquedas recientes al montar
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Exponer función para guardar búsqueda (usada desde fuera)
  const addSearch = useCallback((query: string) => {
    saveRecentSearch(query);
    setRecentSearches(getRecentSearches());
  }, []);

  // Exponer función para limpiar (usada desde fuera)
  const clearSearches = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentSearches([]);
    } catch {
      // noop
    }
  }, []);

  // Exponer funciones vía window para uso externo (opcional)
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { addRecentSearch?: (q: string) => void }).addRecentSearch =
        addSearch;
    }
  }, [addSearch]);

  const handleChipClick = (query: string) => {
    if (onSearch) {
      onSearch(query);
    } else {
      router.push(`/buscar?q=${encodeURIComponent(query)}`);
    }
  };

  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <Clock size={14} aria-hidden="true" />
          Búsquedas recientes:
        </p>
        <button
          type="button"
          onClick={clearSearches}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Limpiar búsquedas recientes"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recentSearches.map((search) => (
          <button
            key={search}
            type="button"
            onClick={() => handleChipClick(search)}
            className="px-3 py-1.5 bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-full text-sm text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[36px] inline-flex items-center justify-center"
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}

// Exportar función helper para uso externo
export function addRecentSearch(query: string): void {
  saveRecentSearch(query);
}

