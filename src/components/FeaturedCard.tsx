"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductImage from "@/components/ProductImage";
import PointsBadge from "@/components/PointsBadge";
import { pointsFor } from "@/lib/utils/points";
import { formatPrice } from "@/lib/utils/catalog";
import { useCartStore } from "@/lib/store/cartStore";
import QtyStepper from "@/components/QtyStepper";
import { ROUTES } from "@/lib/routes";
// Badge simple sin dependencias externas
const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

export type FeaturedCardProps = {
  id?: string;
  title: string;
  price: number;
  image?: string;
  imageResolved?: string;
  slug: string;
  sectionSlug: string;
  code?: string;
  resolved: boolean;
  canonicalUrl?: string;
  inStock: boolean;
  fallback?: {
    section: string;
    slug: string;
    title: string;
  };
};

export default function FeaturedCard({
  id,
  title,
  price,
  image,
  imageResolved,
  slug,
  sectionSlug,
  code,
  resolved,
  canonicalUrl,
  inStock,
  fallback
}: FeaturedCardProps) {
  const points = pointsFor(price);
  const imageUrl = imageResolved || image;
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addToCart);

  const handleAddToCart = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    
    try {
      addToCart({
        id: id || slug,
        title,
        price,
        qty,
        imageUrl,
        selected: true
      });
    } finally {
      busyRef.current = false;
    }
  };

  const handlePrefetch = () => {
    if (canonicalUrl) {
      router.prefetch(canonicalUrl);
    }
  };
  
  // Solo mostrar badge "Agotado" si inStock es explícitamente false
  if (inStock === false) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
        <div className="aspect-square relative">
          <ProductImage
            src={imageUrl}
            alt={title}
            width={300}
            height={300}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <Badge className="absolute top-2 right-2 bg-red-500">
            Agotado
          </Badge>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-primary-600">
              {formatPrice(price)}
            </span>
            <PointsBadge points={points} />
          </div>
          <Link
            href={ROUTES.section(sectionSlug)}
            className="w-full btn btn-outline btn-sm"
          >
            Ver similares
          </Link>
        </div>
      </div>
    );
  }
  
  // Si hay fallback, mostrar cintillo "Sugerido"
  const showFallback = !resolved && fallback;
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
      {showFallback && (
        <Badge className="absolute top-2 left-2 bg-blue-500 z-10">
          Sugerido
        </Badge>
      )}
      
      <Link 
        href={canonicalUrl || ROUTES.product(sectionSlug, slug)}
        prefetch={false}
        className="block"
        onMouseEnter={handlePrefetch}
      >
        <div className="aspect-square relative">
          <ProductImage
            src={imageUrl}
            alt={title}
            width={300}
            height={300}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      </Link>
      
      <div className="p-4">
        <Link 
          href={canonicalUrl || ROUTES.product(sectionSlug, slug)}
          className="block"
        >
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-primary-600">
            {showFallback ? fallback.title : title}
          </h3>
        </Link>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-primary-600">
            {formatPrice(price)}
          </span>
          <PointsBadge points={points} />
        </div>
        
        <div className="space-y-3">
          <QtyStepper
            value={qty}
            onChange={setQty}
            className="w-full"
          />
          
          <button
            onClick={handleAddToCart}
            disabled={busyRef.current}
            className="w-full btn btn-primary btn-sm"
          >
            {busyRef.current ? "Agregando..." : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
