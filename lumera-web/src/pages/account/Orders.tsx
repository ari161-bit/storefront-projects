import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { Order } from '../../types';
import { fmtGBP, fmtDate } from '../../utils/format';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import EmptyState from '../../components/EmptyState';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Order[]>('/my-orders').then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-espresso/40 text-sm">Loading orders…</p>;

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 7h16v13H4zM4 7l2-4h12l2 4" /></svg>}
        title="No orders yet"
        message="Once you place an order, it'll show up here."
        actionLabel="Shop the Collection"
        actionTo="/shop"
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="border border-espresso/10 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="font-medium text-espressoDark">{o.id}</p>
              <p className="text-xs text-espresso/45">{fmtDate(o.createdAt)}</p>
            </div>
            <OrderStatusBadge status={o.status} />
          </div>
          <div className="space-y-1 mb-3">
            {o.items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm text-espresso/65">
                <Link to={`/product/${i.id}`} className="hover:text-espressoDark">{i.name} &times;{i.qty}</Link>
                <span>{fmtGBP(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-medium pt-3 border-t border-espresso/10">
            <span>Total</span>
            <span>{fmtGBP(o.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
