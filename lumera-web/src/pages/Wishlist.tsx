import { useWishlist } from '../context/WishlistContext';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { ProductGridSkeleton } from '../components/Skeletons';

export default function Wishlist() {
  const { ids } = useWishlist();
  const { products, loading } = useProducts();
  const wished = products.filter((p) => ids.has(p.id));

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <h1 className="font-serif-display text-4xl text-espressoDark mb-10">Your Wishlist</h1>
      {loading ? (
        <ProductGridSkeleton />
      ) : wished.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20.2s-7.4-4.6-9.8-9A5.4 5.4 0 0 1 12 6.4 5.4 5.4 0 0 1 21.8 11.2c-2.4 4.4-9.8 9-9.8 9Z" />
            </svg>
          }
          title="Nothing saved yet"
          message="Tap the heart on any candle to save it here for later."
          actionLabel="Browse the Shop"
          actionTo="/shop"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wished.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
