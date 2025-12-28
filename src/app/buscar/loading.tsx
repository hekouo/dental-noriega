// src/app/buscar/loading.tsx
import ProductsGridSkeleton from "@/components/products/ProductsGridSkeleton";

export default function BuscarLoading() {
  return (
    <section className="space-y-6" role="status" aria-live="polite">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-900">
          Buscar productos
        </h1>
        <div className="border border-gray-300 rounded-lg pl-10 pr-10 py-3 w-full min-h-[44px] bg-gray-100 animate-pulse" aria-hidden="true" />
      </div>

      <ProductsGridSkeleton count={8} />
      <span className="sr-only">Cargando resultados de búsqueda...</span>
    </section>
  );
}

