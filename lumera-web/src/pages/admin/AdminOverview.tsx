import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import adminApi from '../../context/AdminAuthContext';
import type { AdminStats } from '../../types';
import { fmtGBP, fmtDate } from '../../utils/format';
import OrderStatusBadge from '../../components/OrderStatusBadge';

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get<AdminStats>('/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load dashboard stats. Make sure the database migration has been run.'));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!stats) return <p className="text-espresso/40 text-sm">Loading dashboard…</p>;

  const cards = [
    { label: 'Total Sales', value: fmtGBP(stats.totalSales) },
    { label: 'Total Orders', value: stats.totalOrders },
    { label: 'Total Customers', value: stats.totalCustomers },
    { label: 'Total Products', value: stats.totalProducts },
  ];

  return (
    <div className="space-y-10">
      <h1 className="font-serif-display text-3xl text-espressoDark">Dashboard Overview</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-cream border border-espresso/10 rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wide text-espresso/45 mb-2">{c.label}</p>
            <p className="font-serif-display text-3xl text-espressoDark">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-cream border border-espresso/10 rounded-2xl p-6">
          <h2 className="font-serif-display text-lg text-espressoDark mb-5">Sales Over Time (14 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.salesOverTime}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A66B" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#C9A66B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE0CC" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: '#3D2B1F99' }} />
              <YAxis tick={{ fontSize: 11, fill: '#3D2B1F99' }} width={40} />
              <Tooltip formatter={(value) => fmtGBP(Number(value))} labelFormatter={(label) => fmtDate(String(label))} />
              <Area type="monotone" dataKey="sales" stroke="#B08D4F" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-cream border border-espresso/10 rounded-2xl p-6">
          <h2 className="font-serif-display text-lg text-espressoDark mb-5">Orders Over Time (14 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.salesOverTime}>
              <defs>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3D2B1F" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3D2B1F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE0CC" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: '#3D2B1F99' }} />
              <YAxis tick={{ fontSize: 11, fill: '#3D2B1F99' }} width={30} allowDecimals={false} />
              <Tooltip labelFormatter={(label) => fmtDate(String(label))} />
              <Area type="monotone" dataKey="orders" stroke="#3D2B1F" fill="url(#ordersGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-cream border border-espresso/10 rounded-2xl p-6">
          <h2 className="font-serif-display text-lg text-espressoDark mb-5">Best-Selling Products</h2>
          {stats.bestSelling.length === 0 ? (
            <p className="text-sm text-espresso/40">No sales yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.bestSelling} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#3D2B1F99' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#3D2B1F' }} />
                <Tooltip />
                <Bar dataKey="qty" fill="#C9A66B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-cream border border-espresso/10 rounded-2xl p-6">
          <h2 className="font-serif-display text-lg text-espressoDark mb-5">Low Stock</h2>
          {stats.lowStockProducts.length === 0 ? (
            <p className="text-sm text-espresso/40">All products are well stocked.</p>
          ) : (
            <div className="space-y-2">
              {stats.lowStockProducts.map((p) => (
                <div key={p.id} className="flex justify-between text-sm border-b border-espresso/8 pb-2">
                  <Link to={`/product/${p.id}`} className="text-espressoDark hover:text-champagneDark">{p.name}</Link>
                  <span className={p.stock === 0 ? 'text-red-600 font-medium' : 'text-espresso/60'}>{p.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-cream border border-espresso/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif-display text-lg text-espressoDark">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs uppercase tracking-wide text-champagneDark hover:underline">View All</Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-espresso/40">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-b border-espresso/8 pb-3">
                <div>
                  <p className="font-medium text-espressoDark">{o.id}</p>
                  <p className="text-xs text-espresso/45">{o.customer.name} &middot; {fmtDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span>{fmtGBP(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
