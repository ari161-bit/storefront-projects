import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';

const MOODS = [
  { id: 'calming', label: 'Calm', color: '#8D82B5' },
  { id: 'floral', label: 'Romantic', color: '#B0473A' },
  { id: 'cozy', label: 'Cozy', color: '#C9A66B' },
  { id: 'fresh', label: 'Fresh', color: '#7C8A64' },
  { id: 'fruity', label: 'Sweet', color: '#D9B23C' },
  { id: 'spicy', label: 'Midnight', color: '#2A1C13' },
];

export default function Home() {
  const { products, loading } = useProducts();
  const featured = products.filter((p) => p.featured).slice(0, 6);
  const shown = featured.length > 0 ? featured : products.slice(0, 6);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream via-ivory to-ivory">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 25% 20%, rgba(201,166,107,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 70%, rgba(61,43,31,0.08), transparent 60%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-20 pb-24 md:pt-28 md:pb-36 grid md:grid-cols-2 gap-14 items-center">
          <div className="animate-fadeUp">
            <p className="text-xs tracking-[0.35em] uppercase text-champagneDark font-medium mb-6">Hand-Poured &middot; Since Day One</p>
            <h1 className="font-serif-display text-[3rem] leading-[1.05] sm:text-6xl md:text-[4.4rem] text-espressoDark">
              LUMÉRA
            </h1>
            <p className="font-serif-display italic text-2xl md:text-3xl text-champagneDark mt-3">Light something beautiful.</p>
            <p className="mt-7 text-espresso/60 text-base md:text-lg max-w-md leading-relaxed">
              Hand-poured candles crafted to turn ordinary moments into something worth remembering.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/shop"
                className="text-center px-9 py-4 rounded-full bg-espressoDark text-ivory text-sm tracking-wide uppercase hover:bg-espresso transition-colors"
              >
                Shop Candles
              </Link>
              <Link
                to="/shop?featured=1"
                className="text-center px-9 py-4 rounded-full border border-espresso/25 text-espressoDark text-sm tracking-wide uppercase hover:border-champagneDark hover:text-champagneDark transition-colors"
              >
                Explore the Collection
              </Link>
            </div>
          </div>

          <div className="relative aspect-square max-w-md mx-auto w-full animate-fadeUp" style={{ animationDelay: '0.15s' }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-champagne/25 via-beige to-ivory shadow-glow" />
            <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full p-16">
              <ellipse cx="160" cy="272" rx="72" ry="10" fill="#3D2B1F" opacity="0.1" />
              <rect x="102" y="160" width="116" height="105" rx="12" fill="#EAE0CC" stroke="#C9A66B" strokeWidth="1.5" />
              <circle cx="160" cy="140" r="3" fill="#3D2B1F" />
              <line x1="160" y1="140" x2="160" y2="120" stroke="#3D2B1F" strokeWidth="2" />
              <path
                className="animate-flicker"
                d="M160 120c8 12-9 16-9 28a9 9 0 0 0 18 0c0-8-5-12-2-19 3 5 9 10 9 19a16 16 0 0 1-32 0c0-17 11-19 16-28Z"
                fill="url(#flame)"
              />
              <defs>
                <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F6E3B4" />
                  <stop offset="55%" stopColor="#D4B483" />
                  <stop offset="100%" stopColor="#B08D4F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* FEATURED COLLECTION */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-champagneDark font-medium mb-3">The Edit</p>
            <h2 className="font-serif-display text-3xl md:text-5xl text-espressoDark">Featured Collection</h2>
          </div>
          <Link to="/shop" className="text-sm uppercase tracking-wide text-espresso/60 hover:text-espressoDark">
            View All &rarr;
          </Link>
        </div>
        {loading ? (
          <ProductGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* SHOP BY MOOD */}
      <section className="bg-beige/50 py-20 md:py-28 border-y border-espresso/8">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-champagneDark font-medium mb-3">Find Your Feeling</p>
            <h2 className="font-serif-display text-3xl md:text-5xl text-espressoDark">Shop by Mood</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {MOODS.map((m) => (
              <Link
                key={m.id}
                to={`/shop?mood=${m.id}`}
                className="group relative aspect-square rounded-2xl overflow-hidden flex items-end p-5 shadow-card hover:shadow-cardHover transition-shadow"
                style={{ background: `linear-gradient(150deg, ${m.color}dd, ${m.color}88)` }}
              >
                <span className="font-serif-display text-xl text-ivory group-hover:translate-x-1 transition-transform">
                  {m.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY LUMERA */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.3em] uppercase text-champagneDark font-medium mb-3">Our Promise</p>
          <h2 className="font-serif-display text-3xl md:text-5xl text-espressoDark">Why LUMÉRA?</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Hand-Poured', desc: 'Every candle poured by hand in small batches for a flawless, even burn.' },
            { title: 'Premium Wax', desc: 'A clean-burning soy & coconut wax blend, kind to your space and the planet.' },
            { title: 'Long-Lasting Fragrance', desc: 'Layered top, mid and base notes that fill a room and linger beautifully.' },
            { title: 'Thoughtfully Packaged', desc: 'Every order arrives wrapped like the gift it is — for you or someone else.' },
          ].map((c) => (
            <div key={c.title} className="p-7 rounded-2xl border border-espresso/8 bg-ivory hover:shadow-card transition-shadow">
              <h3 className="font-serif-display text-xl text-espressoDark mb-2">{c.title}</h3>
              <p className="text-sm text-espresso/55 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BRAND STORY */}
      <section className="bg-espressoDark text-ivory py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-champagne font-medium mb-6">Our Story</p>
          <p className="font-serif-display italic text-2xl md:text-4xl leading-relaxed">
            "Every LUMÉRA candle is created to make a moment feel different — slower, warmer, and a little more beautiful."
          </p>
          <Link
            to="/story"
            className="inline-block mt-10 px-9 py-4 rounded-full bg-champagne text-espressoDark text-sm uppercase tracking-wide hover:bg-gold transition-colors"
          >
            Discover Our Story
          </Link>
        </div>
      </section>
    </div>
  );
}
