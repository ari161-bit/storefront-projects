import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import type { Address } from '../../types';
import { useToast } from '../../context/ToastContext';

const emptyForm = { label: 'Home', fullName: '', phone: '', addressLine: '', city: '', postcode: '', isDefault: false };

export default function Addresses() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api.get<Address[]>('/addresses').then((res) => setAddresses(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError('');
  }
  function startEdit(a: Address) {
    setForm({ label: a.label, fullName: a.fullName, phone: a.phone, addressLine: a.addressLine, city: a.city, postcode: a.postcode, isDefault: a.isDefault });
    setEditingId(a.id);
    setShowForm(true);
    setError('');
  }

  async function save() {
    if (!form.fullName || !form.addressLine || !form.city || !form.postcode) {
      setError('Please fill in name, address, city and postcode.');
      return;
    }
    try {
      if (editingId) await api.put(`/addresses/${editingId}`, form);
      else await api.post('/addresses', form);
      setShowForm(false);
      showToast(editingId ? 'Address updated' : 'Address added');
      load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save address.'));
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this address?')) return;
    await api.delete(`/addresses/${id}`);
    showToast('Address deleted');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif-display text-xl text-espressoDark">Saved Addresses</h2>
        <button onClick={startAdd} className="text-xs uppercase tracking-wide text-champagneDark hover:underline">+ Add Address</button>
      </div>

      {showForm && (
        <div className="border border-espresso/10 rounded-xl p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (e.g. Home)" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} placeholder="Address" className="sm:col-span-2 border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} placeholder="Postcode" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
          </div>
          <label className="flex items-center gap-2 text-sm text-espresso/60">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-champagneDark w-4 h-4" />
            Set as default address
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full border border-espresso/20 text-xs uppercase tracking-wide">Cancel</button>
            <button onClick={save} className="px-5 py-2.5 rounded-full bg-espressoDark text-ivory text-xs uppercase tracking-wide">Save Address</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-espresso/40">Loading…</p>
      ) : addresses.length === 0 ? (
        <p className="text-sm text-espresso/50">No saved addresses yet.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="border border-espresso/10 rounded-xl p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-espressoDark flex items-center gap-2">
                  {a.label}
                  {a.isDefault && <span className="text-[10px] uppercase tracking-wide bg-champagne/30 text-champagneDark px-2 py-0.5 rounded-full">Default</span>}
                </p>
                <p className="text-sm text-espresso/60">{a.fullName} &middot; {a.phone}</p>
                <p className="text-sm text-espresso/60">{a.addressLine}, {a.city}, {a.postcode}</p>
              </div>
              <div className="flex gap-3 shrink-0 text-xs uppercase tracking-wide">
                <button onClick={() => startEdit(a)} className="text-champagneDark hover:underline">Edit</button>
                <button onClick={() => remove(a.id)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
