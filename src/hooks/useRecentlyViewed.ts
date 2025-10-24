"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "recently_viewed_v1";
const MAX_ITEMS = 12;

export type RecentlyViewedItem = {
  slug: string;
  title: string;
  section: string;
  sectionSlug: string;
  price: number;
  image?: string;
  viewedAt: number;
};

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  // Cargar items del localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyViewedItem[];
        setItems(parsed);
      }
    } catch (error) {
      console.warn("Error loading recently viewed items:", error);
    }
  }, []);

  // Agregar un nuevo item
  const addItem = useCallback((item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    const newItem: RecentlyViewedItem = {
      ...item,
      viewedAt: Date.now(),
    };

    setItems(prev => {
      // Remover duplicados del mismo slug
      const filtered = prev.filter(i => i.slug !== item.slug);
      // Agregar al inicio y limitar a MAX_ITEMS
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      
      // Guardar en localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn("Error saving recently viewed items:", error);
      }
      
      return updated;
    });
  }, []);

  // Limpiar todos los items
  const clearItems = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Error clearing recently viewed items:", error);
    }
  }, []);

  // Obtener los primeros N items para prefetch
  const getItemsForPrefetch = useCallback((count: number = 4) => {
    return items.slice(0, count);
  }, [items]);

  return {
    items,
    addItem,
    clearItems,
    getItemsForPrefetch,
  };
}
