// src/app/buscar/loading.tsx
export default function BuscarLoading() {
  return (
    <section className="space-y-6" role="status" aria-live="polite">
      <div>
        <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
        <div className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full min-h-[44px] bg-gray-100 animate-pulse" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border p-3 flex flex-col animate-pulse"
            aria-hidden="true"
          >
            <div className="w-full aspect-square bg-gray-200 rounded" />
            <div className="mt-2 h-4 bg-gray-200 rounded w-3/4" />
            <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando resultados de búsqueda...</span>
    </section>
  );
}

