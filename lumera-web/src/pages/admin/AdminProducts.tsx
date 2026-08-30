import { useEffect, useState } from 'react';
import adminApi from '../../context/AdminAuthContext';
import api from '../../api/client';
import type { Product } from '../../types';
import { fmtGBP } from '../../utils/format';
import { productImageSrc } from '../../utils/image';

const CATEGORIES = [
  { id: 'candle', label: 'Candle' },
  { id: 'diffuser', label: 'Reed Diffuser' },
  { id: 'tealight', label: 'Tea Lights' },
];
const MOODS = ['floral', 'fruity', 'fresh', 'spicy', 'cozy', 'calming'];

const emptyForm = {
  name: '', category: 'candle', price: '', salePrice: '', stock: '', burn: '', blurb: '', description: '',
  sku: '', featured: false, waxType: 'Soy & Coconut Wax Blend', size: '220g', color: '#B8692A',
  noteTop: '', noteMid: '', noteBase: '', moods: [] as string[], imageUrl: '',
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Product[]>('/candle-products')
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function startAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError('');
  }
  function startEdit(p: Product) {
    setForm({
      name: p.name, category: p.category, price: String(p.price), salePrice: p.salePrice ? String(p.salePrice) : '',
      stock: String(p.stock), burn: p.burn, blurb: p.blurb, description: p.description, sku: p.sku || '',
      featured: p.featured, waxType: p.waxType, size: p.size, color: p.color,
      noteTop: p.notes.top, noteMid: p.notes.mid, noteBase: p.notes.base, moods: p.moods, imageUrl: p.imageUrl || '',
    });
    setEditingId(p.id);
    setShowForm(true);
    setError('');
  }

  function toggleMood(m: string) {
    setForm((f) => ({ ...f, moods: f.moods.includes(m) ? f.moods.filter((x) => x !== m) : [...f.moods, m] }));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await adminApi.post('/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, imageUrl: res.data.url }));
    } catch {
      setError('Could not upload image.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError('');
    if (!form.name || !form.price || !form.stock || !form.burn || !form.blurb || !form.noteTop || !form.noteMid || !form.noteBase || form.moods.length === 0) {
      setError('Please fill in all required fields and select at least one mood.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name, category: form.category, price: parseFloat(form.price),
      salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
      stock: parseInt(form.stock, 10), burn: form.burn, blurb: form.blurb, description: form.description,
      sku: form.sku, featured: form.featured, waxType: form.waxType, size: form.size, color: form.color,
      notes: { top: form.noteTop, mid: form.noteMid, base: form.noteBase }, moods: form.moods, imageUrl: form.imageUrl,
    };
    try {
      if (editingId) await adminApi.put(`/candle-products/${editingId}`, payload);
      else await adminApi.post('/candle-products', payload);
      setShowForm(false);
      load();
    } catch {
      setError('Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    await adminApi.delete(`/candle-products/${p.id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif-display text-3xl text-espressoDark">Products</h1>
        <button onClick={startAdd} className="px-5 py-2.5 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors">
          + Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-cream border border-espresso/10 rounded-2xl p-6 mb-8">
          <h2 className="font-serif-display text-xl text-espressoDark mb-5">{editingId ? 'Edit Product' : 'Add a Product'}</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2 flex items-center gap-4">
              {form.imageUrl && <img src={form.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg" />}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-espresso/50 mb-1.5">Product Image</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} className="text-xs" />
                {uploading && <p className="text-xs text-espresso/50 mt-1">Uploading…</p>}
              </div>
            </div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name *" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.01" placeholder="Price (£) *" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} type="number" step="0.01" placeholder="Sale price (optional)" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" placeholder="Stock *" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.burn} onChange={(e) => setForm({ ...form, burn: e.target.value })} placeholder="Burn time *" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="Size (e.g. 220g)" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.waxType} onChange={(e) => setForm({ ...form, waxType: e.target.value })} placeholder="Wax type" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} type="color" className="h-9 border border-espresso/20 rounded" />
            <input value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} placeholder="Short description *" className="sm:col-span-2 border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Full description" rows={2} className="sm:col-span-2 border border-espresso/15 bg-ivory px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:border-champagneDark" />
            <input value={form.noteTop} onChange={(e) => setForm({ ...form, noteTop: e.target.value })} placeholder="Top note *" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.noteMid} onChange={(e) => setForm({ ...form, noteMid: e.target.value })} placeholder="Mid note *" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
            <input value={form.noteBase} onChange={(e) => setForm({ ...form, noteBase: e.target.value })} placeholder="Base note *" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
          </div>

          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wide text-espresso/50 mb-2">Moods *</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m} type="button" onClick={() => toggleMood(m)} className={`px-3.5 py-1.5 rounded-full border text-xs uppercase tracking-wide ${form.moods.includes(m) ? 'bg-espressoDark text-ivory border-espressoDark' : 'border-espresso/20 text-espresso/70'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-espresso/60 mb-4">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-champagneDark w-4 h-4" />
            Featured on homepage
          </label>

          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full border border-espresso/20 text-xs uppercase tracking-wide">Cancel</button>
            <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-full bg-espressoDark text-ivory text-xs uppercase tracking-wide disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-cream border border-espresso/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-espresso/45 border-b border-espresso/10">
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Featured</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-espresso/8">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-espresso/40">Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-espresso/40">No products yet.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="p-4 flex items-center gap-3">
                    <img src={productImageSrc(p)} alt="" className="w-10 h-10 rounded-lg object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
                    <span className="font-medium text-espressoDark">{p.name}</span>
                  </td>
                  <td className="p-4 text-espresso/60">{p.categoryLabel}</td>
                  <td className="p-4">{fmtGBP(p.salePrice ?? p.price)}</td>
                  <td className={`p-4 ${p.stock <= 10 ? 'text-red-600 font-medium' : 'text-espresso/60'}`}>{p.stock}</td>
                  <td className="p-4">{p.featured ? '★' : ''}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(p)} className="text-xs uppercase tracking-wide text-champagneDark hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(p)} className="text-xs uppercase tracking-wide text-red-600 hover:underline">Delete</button>
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
