import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/useProducts';
import { fmtGBP } from '../utils/format';
import { productImageSrc } from '../utils/image';
import EmptyState from '../components/EmptyState';
import api, { apiErrorMessage } from '../api/client';

const FREE_DELIVERY_THRESHOLD = 35;
const DELIVERY_FEE = 3.95;

export default function Cart() {
  const { items, changeQty, removeItem, subtotal } = useCart();
  const { products } = useProducts();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [applying, setApplying] = useState(false);

  async function applyCode() {
    if (!code.trim()) return;
    setApplying(true);
    setDiscountError('');
    try {
      const res = await api.get('/discounts/validate', { params: { code: code.trim(), subtotal } });
      setDiscount({ code: res.data.code, amount: res.data.amount });
      try { sessionStorage.setItem('lumera_discount', JSON.stringify({ code: res.data.code, amount: res.data.amount })); } catch { /* ignore */ }
    } catch (e) {
      setDiscount(null);
      setDiscountError(apiErrorMessage(e, 'That code is invalid or has expired.'));
    } finally {
      setApplying(false);
    }
  }

  const discountAmount = discount?.amount ?? 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const delivery = items.length === 0 ? 0 : afterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = afterDiscount + delivery;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24">
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 8h12l-1 12.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          }
          title="Your cart is empty"
          message="Discover a scent that feels like you and add it to your cart."
          actionLabel="Shop the Collection"
          actionTo="/shop"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <h1 className="font-serif-display text-4xl text-espressoDark mb-10">Your Cart</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-12">
        <div className="space-y-4">
          {items.map((item) => {
            const product = products.find((p) => p.id === item.id);
            return (
              <div key={item.id} className="flex items-center gap-4 border border-espresso/10 rounded-xl p-4">
                <div
                  className="w-20 h-20 shrink-0 rounded-lg overflow-hidden"
                  style={{ background: product ? `linear-gradient(150deg, ${product.color}cc, ${product.color}55)` : '#EAE0CC' }}
                >
                  <img
                    src={product ? productImageSrc(product) : `/images/candles/${item.id}.jpg`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.id}`} className="font-serif-display text-lg text-espressoDark hover:text-champagneDark">
                    {item.name}
                  </Link>
                  <p className="text-sm text-espresso/50">{fmtGBP(item.price)} each</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => changeQty(item.id, -1)} className="w-7 h-7 rounded-full border border-espresso/20 flex items-center justify-center text-sm">&minus;</button>
                    <span className="w-5 text-center text-sm">{item.qty}</span>
                    <button onClick={() => changeQty(item.id, 1)} className="w-7 h-7 rounded-full border border-espresso/20 flex items-center justify-center text-sm">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-espressoDark mb-2">{fmtGBP(item.price * item.qty)}</p>
                  <button onClick={() => removeItem(item.id)} className="text-xs text-espresso/40 hover:text-red-600 uppercase tracking-wide">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          <Link to="/shop" className="inline-block text-sm text-espresso/60 hover:text-espressoDark underline underline-offset-2 mt-2">
            &larr; Continue Shopping
          </Link>
        </div>

        <div className="border border-espresso/10 rounded-2xl p-6 h-fit sticky top-24">
          <h2 className="font-serif-display text-xl text-espressoDark mb-5">Order Summary</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Discount code"
              className="flex-1 border-b border-espresso/20 bg-transparent px-1 py-2 text-sm uppercase focus:outline-none focus:border-champagneDark"
            />
            <button onClick={applyCode} disabled={applying} className="px-4 py-2 rounded-full border border-espresso/20 text-xs uppercase tracking-wide hover:border-champagneDark disabled:opacity-50">
              Apply
            </button>
          </div>
          {discountError && <p className="text-xs text-red-600 mb-3">{discountError}</p>}
          {discount && <p className="text-xs text-green-700 mb-3">Code "{discount.code}" applied!</p>}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-espresso/60">Subtotal</span><span>{fmtGBP(subtotal)}</span></div>
            {discount && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{fmtGBP(discountAmount)}</span></div>}
            <div className="flex justify-between"><span className="text-espresso/60">Shipping</span><span>{delivery === 0 ? 'Free' : fmtGBP(delivery)}</span></div>
            <div className="flex justify-between font-medium text-base pt-2 border-t border-espresso/10"><span>Total</span><span>{fmtGBP(total)}</span></div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full mt-6 px-6 py-4 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
