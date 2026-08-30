import { useEffect, useState } from 'react';
import adminApi from '../../context/AdminAuthContext';
import type { Discount } from '../../types';
import { fmtDate } from '../../utils/format';

const emptyForm = { code: '', type: 'percentage' as 'percentage' | 'fixed', value: '', expiresAt: '', usageLimit: '', active: true };

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    adminApi.get<Discount[]>('/discounts').then((res) => setDiscounts(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function startAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError('');
  }
  function startEdit(d: Discount) {
    setForm({
      code: d.code, type: d.type, value: String(d.value),
      expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : '',
      usageLimit: d.usageLimit !== null ? String(d.usageLimit) : '',
      active: d.active,
    });
    setEditingId(d.id);
    setShowForm(true);
    setError('');
  }

  async function save() {
    setError('');
    if (!form.code || !form.value) {
      setError('Please enter a code and value.');
      return;
    }
    const payload = {
      code: form.code, type: form.type, value: parseFloat(form.value),
      expiresAt: form.expiresAt || null, usageLimit: form.usageLimit || null, active: form.active,
    };
    try {
      if (editingId) await adminApi.put(`/discounts/${editingId}`, payload);
      else await adminApi.post('/discounts', payload);
      setShowForm(false);
      load();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not save discount.');
    }
  }

  async function remove(d: Discount) {
    if (!confirm(`Delete code "${d.code}"?`)) return;
    await adminApi.delete(`/discounts/${d.id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif-display text-3xl text-espressoDark">Discount Codes</h1>
        <button onClick={startAdd} className="px-5 py-2.5 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors">
          + New Code
        </button>
      </div>

      {showForm && (
        <div className="bg-cream border border-espresso/10 rounded-2xl p-6 mb-8 max-w-lg">
          <h2 className="font-serif-display text-xl text-espressoDark mb-5">{editingId ? 'Edit Code' : 'New Discount Code'}</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CODE" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm uppercase focus:outline-none focus:border-champagneDark" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })} className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark">
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed Amount £</option>
            </select>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} type="number" step="0.01" placeholder="Value" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} type="number" placeholder="Usage limit (optional)" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <div>
              <label className="text-[11px] uppercase tracking-wide text-espresso/50">Expires</label>
              <input value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} type="date" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-espresso/60 mb-4">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-champagneDark w-4 h-4" />
            Active
          </label>
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full border border-espresso/20 text-xs uppercase tracking-wide">Cancel</button>
            <button onClick={save} className="px-5 py-2.5 rounded-full bg-espressoDark text-ivory text-xs uppercase tracking-wide">Save</button>
          </div>
        </div>
      )}

      <div className="bg-cream border border-espresso/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-espresso/45 border-b border-espresso/10">
              <th className="p-4">Code</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Used</th>
              <th className="p-4">Expires</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-espresso/8">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-espresso/40">Loading…</td></tr>
            ) : discounts.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-espresso/40">No discount codes yet.</td></tr>
            ) : (
              discounts.map((d) => (
                <tr key={d.id}>
                  <td className="p-4 font-medium text-espressoDark">{d.code}</td>
                  <td className="p-4">{d.type === 'percentage' ? `${d.value}%` : `£${d.value.toFixed(2)}`}</td>
                  <td className="p-4">{d.usedCount}{d.usageLimit !== null ? ` / ${d.usageLimit}` : ''}</td>
                  <td className="p-4 text-espresso/60">{d.expiresAt ? fmtDate(d.expiresAt) : 'Never'}</td>
                  <td className="p-4">
                    <span className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full ${d.active ? 'bg-green-100 text-green-700' : 'bg-beige text-espresso/50'}`}>
                      {d.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(d)} className="text-xs uppercase tracking-wide text-champagneDark hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(d)} className="text-xs uppercase tracking-wide text-red-600 hover:underline">Delete</button>
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
