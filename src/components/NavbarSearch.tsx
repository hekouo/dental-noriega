// src/components/NavbarSearch.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Link from "next/link";
import buttonStyles from "@/components/ui/button.module.css";

type SearchResult = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents: number;
};

export default function NavbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Mantener query cuando vuelves desde PDP
  useEffect(() => {
    if (pathname === "/buscar") {
      const q = searchParams?.get("q") || "";
      if (q && !value) {
        setValue(q);
      }
    }
  }, [pathname, searchParams, value]);

  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(query)}&page=1`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setResults((data.items || []).slice(0, 5)); // Limitar a 5 resultados
      setIsOpen(data.items?.length > 0);
      setActiveIndex(-1);
    } catch (e) {
      console.warn("[NavbarSearch] Error:", e);
      setResults([]);
      setIsOpen(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setIsOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }, [value, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          // Navegar al resultado activo
          const item = results[activeIndex];
          setIsOpen(false);
          router.push(`/catalogo/${item.section}/${item.product_slug}`);
        } else {
          // Buscar normalmente
          handleSearch();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    },
    [activeIndex, results, handleSearch, router],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      // Debounce 250ms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchResults(newValue);
      }, 250);
    },
    [fetchResults],
  );

  // Scroll al elemento activo
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[
        activeIndex
      ] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeIndex]);

  return (
    <div className="relative flex items-center gap-2 flex-1 max-w-md">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            // Delay para permitir clicks en resultados
            setTimeout(() => setIsOpen(false), 200);
          }}
          placeholder="Buscar productos…"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? "search-results-list" : undefined}
          aria-label="Buscar productos"
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full min-h-[44px]"
        />
        {isOpen && results.length > 0 && (
          <ul
            ref={listRef}
            id="search-results-list"
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto"
          >
            {results.map((item, idx) => (
              <li
                key={item.id}
                id={`search-result-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                  idx === activeIndex ? "bg-gray-100" : ""
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <Link
                  href={`/catalogo/${item.section}/${item.product_slug}`}
                  className="block"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {item.section.replace(/-/g, " ")}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={handleSearch}
        disabled={!value.trim()}
        type="button"
        aria-label="Buscar"
        className={`${buttonStyles.primary} gap-2 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Search size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Buscar</span>
      </button>
    </div>
  );
}
