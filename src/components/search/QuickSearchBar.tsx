"use client";

import { useRouter } from "next/navigation";
import SearchAutocomplete from "./SearchAutocomplete.client";

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

  const handleChipClick = (term: string) => {
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      {/* Input de búsqueda con autocompletado */}
      <div className="mb-6">
        <SearchAutocomplete
          placeholder="Buscar guantes, resina, brackets…"
          initialQuery={initialQuery}
        />
      </div>

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

