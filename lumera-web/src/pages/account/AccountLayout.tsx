import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2.5 rounded-lg text-sm transition-colors ${
    isActive ? 'bg-espressoDark text-ivory' : 'text-espresso/70 hover:bg-beige'
  }`;

export default function AccountLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <h1 className="font-serif-display text-4xl text-espressoDark mb-2">My Account</h1>
      <p className="text-espresso/50 text-sm mb-10">Welcome back, {user?.name}.</p>

      <div className="grid md:grid-cols-[220px_1fr] gap-10">
        <nav className="space-y-1.5">
          <NavLink to="/account" end className={linkClass}>Overview</NavLink>
          <NavLink to="/account/orders" className={linkClass}>My Orders</NavLink>
          <NavLink to="/account/wishlist" className={linkClass}>Wishlist</NavLink>
          <NavLink to="/account/profile" className={linkClass}>Profile</NavLink>
          <NavLink to="/account/addresses" className={linkClass}>Saved Addresses</NavLink>
          <button onClick={logout} className="block w-full text-left px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
            Logout
          </button>
        </nav>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
