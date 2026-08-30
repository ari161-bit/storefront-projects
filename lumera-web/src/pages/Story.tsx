import { Link } from 'react-router-dom';

export default function Story() {
  return (
    <div>
      <section className="bg-espressoDark text-ivory py-28 md:py-36">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-champagne font-medium mb-6">Our Story</p>
          <h1 className="font-serif-display italic text-3xl md:text-5xl leading-relaxed">
            "Every LUMÉRA candle is created to make a moment feel different — slower, warmer, and a little more beautiful."
          </h1>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 md:px-8 py-20 md:py-28 space-y-8 text-espresso/70 leading-relaxed text-lg">
        <p>
          LUMÉRA began with a simple belief: the ordinary moments of a day — a quiet morning, a long bath, a dinner
          with people you love — deserve a little more beauty. A flicker of warm light, a scent that lingers just
          long enough to remember it by.
        </p>
        <p>
          Every candle is hand-poured in small batches using a clean-burning soy and coconut wax blend, layered with
          scent notes that unfold slowly — top, middle, and base — the way a good story does.
        </p>
        <p>
          We're not interested in fast, disposable fragrance. LUMÉRA candles are made to be lived with, refilled with
          intention, and passed on as gifts that say more than words can.
        </p>
      </section>

      <section className="bg-beige/50 py-20 text-center">
        <Link to="/shop" className="inline-block px-9 py-4 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors">
          Shop the Collection
        </Link>
      </section>
    </div>
  );
}
