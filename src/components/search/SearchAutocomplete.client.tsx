"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, X, Mic } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { formatMXN } from "@/lib/utils/money";
import { trackSearchEvent } from "@/lib/telemetry/searchTelemetry";
import SkeletonSearchItem from "@/components/skeletons/SkeletonSearchItem";
import { useVoiceSearch } from "@/lib/hooks/useVoiceSearch";
import { useToast } from "@/components/ui/ToastProvider.client";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

type SuggestItem = {
  id: string;
  title: string;
  slug: string;
  section_slug: string;
  image_url: string | null;
  price_cents: number | null;
};

type SearchAutocompleteProps = {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  initialQuery?: string;
  onSearch?: (query: string) => void;
};

export default function SearchAutocomplete({
  placeholder = "Buscar guantes, resina, brackets…",
  className = "",
  inputClassName = "",
  initialQuery = "",
  onSearch,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Voice search
  const { supported: voiceSupported, listening, start: startVoice, stop: stopVoice } = useVoiceSearch({
    onResult: (transcript: string) => {
      handleChange(transcript);
      // Trigger search suggestions (usa el mismo flujo que cuando tipeas)
      fetchSuggestions(transcript);
      // No auto-submit: solo llenar input y mostrar sugerencias
    },
    onError: (errorCode: string) => {
      let message = "No se pudo iniciar la búsqueda por voz";
      switch (errorCode) {
        case "not-allowed":
          message = "Permite el micrófono para usar búsqueda por voz";
          break;
        case "no-speech":
          message = "No se detectó voz, intenta otra vez";
          break;
        case "network":
          message = "Error de red, intenta más tarde";
          break;
        case "service-not-allowed":
          message = "El servicio de reconocimiento de voz no está disponible";
          break;
        default:
          message = "Error al usar búsqueda por voz";
      }
      showToast({
        message,
        variant: "error",
        durationMs: 3000,
      });
    },
  });

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch sugerencias
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Cancelar request anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(searchQuery.trim())}`,
        {
          signal: abortControllerRef.current.signal,
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data: SuggestItem[] = await res.json();
      setSuggestions(data);
      setIsOpen(data.length > 0);
      setActiveIndex(-1);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request cancelado, ignorar
        return;
      }
      console.warn("[SearchAutocomplete] Error fetching suggestions:", error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce input
  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);

      // Limpiar debounce anterior
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Nuevo debounce de 200ms
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 200);
    },
    [fetchSuggestions],
  );

  // Navegar a producto
  const navigateToProduct = useCallback(
    (item: SuggestItem) => {
      // Telemetría: track click en sugerencia
      trackSearchEvent("search_suggestion_click", {
        query: query.trim(),
        productId: item.id,
        slug: item.slug,
      });

      router.push(ROUTES.product(item.section_slug, item.slug));
      setIsOpen(false);
      setQuery(item.title);
    },
    [router, query],
  );

  // Navegar a búsqueda
  const navigateToSearch = useCallback(
    (searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;

      // Telemetría: track submit de búsqueda
      trackSearchEvent("search_submit", {
        query: trimmedQuery,
      });

      if (onSearch) {
        onSearch(trimmedQuery);
      } else {
        router.push(`/buscar?q=${encodeURIComponent(trimmedQuery)}`);
      }
      setIsOpen(false);
    },
    [router, onSearch],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && suggestions.length === 0) {
        if (e.key === "Enter") {
          e.preventDefault();
          navigateToSearch(query);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            navigateToProduct(suggestions[activeIndex]);
          } else if (query.trim()) {
            navigateToSearch(query);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, suggestions, activeIndex, query, navigateToProduct, navigateToSearch],
  );

  // Click outside para cerrar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Highlight match (simple)
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    // Escapar caracteres especiales del regex
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-primary-200 dark:bg-primary-900/50 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          size={20}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? "search-suggestions" : undefined}
          aria-label="Buscar productos"
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
          className={`w-full min-h-[44px] pl-10 pr-10 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${inputClassName}`}
        />
        {/* Voice search button */}
        {voiceSupported && (
          <button
            type="button"
            onClick={() => {
              if (listening) {
                stopVoice();
              } else {
                startVoice();
              }
            }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
              listening ? "text-red-600 dark:text-red-400" : ""
            }`}
            aria-label={listening ? "Detener búsqueda por voz" : "Buscar por voz"}
            aria-pressed={listening}
          >
            <Mic
              size={18}
              className={listening && !prefersReducedMotion ? "animate-pulse" : ""}
              aria-hidden="true"
            />
          </button>
        )}
        {query && !voiceSupported && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Limpiar búsqueda"
          >
            <X size={18} />
          </button>
        )}
        {query && voiceSupported && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Limpiar búsqueda"
          >
            <X size={18} />
          </button>
        )}
        {isLoading && query && (
          <div className={`absolute ${voiceSupported ? "right-20" : "right-10"} top-1/2 -translate-y-1/2`}>
            <Loader2 className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-card border border-border rounded-2xl shadow-lg max-h-[400px] overflow-y-auto"
        >
          {isLoading ? (
            <ul className="py-2" role="status" aria-live="polite" aria-label="Cargando sugerencias">
              {Array.from({ length: 5 }).map((_, index) => (
                <li key={index}>
                  <SkeletonSearchItem />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="py-2">
              {suggestions.map((item, index) => (
                <li key={item.id} role="option" aria-selected={activeIndex === index}>
                  <Link
                    href={ROUTES.product(item.section_slug, item.slug)}
                    onClick={() => {
                      navigateToProduct(item);
                    }}
                    id={`suggestion-${index}`}
                    className={`block px-4 py-3 hover:bg-muted transition-colors duration-150 ${
                      activeIndex === index ? "bg-muted" : ""
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
                  >
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-12 h-12 object-cover rounded border border-border flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {highlightMatch(item.title, query)}
                        </div>
                        {item.price_cents !== null && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatMXN(item.price_cents / 100)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

