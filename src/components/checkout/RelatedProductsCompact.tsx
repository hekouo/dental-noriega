"use client";

import { useEffect, useState, useRef } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { trackRelatedProductsShown, trackRelatedProductClicked, trackRelatedProductAddToCart } from "@/lib/analytics/events";

type RelatedProductsCompactProps = {
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
 * Componente compacto para mostrar productos relacionados en checkout
 * Solo se muestra si hay productos relacionados disponibles
 */
export default function RelatedProductsCompact({
  productIds,
  limit = 3,
}: RelatedProductsCompactProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore((s) => s.addToCart);
  const cartItemsCount = useCartStore((s) => s.cartItems.length);
  const trackedRef = useRef(false);

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
          const fetchedProducts = data.products || [];
          
          // El API debe garantizar que siempre retorne algo cuando hay items en el carrito
          setProducts(fetchedProducts);
        } else {
          // Si el API falla, no mostrar nada (no romper el flujo de pago)
          if (process.env.NODE_ENV === "development") {
            console.warn("[RelatedProductsCompact] API error, will show empty");
          }
          setProducts([]);
        }
      } catch (error) {
        // Silenciar errores - no romper el flujo de pago
        if (process.env.NODE_ENV === "development") {
          console.error("[RelatedProductsCompact] Error:", error);
        }
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [productIds, limit]);

  // Trackear cuando se muestran productos relacionados
  useEffect(() => {
    if (products.length > 0 && !trackedRef.current) {
      trackedRef.current = true;
      trackRelatedProductsShown({
        source: "checkout",
        productsCount: products.length,
        cartItemsCount,
      });
    }
  }, [products.length, cartItemsCount]);

  // Mostrar solo si hay productos y no está cargando
  // El API debe garantizar que siempre retorne algo cuando hay items en el carrito
  if (loading || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        También te puede interesar
      </h3>
      <div className="space-y-2">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {product.image_url && (
              <div
                className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100 cursor-pointer"
                onClick={() => {
                  trackRelatedProductClicked({
                    source: "checkout",
                    productId: product.id,
                    sectionSlug: product.section,
                    position: index + 1,
                  });
                }}
              >
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                trackRelatedProductClicked({
                  source: "checkout",
                  productId: product.id,
                  sectionSlug: product.section,
                  position: index + 1,
                });
              }}
            >
              <p className="text-xs font-medium text-gray-900 truncate">
                {product.title}
              </p>
              <p className="text-xs text-gray-600">
                ${(product.price_cents / 100).toFixed(2)} MXN
              </p>
            </div>
            <button
              onClick={() => {
                trackRelatedProductAddToCart({
                  source: "checkout",
                  productId: product.id,
                  cartItemsBefore: cartItemsCount,
                });
                addToCart({
                  id: product.id,
                  title: product.title,
                  price: product.price_cents / 100,
                  price_cents: product.price_cents,
                  image_url: product.image_url || undefined,
                  qty: 1,
                  selected: true,
                });
              }}
              className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors flex-shrink-0"
            >
              Agregar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
