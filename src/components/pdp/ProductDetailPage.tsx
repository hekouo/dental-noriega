// src/components/pdp/ProductDetailPage.tsx
"use client";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import AddToCartControls from "@/components/pdp/AddToCartControls";
import { formatCurrency } from "@/lib/utils/currency";

type Props = {
  product: {
    section: string;
    slug: string;
    title: string;
    price: number; // centavos
    imageUrl?: string;
    inStock?: boolean;
    sku?: string;
    description?: string;
  };
};

export default function ProductDetailPage({ product }: Props) {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
      <div className="w-full">
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <div className="text-xl mt-2">{formatCurrency(product.price)}</div>
        {product.inStock === false ? (
          <div className="mt-2 text-sm text-red-600">Agotado</div>
        ) : (
          <div className="mt-2 text-sm text-green-600">Disponible</div>
        )}
        {product.description ? (
          <p className="mt-4 text-sm text-gray-700">{product.description}</p>
        ) : null}

        <AddToCartControls
          product={{
            id: product.sku ?? product.slug,
            title: product.title,
            price: product.price,
            imageUrl: product.imageUrl,
            section: product.section,
            slug: product.slug,
            inStock: product.inStock,
          }}
        />
      </div>
    </div>
  );
}
