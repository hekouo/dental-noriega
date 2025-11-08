// src/components/SearchInput.client.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import buttonStyles from "@/components/ui/button.module.css";

export default function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

    // Nuevo debounce de 250ms
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        router.push(`/buscar?q=${encodeURIComponent(value.trim())}`);
      } else {
        router.push("/buscar");
      }
    }, 250);
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
    <form
      action="/buscar"
      method="GET"
      onSubmit={handleSubmit}
      className="flex gap-2"
    >
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          name="q"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          autoComplete="off"
          className="border rounded-lg px-10 py-3 w-full min-h-[44px]"
          placeholder="Buscar por nombre, descripción o categoría..."
          autoFocus
        />
      </div>
      <button className={`${buttonStyles.primary} px-6 py-3`} type="submit">
        <span>Buscar</span>
      </button>
    </form>
  );
}
