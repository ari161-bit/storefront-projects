import { useEffect, useState } from 'react';
import adminApi from '../../context/AdminAuthContext';
import type { Review } from '../../types';
import { fmtDate } from '../../utils/format';
import StarRating from '../../components/StarRating';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    adminApi.get<Review[]>('/reviews').then((res) => setReviews(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleHidden(r: Review & { hidden?: boolean }) {
    const next = !r.hidden;
    setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden: next } : x)));
    try {
      await adminApi.put(`/reviews/${r.id}/hidden`, { hidden: next });
    } catch {
      load();
    }
  }

  async function remove(r: Review) {
    if (!confirm('Delete this review permanently?')) return;
    await adminApi.delete(`/reviews/${r.id}`);
    load();
  }

  return (
    <div>
      <h1 className="font-serif-display text-3xl text-espressoDark mb-8">Reviews</h1>
      {loading ? (
        <p className="text-espresso/40 text-sm">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-espresso/40 text-sm">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const hidden = (r as Review & { hidden?: boolean }).hidden;
            return (
              <div key={r.id} className={`bg-cream border rounded-xl p-5 ${hidden ? 'border-red-200 opacity-60' : 'border-espresso/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-espressoDark">{r.name}</span>
                    <StarRating rating={r.rating} />
                    {r.verifiedPurchase && <span className="text-[10px] uppercase tracking-wide text-green-700">Verified</span>}
                    {hidden && <span className="text-[10px] uppercase tracking-wide text-red-600">Hidden</span>}
                  </div>
                  <span className="text-xs text-espresso/40">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="text-sm text-espresso/65 mb-2">{r.comment}</p>
                <p className="text-[11px] text-champagneDark mb-3">Product: {r.productId}</p>
                <div className="flex gap-4 text-xs uppercase tracking-wide">
                  <button onClick={() => toggleHidden(r as Review & { hidden?: boolean })} className="text-champagneDark hover:underline">
                    {hidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button onClick={() => remove(r)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
