// src/components/NavbarSearch.tsx
"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function NavbarSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }, [value, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      // Debounce para habilitar botón (300ms)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setIsEnabled(newValue.trim().length > 0);
      }, 300);
    },
    [],
  );

  return (
    <div className="flex items-center gap-2 flex-1 max-w-md">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Buscar productos…"
          autoComplete="off"
          role="searchbox"
          aria-label="Buscar productos"
          className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full min-h-[44px]"
        />
      </div>
      <button
        onClick={handleSearch}
        disabled={!isEnabled}
        type="button"
        aria-label="Buscar"
        className="btn btn-primary px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        <Search size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Buscar</span>
      </button>
    </div>
  );
}

