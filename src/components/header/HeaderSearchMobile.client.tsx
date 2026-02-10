"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import SearchAutocomplete from "@/components/search/SearchAutocomplete.client";
import RecentSearchChips from "@/components/search/RecentSearchChips.client";
import { addRecentSearch } from "@/components/search/RecentSearchChips.client";

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

export default function HeaderSearchMobile() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSearch = (query: string) => {
    addRecentSearch(query);
    setIsOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(query)}`);
  };

  const handleChipClick = (term: string) => {
    addRecentSearch(term);
    setIsOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  };

  // Cerrar con Esc
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevenir scroll del body cuando está abierto
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Click outside para cerrar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement)?.closest('[aria-label="Abrir búsqueda"]')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      {/* Botón para abrir */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir búsqueda"
        className="md:hidden p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus-premium rounded-lg"
      >
        <Search size={20} aria-hidden="true" />
      </button>

      {/* Panel móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Panel de búsqueda"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute inset-x-0 top-0 bg-background border-b border-border shadow-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-4">
              {/* Header del panel */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Buscar productos
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Cerrar búsqueda"
                  className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-premium rounded-lg"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Input de búsqueda */}
              <div className="mb-6">
                <SearchAutocomplete
                  placeholder="Buscar guantes, brackets, resinas…"
                  onSearch={handleSearch}
                />
              </div>

              {/* Búsquedas recientes */}
              <div className="mb-6">
                <RecentSearchChips onSearch={handleSearch} />
              </div>

              {/* Chips populares */}
              <div>
                <p className="text-xs text-muted-foreground mb-3 font-medium">
                  Más buscados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TERMS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleChipClick(term)}
                      className="px-4 py-2 bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-full text-sm text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus-premium min-h-[44px] inline-flex items-center justify-center tap-feedback"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

