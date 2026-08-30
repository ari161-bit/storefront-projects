import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/EmptyState';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'candle', label: 'Candles' },
  { id: 'diffuser', label: 'Reed Diffusers' },
  { id: 'tealight', label: 'Tea Lights' },
];
const MOODS = [
  { id: 'floral', label: 'Romantic' },
  { id: 'fruity', label: 'Sweet' },
  { id: 'fresh', label: 'Fresh' },
  { id: 'spicy', label: 'Midnight' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'calming', label: 'Calm' },
];
type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'popularity';

export default function Shop() {
  const { products, loading } = useProducts();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [mood, setMood] = useState<string | null>(null);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(30);
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    const m = params.get('mood');
    if (m) setMood(m);
    if (params.get('featured') === '1') setFeaturedOnly(true);
  }, [params]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (mood && !p.moods.includes(mood as never)) return false;
      if (featuredOnly && !p.featured) return false;
      if ((p.salePrice ?? p.price) > maxPrice) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase()) && !p.blurb.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'price-asc') return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
      if (sort === 'price-desc') return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
      if (sort === 'popularity') return b.ratingCount - a.ratingCount || b.rating - a.rating;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [products, category, mood, featuredOnly, maxPrice, search, sort]);

  function clearFilters() {
    setSearch('');
    setCategory('all');
    setMood(null);
    setFeaturedOnly(false);
    setMaxPrice(30);
    setParams({});
  }

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20">
      <div className="mb-10">
        <p className="text-xs tracking-[0.3em] uppercase text-champagneDark font-medium mb-3">The Full Edit</p>
        <h1 className="font-serif-display text-4xl md:text-5xl text-espressoDark">Shop All Scents</h1>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-10">
        {/* FILTER SIDEBAR */}
        <aside className="space-y-8">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50 block mb-2">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candles..."
              className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50 block mb-2">Category</label>
            <div className="flex flex-col gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    category === c.id ? 'bg-espressoDark text-ivory' : 'text-espresso/70 hover:bg-beige'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50 block mb-2">Mood</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMood(mood === m.id ? null : m.id)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs uppercase tracking-wide transition-colors ${
                    mood === m.id ? 'bg-espressoDark text-ivory border-espressoDark' : 'border-espresso/20 text-espresso/70 hover:border-champagneDark'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50 block mb-2">
              Max Price: £{maxPrice.toFixed(0)}
            </label>
            <input
              type="range"
              min={5}
              max={30}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-champagneDark"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-espresso/70 cursor-pointer">
            <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} className="accent-champagneDark w-4 h-4" />
            Featured only
          </label>

          <button onClick={clearFilters} className="text-xs uppercase tracking-wide text-espresso/50 hover:text-espressoDark underline underline-offset-2">
            Clear all filters
          </button>
        </aside>

        {/* PRODUCT GRID */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-espresso/50">{loading ? 'Loading…' : `${filtered.length} scent${filtered.length !== 1 ? 's' : ''}`}</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="border border-espresso/20 rounded-full px-4 py-2 text-xs uppercase tracking-wide bg-ivory focus:outline-none focus:border-champagneDark"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="popularity">Most Popular</option>
            </select>
          </div>

          {loading ? (
            <ProductGridSkeleton count={9} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              }
              title="No scents match"
              message="Try clearing a filter or searching for something else."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
