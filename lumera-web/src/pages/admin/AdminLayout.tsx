import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2.5 rounded-lg text-sm transition-colors ${
    isActive ? 'bg-champagne/25 text-espressoDark font-medium' : 'text-ivory/70 hover:bg-ivory/10 hover:text-ivory'
  }`;

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-ivory">
      <aside className="w-64 shrink-0 bg-espressoDark text-ivory flex flex-col">
        <div className="px-6 py-7 border-b border-ivory/10">
          <p className="font-serif-display text-xl tracking-[0.14em]">LUMÉRA</p>
          <p className="text-[10px] uppercase tracking-wide text-champagne">Admin Dashboard</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavLink to="/admin" end className={linkClass}>Overview</NavLink>
          <NavLink to="/admin/products" className={linkClass}>Products</NavLink>
          <NavLink to="/admin/orders" className={linkClass}>Orders</NavLink>
          <NavLink to="/admin/customers" className={linkClass}>Customers</NavLink>
          <NavLink to="/admin/discounts" className={linkClass}>Discounts</NavLink>
          <NavLink to="/admin/reviews" className={linkClass}>Reviews</NavLink>
        </nav>
        <div className="px-4 py-6 border-t border-ivory/10 space-y-1">
          <a href="/" className="block px-4 py-2.5 rounded-lg text-sm text-ivory/70 hover:bg-ivory/10 hover:text-ivory">View Store</a>
          <button onClick={onLogout} className="block w-full text-left px-4 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-950/40">
            Logout ({admin?.username})
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 md:p-10 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
