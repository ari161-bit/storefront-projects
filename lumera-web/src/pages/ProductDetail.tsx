import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import type { Product, Review } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StarRating from '../components/StarRating';
import ProductCard from '../components/ProductCard';
import WishlistHeartButton from '../components/WishlistHeartButton';
import { fmtGBP, fmtDate } from '../utils/format';
import { productImageSrc } from '../utils/image';
import { useProducts } from '../hooks/useProducts';

const RECENT_KEY = 'lumera_recently_viewed';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const [rName, setRName] = useState('');
  const [rRating, setRRating] = useState(0);
  const [rComment, setRComment] = useState('');
  const [rError, setRError] = useState('');

  useEffect(() => {
    if (!id) return;
    setProduct(null);
    setNotFound(false);
    setQty(1);
    api
      .get<Product[]>('/candle-products')
      .then((res) => {
        const found = res.data.find((p) => p.id === id);
        if (!found) {
          setNotFound(true);
        } else {
          setProduct(found);
          try {
            const raw = localStorage.getItem(RECENT_KEY);
            const prev: string[] = raw ? JSON.parse(raw) : [];
            const next = [id, ...prev.filter((x) => x !== id)].slice(0, 6);
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
            setRecentIds(next.filter((x) => x !== id));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => setNotFound(true));

    api
      .get<Review[]>(`/candle-reviews?productId=${encodeURIComponent(id)}`)
      .then((res) => setReviews(res.data))
      .catch(() => setReviews([]));

    window.scrollTo({ top: 0 });
  }, [id]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <h1 className="font-serif-display text-3xl text-espressoDark mb-3">We couldn't find that candle</h1>
        <Link to="/shop" className="text-champagneDark underline underline-offset-2">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-20 grid md:grid-cols-2 gap-14 animate-pulse">
        <div className="aspect-square bg-beige rounded-2xl" />
        <div className="space-y-4">
          <div className="h-4 w-24 bg-beige rounded" />
          <div className="h-10 w-2/3 bg-beige rounded" />
          <div className="h-24 w-full bg-beige rounded" />
        </div>
      </div>
    );
  }

  const effectivePrice = product.salePrice ?? product.price;
  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3);
  const recentlyViewed = products.filter((p) => recentIds.includes(p.id));

  async function submitReview() {
    if (!product) return;
    if (!rName.trim() || rRating < 1 || !rComment.trim()) {
      setRError('Please add your name, a star rating and a comment.');
      return;
    }
    try {
      const res = await api.post<Review>('/candle-reviews', { productId: product.id, name: rName, rating: rRating, comment: rComment });
      setReviews((prev) => [res.data, ...prev]);
      setRName('');
      setRRating(0);
      setRComment('');
      setRError('');
      showToast('Thanks for your review!');
    } catch {
      setRError('Could not submit your review. Please try again.');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <div className="grid md:grid-cols-2 gap-14">
        <div className="rounded-2xl overflow-hidden aspect-square relative shadow-card" style={{ background: `linear-gradient(150deg, ${product.color}cc, ${product.color}55)` }}>
          <img
            src={productImageSrc(product)}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-champagneDark mb-2">{product.categoryLabel}</p>
          <h1 className="font-serif-display text-4xl text-espressoDark mb-2">{product.name}</h1>
          <div className="mb-4"><StarRating rating={product.rating} count={product.ratingCount} size="md" /></div>
          <div className="flex items-baseline gap-3 mb-5">
            <span className="font-serif-display text-3xl text-champagneDark">{fmtGBP(effectivePrice)}</span>
            {product.salePrice && <span className="text-espresso/40 line-through">{fmtGBP(product.price)}</span>}
          </div>
          <p className="text-espresso/65 leading-relaxed mb-6">{product.description || product.blurb}</p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-6">
            {(['top', 'mid', 'base'] as const).map((key) => (
              <div key={key} className="border border-espresso/10 rounded-xl py-3">
                <p className="uppercase text-espresso/40 mb-1">{key}</p>
                <p className="text-espressoDark">{product.notes[key]}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-espresso/60 mb-6">
            <p><span className="text-espressoDark font-medium">Wax:</span> {product.waxType}</p>
            <p><span className="text-espressoDark font-medium">Burn Time:</span> {product.burn}</p>
            <p><span className="text-espressoDark font-medium">Size:</span> {product.size}</p>
            <p>
              <span className="text-espressoDark font-medium">Stock:</span>{' '}
              {product.stock === 0 ? (
                <span className="text-red-600">Sold out</span>
              ) : product.stock <= 5 ? (
                <span className="text-red-600">Only {product.stock} left</span>
              ) : (
                <span className="text-green-700">In stock</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3 border border-espresso/20 rounded-full px-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-espressoDark">&minus;</button>
              <span className="w-5 text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))} className="w-8 h-8 flex items-center justify-center text-espressoDark">+</button>
            </div>
            <WishlistHeartButton
              productId={product.id}
              size={18}
              className="w-11 h-11 rounded-full border border-espresso/20 flex items-center justify-center shrink-0"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => addItem({ id: product.id, name: product.name, price: effectivePrice, qty })}
              disabled={product.stock === 0}
              className="flex-1 px-6 py-4 rounded-full border border-espressoDark text-espressoDark text-sm uppercase tracking-wide hover:bg-beige transition-colors disabled:opacity-40"
            >
              Add to Cart
            </button>
            <button
              onClick={() => {
                addItem({ id: product.id, name: product.name, price: effectivePrice, qty });
                navigate('/checkout');
              }}
              disabled={product.stock === 0}
              className="flex-1 px-6 py-4 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors disabled:opacity-40"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* REVIEWS */}
      <section className="mt-24 max-w-3xl">
        <h2 className="font-serif-display text-3xl text-espressoDark mb-8">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-espresso/50 text-sm mb-8">No reviews yet — be the first to share your thoughts.</p>
        ) : (
          <div className="space-y-4 mb-10">
            {reviews.map((r) => (
              <div key={r.id} className="border border-espresso/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-espressoDark">{r.name}</span>
                  <StarRating rating={r.rating} />
                </div>
                <p className="text-sm text-espresso/60 mb-2">{r.comment}</p>
                <p className="text-[11px] text-espresso/35 flex items-center gap-2">
                  {fmtDate(r.createdAt)}
                  {r.verifiedPurchase && <span className="text-green-700">&middot; Verified Purchase</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-beige/50 rounded-2xl p-6">
          <h3 className="font-serif-display text-xl text-espressoDark mb-4">Write a Review</h3>
          {!user && (
            <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Your name" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark mb-4" />
          )}
          <div className="flex gap-1 text-2xl text-espresso/25 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} onClick={() => setRRating(i)} className={`cursor-pointer ${i <= rRating ? 'text-champagneDark' : ''}`}>
                {i <= rRating ? '★' : '☆'}
              </span>
            ))}
          </div>
          <textarea value={rComment} onChange={(e) => setRComment(e.target.value)} rows={3} placeholder="What did you think?" className="w-full border border-espresso/15 bg-ivory px-4 py-3 text-sm rounded-lg resize-none focus:outline-none focus:border-champagneDark mb-3" />
          {rError && <p className="text-xs text-red-600 mb-3">{rError}</p>}
          <button onClick={submitReview} className="px-6 py-3 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors">
            Submit Review
          </button>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-serif-display text-3xl text-espressoDark mb-8">You May Also Love</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="mt-24">
          <h2 className="font-serif-display text-3xl text-espressoDark mb-8">Recently Viewed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {recentlyViewed.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
