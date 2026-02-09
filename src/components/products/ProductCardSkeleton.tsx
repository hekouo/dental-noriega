export default function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 p-3 flex flex-col bg-white">
      <div className="relative w-full aspect-square rounded-lg shimmer-silk" />
      <div className="mt-2 space-y-2">
        <div className="h-4 rounded w-3/4 shimmer-silk" />
        <div className="h-4 rounded w-1/2 shimmer-silk" />
      </div>
      <div className="mt-1 h-5 rounded w-20 shimmer-silk" />
      <div className="mt-auto pt-2">
        <div className="h-10 rounded-lg shimmer-silk" />
      </div>
    </div>
  );
}

