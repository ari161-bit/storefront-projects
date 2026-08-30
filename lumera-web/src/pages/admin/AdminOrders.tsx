import { useEffect, useState } from 'react';
import adminApi from '../../context/AdminAuthContext';
import type { Order, OrderStatus } from '../../types';
import { fmtGBP, fmtDate } from '../../utils/format';
import OrderStatusBadge from '../../components/OrderStatusBadge';

const STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  function load() {
    setLoading(true);
    adminApi.get<Order[]>('/orders').then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function updateStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await adminApi.put(`/orders/${id}/status`, { status });
    } catch {
      load();
    }
  }

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif-display text-3xl text-espressoDark">Orders</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-espresso/20 rounded-full px-4 py-2 text-xs uppercase tracking-wide bg-cream">
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-espresso/40 text-sm">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-espresso/40 text-sm">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {shown.map((o) => (
            <div key={o.id} className="bg-cream border border-espresso/10 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium text-espressoDark">{o.id}</p>
                  <p className="text-xs text-espresso/45">{o.customer.name} &middot; {o.customer.email} &middot; {fmtDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} />
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    className="border border-espresso/20 rounded-full px-3 py-1.5 text-xs uppercase tracking-wide bg-ivory"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-sm text-espresso/60 space-y-0.5 mb-3">
                {o.items.map((i) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.name} &times;{i.qty}</span>
                    <span>{fmtGBP(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-medium pt-3 border-t border-espresso/10">
                <span>{o.payment.method.toUpperCase()} &middot; {o.payment.status}</span>
                <span>{fmtGBP(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
