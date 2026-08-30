import { useEffect, useState } from 'react';
import adminApi from '../../context/AdminAuthContext';
import type { Customer } from '../../types';
import { fmtGBP, fmtDate } from '../../utils/format';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    adminApi.get<Customer[]>('/customers').then((res) => setCustomers(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleActive(c: Customer) {
    const next = !c.active;
    if (!next && !confirm(`Deactivate ${c.name}'s account? They won't be able to log in.`)) return;
    setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: next } : x)));
    try {
      await adminApi.put(`/customers/${c.id}/active`, { active: next });
    } catch {
      load();
    }
  }

  return (
    <div>
      <h1 className="font-serif-display text-3xl text-espressoDark mb-8">Customers</h1>
      <div className="bg-cream border border-espresso/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-espresso/45 border-b border-espresso/10">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Joined</th>
              <th className="p-4">Orders</th>
              <th className="p-4">Total Spent</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-espresso/8">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-espresso/40">Loading…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-espresso/40">No customers yet.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td className="p-4 font-medium text-espressoDark">{c.name}</td>
                  <td className="p-4 text-espresso/60">{c.email}</td>
                  <td className="p-4 text-espresso/60">{fmtDate(c.createdAt)}</td>
                  <td className="p-4">{c.orderCount}</td>
                  <td className="p-4">{fmtGBP(c.totalSpent)}</td>
                  <td className="p-4">
                    <span className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => toggleActive(c)} className="text-xs uppercase tracking-wide text-champagneDark hover:underline">
                      {c.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
