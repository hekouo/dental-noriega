"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/catalog/ProductCard";

type RelatedProductsProps = {
  productIds: string[];
  limit?: number;
};

type RelatedProduct = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  in_stock: boolean | null;
  is_active: boolean | null;
  description?: string | null;
};

/**
 * Componente client-side que muestra productos relacionados basados en los IDs del carrito
 */
export default function RelatedProducts({
  productIds,
  limit = 8,
}: RelatedProductsProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productIds || productIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchRelated = async () => {
      try {
        const params = new URLSearchParams({
          productIds: productIds.join(","),
          limit: limit.toString(),
        });
        const response = await fetch(`/api/products/related?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("[RelatedProducts] Error al obtener productos relacionados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [productIds, limit]);

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        También te puede interesar
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            section={product.section}
            product_slug={product.product_slug}
            title={product.title}
            price_cents={product.price_cents}
            image_url={product.image_url}
            in_stock={product.in_stock}
            is_active={product.is_active}
            description={product.description}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ))}
      </div>
    </div>
  );
}

