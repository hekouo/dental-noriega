"use client";
import { useCallback } from "react";

export function useRecentlyViewed() {
  const key = 'recently_viewed_v1';
  
  const push = useCallback((slug: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [slug, ...arr.filter((s: string) => s !== slug)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.warn('[RecentlyViewed] Failed to save:', error);
    }
  }, []);
  
  const list = useCallback(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.warn('[RecentlyViewed] Failed to load:', error);
      return [];
    }
  }, []);
  
  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[RecentlyViewed] Failed to clear:', error);
    }
  }, []);
  
  return { push, list, clear };
}
