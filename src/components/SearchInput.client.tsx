// src/components/SearchInput.client.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

type SearchInputProps = {
  sticky?: boolean;
};

export default function SearchInput({ sticky = false }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup debounce al desmontar
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);

    // Limpiar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim()) {
      setIsSearching(true);
    }

    // Nuevo debounce de 250ms
    debounceRef.current = setTimeout(() => {
      setIsSearching(false);
      if (value.trim()) {
        router.push(`/buscar?q=${encodeURIComponent(value.trim())}`);
      } else {
        router.push("/buscar");
      }
    }, 250);
  };

  const handleClear = () => {
    setQuery("");
    setIsSearching(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    router.push("/buscar");
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/buscar");
    }
  };

  return (
    <div className={sticky ? "sticky top-0 z-10 bg-white pb-2 pt-2 -mx-4 px-4 sm:static sm:pb-0 sm:pt-0 sm:mx-0 sm:px-0" : ""}>
      <form
        action="/buscar"
        method="GET"
        onSubmit={handleSubmit}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            size={20}
          />
          <input
            ref={inputRef}
            name="q"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            autoComplete="off"
            className="w-full min-h-[44px] pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="Buscar por nombre, descripción o categoría..."
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Limpiar búsqueda"
            >
              <X size={18} />
            </button>
          )}
          {isSearching && !query && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            </div>
          )}
        </div>
        <button 
          className="btn btn-primary px-6 py-3 rounded-lg transition-all hover:scale-105 active:scale-95" 
          type="submit"
        >
          <span>Buscar</span>
        </button>
      </form>
    </div>
  );
}
