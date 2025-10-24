"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRecentlyViewed } from "@/lib/hooks/useRecentlyViewed";
import { resolveProductClient } from "@/lib/data/resolveProduct.client";
import ProductImage from "@/components/ProductImage";
import { formatPrice } from "@/lib/utils/catalog";

type Product = {
  id: string;
  title: string;
  price: number;
  image?: string;
  sectionSlug: string;
  slug: string;
};

export default function RecentlyViewed() {
  const { list } = useRecentlyViewed();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      const slugs = list();
      if (slugs.length === 0) {
        setLoading(false);
        return;
      }

      const productPromises = slugs.slice(0, 6).map(async (slug: string) => {
        try {
          // Intentar resolver el producto desde diferentes secciones
          const sections = [
            'consumibles-y-profilaxis',
            'equipos',
            'instrumental-clinico',
            'instrumental-ortodoncia',
            'ortodoncia-accesorios-y-retenedores',
            'ortodoncia-arcos-y-resortes',
            'ortodoncia-brackets-y-tubos'
          ];

          for (const section of sections) {
            const data = await resolveProductClient(section, slug);
            if (data && data.ok) {
              return {
                id: slug,
                title: data.product.title,
                price: data.product.price,
                image: data.product.image,
                sectionSlug: data.section,
                slug: data.slug
              };
            }
          }
          return null;
        } catch (error) {
          console.warn('[RecentlyViewed] Failed to load product:', slug, error);
          return null;
        }
      });

      const results = await Promise.all(productPromises);
      const validProducts = results.filter((p): p is Product => p !== null);
      setProducts(validProducts);
      setLoading(false);
    };

    loadProducts();
  }, [list]);

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-6">Vistos Recientemente</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6">Vistos Recientemente</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/catalogo/${product.sectionSlug}/${product.slug}`}
            className="group block"
            prefetch={false}
          >
            <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square relative">
                <ProductImage
                  src={product.image}
                  alt={product.title}
                  width={200}
                  height={200}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary-600">
                  {product.title}
                </h3>
                <p className="text-primary-600 font-bold text-sm">
                  {formatPrice(product.price)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
