export default function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 p-3 flex flex-col bg-white animate-pulse">
      {/* Imagen skeleton */}
      <div className="relative w-full aspect-square bg-gray-200 rounded-lg" />

      {/* Título skeleton */}
      <div className="mt-2 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>

      {/* Precio skeleton */}
      <div className="mt-1 h-5 bg-gray-200 rounded w-20" />

      {/* Botón skeleton */}
      <div className="mt-auto pt-2">
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

