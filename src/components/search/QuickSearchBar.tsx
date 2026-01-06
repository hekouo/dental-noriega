"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const POPULAR_TERMS = [
  "guantes",
  "brackets",
  "resina",
  "anestesia",
  "algodon",
  "mascarillas",
  "ácido grabador",
  "limas",
];

type QuickSearchBarProps = {
  initialQuery?: string;
};

export default function QuickSearchBar({ initialQuery = "" }: QuickSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/buscar");
    }
  };

  const handleChipClick = (term: string) => {
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      {/* Input de búsqueda */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={20}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar guantes, resina, brackets…"
            autoComplete="off"
            className="w-full min-h-[44px] pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            aria-label="Buscar productos"
          />
        </div>
      </form>

      {/* Chips populares */}
      <div>
        <p className="text-xs text-muted-foreground mb-3 font-medium">Más buscados:</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TERMS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleChipClick(term)}
              className="px-4 py-2 bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-full text-sm text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] inline-flex items-center justify-center"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

