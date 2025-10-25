// src/app/catalogo/[section]/[slug]/page.tsx
import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getProductBySectionSlug } from "@/lib/data/getProductBySectionSlug";
import { resolveProductClient } from "@/lib/data/resolveProduct.client";
import ProductDetailPage from "@/components/ProductDetailPage";
import RecentlyViewedTracker from "@/components/RecentlyViewedTracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: { section: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Server-first lookup para metadata
  const product = await getProductBySectionSlug(params.section, params.slug);
  
  if (product) {
    return {
      title: `${product.title} - ${params.section} | Depósito Dental Noriega`,
      description: `Descubre ${product.title} en nuestra sección de ${params.section}. Calidad y precio en Depósito Dental Noriega.`,
    };
  }
  
  return {
    title: `${params.slug} - ${params.section} | Depósito Dental Noriega`,
    description: `Descubre ${params.slug} en nuestra sección de ${params.section}. Calidad y precio en Depósito Dental Noriega.`,
  };
}

export default async function ProductPage({ params }: Props) {
  // Server-first lookup: intentar encontrar producto directamente
  const product = await getProductBySectionSlug(params.section, params.slug);
  
  if (product) {
    // Producto encontrado - renderizar PDP directo
    return (
      <div className="min-h-screen bg-gray-50">
        <RecentlyViewedTracker slug={params.slug} />
        <ProductDetailPage 
          product={product}
          section={params.section}
          slug={params.slug}
        />
      </div>
    );
  }
  
  // Producto no encontrado - usar resolver como plan B
  try {
    const resolveResult = await resolveProductClient(params.section, params.slug);
    
    if (resolveResult?.ok && resolveResult.redirectTo) {
      // Redirigir a URL canónica
      redirect(resolveResult.redirectTo);
    }
    
    if (resolveResult?.ok && resolveResult.product) {
      // Producto encontrado por resolver - renderizar PDP
      return (
        <div className="min-h-screen bg-gray-50">
          <RecentlyViewedTracker slug={params.slug} />
          <ProductDetailPage 
            product={resolveResult.product}
            section={resolveResult.section}
            slug={resolveResult.slug}
          />
        </div>
      );
    }
    
    // No se encontró producto - 404 enriquecido
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.warn(`[PDP] Not found: ${params.section}/${params.slug}`, {
        where: 'pdp',
        reason: 'not-found',
        section: params.section,
        slug: params.slug
      });
    }
    
    notFound();
    
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.error(`[PDP] Error resolving ${params.section}/${params.slug}:`, error);
    }
    notFound();
  }
}