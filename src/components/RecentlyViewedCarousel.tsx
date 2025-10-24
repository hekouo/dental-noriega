"use client";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { ROUTES } from "@/lib/routes";
import { formatPrice } from "@/lib/utils/catalog";
import ProductImage from "@/components/ProductImage";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";

type Props = {
  title?: string;
  maxItems?: number;
  className?: string;
};

export default function RecentlyViewedCarousel({ 
  title = "Vistos recientemente", 
  maxItems = 8,
  className = ""
}: Props) {
  const { items, getItemsForPrefetch } = useRecentlyViewed();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayItems = items.slice(0, maxItems);
  
  if (displayItems.length === 0) {
    return null;
  }

  const scrollLeft = () => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={scrollLeft}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={scrollRight}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayItems.map((item) => (
          <Link
            key={`${item.slug}-${item.viewedAt}`}
            href={ROUTES.product(item.sectionSlug, item.slug)}
            className="flex-shrink-0 w-48 group"
          >
            <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square relative">
                <ProductImage
                  src={item.image}
                  alt={item.title}
                  sizes="(max-width: 768px) 50vw, 200px"
                />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 mb-2">{item.section}</p>
                <p className="text-sm font-semibold text-primary-600">
                  {formatPrice(item.price)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
