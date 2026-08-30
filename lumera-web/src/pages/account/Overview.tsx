import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import type { Order } from '../../types';
import { fmtGBP, fmtDate } from '../../utils/format';
import OrderStatusBadge from '../../components/OrderStatusBadge';

export default function Overview() {
  const { user } = useAuth();
  const { ids } = useWishlist();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addressCount, setAddressCount] = useState(0);

  useEffect(() => {
    api.get<Order[]>('/my-orders').then((res) => setOrders(res.data)).catch(() => setOrders([]));
    api.get('/addresses').then((res) => setAddressCount(res.data.length)).catch(() => setAddressCount(0));
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border border-espresso/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-espresso/40 mb-1">Orders</p>
          <p className="font-serif-display text-3xl text-espressoDark">{orders.length}</p>
        </div>
        <div className="border border-espresso/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-espresso/40 mb-1">Wishlist</p>
          <p className="font-serif-display text-3xl text-espressoDark">{ids.size}</p>
        </div>
        <div className="border border-espresso/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-espresso/40 mb-1">Saved Addresses</p>
          <p className="font-serif-display text-3xl text-espressoDark">{addressCount}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif-display text-xl text-espressoDark">Recent Orders</h2>
          <Link to="/account/orders" className="text-xs uppercase tracking-wide text-champagneDark hover:underline">View All</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-espresso/50">No orders yet. <Link to="/shop" className="text-champagneDark hover:underline">Start shopping</Link>.</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 3).map((o) => (
              <div key={o.id} className="flex items-center justify-between border border-espresso/10 rounded-xl p-4">
                <div>
                  <p className="font-medium text-espressoDark">{o.id}</p>
                  <p className="text-xs text-espresso/45">{fmtDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{fmtGBP(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-espresso/40">Logged in as {user?.email}</p>
    </div>
  );
}
