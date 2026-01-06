"use client";

import { useRouter } from "next/navigation";
import SearchAutocomplete from "@/components/search/SearchAutocomplete.client";
import { addRecentSearch } from "@/components/search/RecentSearchChips.client";

type HeaderSearchBarProps = {
  className?: string;
};

export default function HeaderSearchBar({ className = "" }: HeaderSearchBarProps) {
  const router = useRouter();

  const handleSearch = (query: string) => {
    addRecentSearch(query);
    router.push(`/buscar?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className={`flex-1 max-w-md ${className}`}>
      <SearchAutocomplete
        placeholder="Buscar guantes, brackets, resinas…"
        onSearch={handleSearch}
        inputClassName="text-sm"
        className="w-full"
      />
    </div>
  );
}

