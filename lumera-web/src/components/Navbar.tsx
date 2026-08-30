import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative text-[13px] tracking-wide uppercase transition-colors ${
    isActive ? 'text-espressoDark' : 'text-espresso/65 hover:text-espressoDark'
  }`;

export default function Navbar() {
  const { count } = useCart();
  const { ids } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-ivory/90 backdrop-blur-md shadow-sm' : 'bg-ivory/70 backdrop-blur-sm'
      } border-b border-espresso/8`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-[78px] flex items-center justify-between">
        <Link to="/" className="font-serif-display text-2xl tracking-[0.15em] text-espressoDark">
          LUMÉRA
        </Link>

        <nav className="hidden lg:flex items-center gap-9">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/shop" className={navLinkClass}>
            Shop
          </NavLink>
          <NavLink to="/shop?featured=1" className={navLinkClass}>
            Collections
          </NavLink>
          <NavLink to="/story" className={navLinkClass}>
            Our Story
          </NavLink>
        </nav>

        <div className="flex items-center gap-4 md:gap-5">
          <Link to="/wishlist" className="relative text-espresso/70 hover:text-espressoDark" aria-label="Wishlist">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20.2s-7.4-4.6-9.8-9A5.4 5.4 0 0 1 12 6.4 5.4 5.4 0 0 1 21.8 11.2c-2.4 4.4-9.8 9-9.8 9Z" />
            </svg>
            {ids.size > 0 && (
              <span className="absolute -top-2 -right-2 bg-champagne text-espressoDark text-[10px] font-semibold w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">
                {ids.size}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative text-espresso/70 hover:text-espressoDark" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 8h12l-1 12.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-champagne text-espressoDark text-[10px] font-semibold w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <button
            onClick={() => navigate(user ? '/account' : '/login')}
            className="hidden sm:inline-block text-[13px] uppercase tracking-wide text-espresso/70 hover:text-espressoDark"
          >
            {user ? user.name.split(' ')[0] : 'Account'}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden text-espressoDark"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-espresso/8 bg-ivory px-5 py-4 flex flex-col gap-4 text-sm uppercase tracking-wide text-espresso/80">
          <Link to="/" onClick={() => setMobileOpen(false)}>
            Home
          </Link>
          <Link to="/shop" onClick={() => setMobileOpen(false)}>
            Shop
          </Link>
          <Link to="/story" onClick={() => setMobileOpen(false)}>
            Our Story
          </Link>
          <Link to={user ? '/account' : '/login'} onClick={() => setMobileOpen(false)}>
            {user ? 'My Account' : 'Login / Sign Up'}
          </Link>
        </div>
      )}
    </header>
  );
}
