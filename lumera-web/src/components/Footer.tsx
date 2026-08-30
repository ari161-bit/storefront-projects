import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-espressoDark text-ivory/80 mt-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <p className="font-serif-display text-2xl tracking-[0.14em] text-ivory mb-3">LUMÉRA</p>
          <p className="text-sm text-ivory/55 leading-relaxed">Light something beautiful.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-champagne mb-4">Shop</p>
          <ul className="space-y-2.5 text-sm text-ivory/65">
            <li><Link to="/shop" className="hover:text-ivory">All Candles</Link></li>
            <li><Link to="/shop?featured=1" className="hover:text-ivory">Featured Collection</Link></li>
            <li><Link to="/wishlist" className="hover:text-ivory">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-champagne mb-4">Account</p>
          <ul className="space-y-2.5 text-sm text-ivory/65">
            <li><Link to="/account/orders" className="hover:text-ivory">Order Tracking</Link></li>
            <li><Link to="/login" className="hover:text-ivory">Login</Link></li>
            <li><Link to="/signup" className="hover:text-ivory">Create Account</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-champagne mb-4">LUMÉRA</p>
          <ul className="space-y-2.5 text-sm text-ivory/65">
            <li><Link to="/story" className="hover:text-ivory">Our Story</Link></li>
            <li><a href="#" className="hover:text-ivory">Instagram</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10 py-6 flex items-center justify-center gap-4 text-xs text-ivory/40">
        <span>&copy; {new Date().getFullYear()} LUMÉRA. Hand-poured with care.</span>
        <a href="/admin/login" className="text-ivory/25 hover:text-ivory/60">Admin</a>
      </div>
    </footer>
  );
}
