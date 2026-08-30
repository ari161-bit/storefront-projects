import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api, { apiErrorMessage } from '../api/client';
import { fmtGBP } from '../utils/format';

const FREE_DELIVERY_THRESHOLD = 35;
const DELIVERY_FEE = 3.95;

function luhnCheck(numStr: string): boolean {
  const digits = numStr.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

type PaymentMethod = 'card' | 'paypal' | 'cod';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; note?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lumera_discount');
      if (raw) setDiscount(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  if (items.length === 0 && !confirmedOrder) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-serif-display text-3xl text-espressoDark mb-4">Your cart is empty</h1>
        <Link to="/shop" className="text-champagneDark underline underline-offset-2">Go find a scent you love</Link>
      </div>
    );
  }

  const discountAmount = discount?.amount ?? 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const delivery = afterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = afterDiscount + delivery;

  async function placeOrder() {
    setError('');
    if (!name || !email || !address || !city || !postcode) {
      setError('Please fill in all required delivery details.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (method === 'card') {
      if (!cardName || !luhnCheck(cardNumber) || !/^\d{2}\/\d{2}$/.test(cardExpiry) || !/^\d{3,4}$/.test(cardCvv)) {
        setError('Please enter valid test card details (try 4242 4242 4242 4242).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        customer: { name, email, phone, address, city, postcode },
        items,
        paymentMethod: method,
        discountCode: discount?.code || '',
      };
      if (method === 'card') {
        payload.card = { name: cardName, number: cardNumber, expiry: cardExpiry, cvv: cardCvv };
      }
      const res = await api.post('/candle-orders', payload);
      setConfirmedOrder({ id: res.data.id, note: res.data.payment?.note });
      clearCart();
      try { sessionStorage.removeItem('lumera_discount'); } catch { /* ignore */ }
    } catch (e) {
      setError(apiErrorMessage(e, 'Something went wrong placing your order.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedOrder) {
    return (
      <div className="max-w-xl mx-auto px-5 py-28 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-champagne/30 flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D2B1F" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="font-serif-display italic text-3xl text-espressoDark mb-3">
          Your order is on its way to becoming a beautiful moment.
        </h1>
        <p className="text-espresso/50 text-sm mb-2">Order Number</p>
        <p className="font-serif-display text-3xl text-champagneDark mb-8">{confirmedOrder.id}</p>
        {confirmedOrder.note && <p className="text-sm text-espresso/50 mb-8">{confirmedOrder.note}</p>}
        <div className="flex flex-col gap-3">
          {user && (
            <Link to="/account/orders" className="px-6 py-3.5 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors">
              View My Orders
            </Link>
          )}
          <Link to="/shop" className="px-6 py-3.5 rounded-full border border-espresso/25 text-espressoDark text-sm uppercase tracking-wide hover:border-champagneDark transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <h1 className="font-serif-display text-4xl text-espressoDark mb-10">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-12">
        <div className="space-y-10">
          <section>
            <h2 className="font-serif-display text-xl text-espressoDark mb-5">Delivery Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className="border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email" className="border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" className="border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address *" className="sm:col-span-2 border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postal code *" className="border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
            </div>
          </section>

          <section>
            <h2 className="font-serif-display text-xl text-espressoDark mb-5">Payment</h2>
            <div className="space-y-3">
              {(['card', 'paypal', 'cod'] as PaymentMethod[]).map((m) => (
                <label key={m} className={`flex items-center gap-3.5 border rounded-xl px-4 py-4 cursor-pointer transition-colors ${method === m ? 'border-espressoDark bg-beige/40' : 'border-espresso/15'}`}>
                  <input type="radio" checked={method === m} onChange={() => setMethod(m)} className="accent-espressoDark" />
                  <span className="text-sm text-espressoDark">
                    {m === 'card' ? 'Debit / Credit Card (Test Mode)' : m === 'paypal' ? 'PayPal (Demo Mode)' : 'Cash on Delivery'}
                  </span>
                </label>
              ))}
            </div>
            {method === 'card' && (
              <div className="mt-4 bg-beige/40 rounded-xl p-5 space-y-3">
                <p className="text-[11px] text-espresso/50">Demo payment form — no real transaction occurs. Try 4242 4242 4242 4242.</p>
                <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Name on card" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
                <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Card number" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
                  <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="CVV" className="border-b border-espresso/20 bg-transparent px-1 py-2 text-sm focus:outline-none focus:border-champagneDark" />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="border border-espresso/10 rounded-2xl p-6 h-fit sticky top-24">
          <h2 className="font-serif-display text-xl text-espressoDark mb-5">Order Summary</h2>
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span className="text-espresso/70">{i.name} &times;{i.qty}</span>
                <span>{fmtGBP(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-espresso/10 pt-4">
            <div className="flex justify-between"><span className="text-espresso/60">Subtotal</span><span>{fmtGBP(subtotal)}</span></div>
            {discount && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{fmtGBP(discountAmount)}</span></div>}
            <div className="flex justify-between"><span className="text-espresso/60">Shipping</span><span>{delivery === 0 ? 'Free' : fmtGBP(delivery)}</span></div>
            <div className="flex justify-between font-medium text-base pt-2 border-t border-espresso/10"><span>Total</span><span>{fmtGBP(total)}</span></div>
          </div>
          {error && <p className="text-xs text-red-600 mt-4">{error}</p>}
          <button
            onClick={placeOrder}
            disabled={submitting}
            className="w-full mt-6 px-6 py-4 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors disabled:opacity-50"
          >
            {submitting ? 'Placing Order…' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
