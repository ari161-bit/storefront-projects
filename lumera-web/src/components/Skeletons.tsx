export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-espresso/8 animate-pulse">
      <div className="aspect-[4/5] bg-beige" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-16 bg-beige rounded" />
        <div className="h-5 w-3/4 bg-beige rounded" />
        <div className="h-3 w-full bg-beige rounded" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-4 w-12 bg-beige rounded" />
          <div className="h-8 w-16 bg-beige rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
