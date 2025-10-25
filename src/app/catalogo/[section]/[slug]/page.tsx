// src/app/catalogo/[section]/[slug]/page.tsx
import { Metadata } from "next";
import ProductResolver from "@/components/ProductResolver";
import RecentlyViewedTracker from "@/components/RecentlyViewedTracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: { section: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `${params.slug} - ${params.section} | Depósito Dental Noriega`,
    description: `Descubre ${params.slug} en nuestra sección de ${params.section}. Calidad y precio en Depósito Dental Noriega.`,
  };
}

export default function ProductPage({ params }: Props) {
  return (
    <ProductResolver section={params.section} slug={params.slug}>
      <div className="min-h-screen bg-gray-50">
        <RecentlyViewedTracker slug={params.slug} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando producto...</p>
          </div>
        </div>
      </div>
    </ProductResolver>
  );
}