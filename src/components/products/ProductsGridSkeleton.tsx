import ProductCardSkeleton from "./ProductCardSkeleton";

type ProductsGridSkeletonProps = {
  count?: number;
};

export default function ProductsGridSkeleton({
  count = 8,
}: ProductsGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

